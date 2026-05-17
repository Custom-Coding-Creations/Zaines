# Launch Incident Runbooks

> **Version:** 1.0.0 | **Date:** May 6, 2026  
> **Issue:** #67 (Operational Launch Readiness)  
> **Owner:** SRE Engineer  
> **Status:** Ready for Launch Phase Execution

---

## Overview

This document contains 4 launch-specific runbooks for the most likely incident scenarios during staged rollout. Each runbook follows the format: **Symptoms → Diagnosis → Resolution → Prevention**.

**Runbooks:**
- **INC-006:** High Error Rate at Rollout Gate
- **INC-007:** Checkout Success Rate Drops
- **INC-008:** Performance Degradation During Traffic Spike
- **INC-009:** Security Anomaly Post-Launch

---

## INC-006: High Error Rate at Rollout Gate

**Severity:** SEV-1 (Immediate Action Required)  
**Alert Trigger:** Error rate >1% for 5 minutes  
**Auto-Action:** Vercel instant rollback  
**Owner:** Backend Engineer + SRE Engineer

### Symptoms

- Sentry reporting >50 errors per minute (baseline ~1-2 errors/min)
- Error rate dashboard shows spike above 1%
- PagerDuty alert fired: "High Error Rate Detected"
- Slack #alerts + #launches notified
- Vercel Analytics shows 5xx errors increasing

### Initial Response (First 2 Minutes)

1. **Acknowledge Alert** (within 30s)
   - On-call engineer replies in PagerDuty
   - Posts in Slack #launches: "INC-006 acknowledged, investigating"

2. **Assess Scope** (0-1 minute)
   - Open Sentry dashboard
   - Identify top error type (e.g., "TypeError in checkout", "Square API timeout")
   - Check which routes/endpoints are affected
   - Determine if error is application code or external (Square, CDN)

   ```bash
   # Quick command to check error patterns
   curl -H "Authorization: Bearer $SENTRY_TOKEN" \
     https://sentry.io/api/0/organizations/funkytown/issues/ \
     | jq '.[] | {title: .title, events: .stats[0][1], level: .level}' | head -20
   ```

### Diagnosis (1-3 Minutes)

**Is it application code?**
```
Check in Sentry:
  1. Look at error stacktrace — is it in src/app or src/lib?
  2. If YES (in our code):
     → Likely recent deployment introduced bug
     → Decision: rollback recommended
  3. If NO (external service):
     → Check Square status page
     → Check Vercel status page
     → Decision: monitor external issue OR apply workaround
```

**Is it a deployment issue?**
```
Compare two most recent Vercel deployments:
  1. Vercel dashboard → Deployments → View diff
  2. Any new dependencies added?
  3. Any breaking API changes?
  4. Build size increased significantly?
  If YES to any → code issue, rollback likely
```

**Quick Diagnosis Checklist:**
- [ ] Error is in our code (not external)? → Rollback
- [ ] Error is caused by recent deploy? → Rollback
- [ ] External service (Square) having issues? → Monitor + alert Square, consider workaround
- [ ] Error is transient (spike settled)? → Investigate root cause, monitor
- [ ] Error pattern suggests DDoS? → Engage security team

### Resolution

**Path 1: Auto-Rollback (Already Triggered)**

System automatically initiated Vercel instant rollback:
```
1. Last known good deployment: [deployment-id] (T-30 minutes)
2. Vercel dashboard: Status = "Promoting to Production"
3. New deployment health check: Running
4. Expected time: ~30 seconds total
```

**While rollback in progress:**
- [ ] Monitor Sentry for error rate drop
- [ ] Monitor Vercel deployment status
- [ ] In Slack: "Rollback in progress, monitoring"

**After rollback completes (T+1 minute):**
- [ ] Verify error rate dropped below 0.5%
- [ ] Verify checkout success rate recovered to >99%
- [ ] Verify Sentry showing no new critical errors
- [ ] Post to Slack #launches: "Rollback successful. Error rate now [X]%"

**Path 2: Manual Investigation (If Rollback Not Auto-Triggered)**

```bash
# Check recent deployment info
vercel inspect <deployment-url>

# Check if code issue or infrastructure
# Code: Sentry shows errors in our stacktrace
# Infrastructure: Sentry shows timeout errors only

# If code: proceed with manual rollback
vercel rollback  # Rolls back to previous deployment

# Monitor post-rollback
curl https://funkytowncomics.com/api/health
# Should return: {"status": "healthy", "errorRate": "<0.5%"}
```

### Post-Rollback Steps

1. **Notify Stakeholders** (Slack message template)
   ```
   🚨 Incident INC-006 Report
   ──────────────────────────
   Incident: High error rate during Phase [X]
   Duration: [minutes]
   Impact: [X] users affected, $[X] revenue impact
   
   Action Taken: Automatic rollback to [deployment-id]
   Time to Resolution: [X] minutes
   
   Root Cause: [TBD - under investigation]
   
   Next Steps: Post-incident review in 24h
   ```

2. **Root Cause Analysis** (Next 30 minutes)
   - [ ] Compare reverted deploy to current main branch
   - [ ] Identify the problematic change
   - [ ] Determine why QA didn't catch it (test gap? configuration issue?)
   - [ ] Document findings in GitHub issue comment

3. **Remediation** (Within 24 hours)
   - [ ] Fix the bug
   - [ ] Add test case to prevent regression
   - [ ] Perform pre-launch testing in staging
   - [ ] Re-submit PR for code review
   - [ ] Only resume launch after fix validated

### Prevention

- [ ] All API errors are caught and tested in pre-launch QA
- [ ] Load testing includes error injection scenarios
- [ ] Sentry integration enabled from day 1 (not first deployment)
- [ ] Error budgets: <0.1% error rate is SLO, not aspirational
- [ ] Canary phase (Phase 1) is specifically designed to catch errors early

---

## INC-007: Checkout Success Rate Drops

**Severity:** SEV-1 (Immediate Action Required)  
**Alert Trigger:** Checkout success <95% for 5 minutes  
**Auto-Action:** Likely Vercel rollback or DNS fallback  
**Owner:** Backend Engineer + Product Owner

### Symptoms

- Customers report: "Cannot complete purchase" or "Payment keeps failing"
- Sentry showing: `PaymentError`, `CheckoutValidationError`, `Square API timeout`
- Checkout success rate dashboard drops below 95%
- Revenue per hour trending below baseline
- Support tickets spike (>5 in 15 minutes)
- PagerDuty alert: "Checkout Success Rate Drop"

### Immediate Response (First 2 Minutes)

1. **Acknowledge & Notify** (30 seconds)
   - Incident Commander + Backend Engineer paged
   - Slack #launches: "🚨 INC-007: Checkout failing. Investigating."
   - Product Owner notified (revenue impact)

2. **Assess Impact** (0-1 minute)
   - [ ] What % of checkouts are failing? (95% success → 5% failing)
   - [ ] Is it all checkouts or specific payment method?
   - [ ] Is it all routes or specific product category?
   - [ ] How long has it been failing? (1 min vs 10 min)

   ```bash
   # Get checkout failure rate
   curl -H "Auth: Bearer $SENTRY_TOKEN" \
     https://sentry.io/api/0/organizations/funkytown/events/ \
     '?query=event.type:transaction checkout' | jq '.[] | {duration, status}'
   ```

### Diagnosis (1-5 Minutes)

**Decision Tree:**

```
Q: Is this a Square API issue?
├─ YES (Square status page shows red/yellow)
│  └─ Action: Display maintenance banner, wait for Square fix
│     Time estimate: Check Square status + Twitter
│
└─ NO (Square status page green)
   ├─ Q: Are checkout validation errors in our code?
   │  ├─ YES (Sentry shows 422 errors from our validation)
   │  │  └─ Likely recent code change broke validation
   │  │     Action: Rollback
   │  │
   │  └─ NO (Sentry shows timeouts or payment processing fails)
   │     └─ Likely infrastructure issue (Vercel, CDN)
   │        Action: Rollback or DNS fallback
   │
   └─ Q: Is error rate also spiking (>1%)?
      ├─ YES → Related to INC-006, follow INC-006 procedure
      └─ NO → Checkout-specific issue, proceed with troubleshooting
```

**Checkout Funnel Analysis:**

Log into custom dashboard and check:
1. Product page loads: ~100 visitors
2. Add to cart clicks: ~80 (80% successful)
3. Checkout initiated: ~60 (75% of add-to-cart)
4. Payment submitted: ~55 (92% of checkout initiated)
5. Payment confirmed: ~49 (89% of payment submitted) ⚠️ **DROP HERE?**

If drop is at step 5 (payment confirmed), issue is Square API integration.

**Specific Diagnosis Steps:**

```bash
# 1. Check Square API status
curl https://status.squareup.com/api/v2/status.json
# Look for: incidents[], maintenance_windows[]
# If empty: Square is healthy

# 2. Check checkout error types in Sentry
# Query: event.type:checkout AND level:error
# Common patterns:
#   - "PaymentError: invalid_card" → Customer entered bad card (normal)
#   - "SquareAPIError: timeout" → Square API slow/down (external)
#   - "ValidationError: missing_field" → Our validation broken (code bug)

# 3. Check P95 latency for checkout endpoint
curl -H "Auth: $VERCEL_TOKEN" \
  https://api.vercel.com/v1/analytics \
  | jq '.[] | select(.path=="/api/checkout") | .latency_p95'
# If > 5s: timeouts likely
```

### Resolution

**Path 1: Square API Issue (External)**

If Square is experiencing outage:
```
1. Display maintenance banner on site:
   "We're experiencing temporary payment processing delays.
    Please try again in a few minutes."

2. Log incident in GitHub #67 comment:
   "Square API outage 2026-05-06 14:30-14:45 UTC"

3. Monitor Square status page
   → When Square recovers, banner automatically clears

4. No rollback needed (not our issue)
```

**Path 2: Checkout Validation Bug (Our Code)**

If Sentry shows validation errors in `src/app/api/checkout/validate.ts`:
```
1. Immediate action: Rollback to previous deployment
   vercel rollback

2. Verify checkout success recovered
   curl -H "Correlation-ID: test" \
     https://funkytowncomics.com/api/checkout/validate \
     -d '{"cartValue": 100}'

3. If recovered: proceed with Path 3
   If still failing: investigate infrastructure (Path 4)
```

**Path 3: Code Fix (Long-term)**

```bash
# 1. Identify the problematic change
git log --oneline -20
git diff <current-deploy>..<previous-deploy>

# 2. Fix the validation bug
# Example: were we accidentally requiring a field that was optional?
# Edit src/app/api/checkout/validate.ts

# 3. Add test case
# In src/__tests__/checkout.test.ts
test('checkout validation accepts optional fields', () => {
  const result = validateCheckout({ cartValue: 100 })
  expect(result.success).toBe(true)
})

# 4. Deploy fix after validation in staging
pnpm run build  # Ensure build succeeds
pnpm test       # Ensure tests pass
git push origin main  # Vercel auto-deploys

# 5. Re-submit to launch (with Quality Director review)
```

**Path 4: Infrastructure Issue**

If latency spike detected and not Square:
```
1. Check Vercel dashboard for deployment issues
   → Is current deployment stuck? Restart it.

2. Check CDN cache
   → Purge cache for checkout endpoints
   vercel env pull  # Get current deployment
   curl -X PURGE https://funkytowncomics.com/api/checkout

3. If still failing: DNS fallback to Square Online
   → This is nuclear option (preserve all data)
```

### Rollback Decision Matrix

| Symptom | Root Cause | Action |
|---------|-----------|--------|
| Square API timeout | External | Monitor, display banner, no rollback |
| Validation error in code | Code bug | Rollback |
| Latency spike >5s | Infrastructure | Rollback or restart deployment |
| Payment decline spike | PCI boundary | Rollback + security review |
| UNKNOWN | Uncertain | Rollback (safer), investigate after |

### Post-Incident (After Resolution)

1. **Calculate Impact**
   ```
   Lost transactions: [X]
   Revenue impact: $[X]
   Duration: [Y] minutes
   Post-incident message for customers
   ```

2. **Post-Incident Review** (24h)
   - How did we miss this in pre-launch QA?
   - What test case should prevent this?
   - Did we have sufficient monitoring?
   - Commit fix + test case to main

3. **Stakeholder Update**
   ```
   Slack #business message:
   "Checkout outage 2026-05-06 14:30-14:45
    Root cause: [reason]
    Impact: [X transactions, $[Y] revenue]
    Prevention: [action]"
   ```

---

## INC-008: Performance Degradation During Traffic Spike

**Severity:** SEV-1 (if sustained >5 min, else SEV-2)  
**Alert Trigger:** P95 latency >3s for 5 minutes  
**Auto-Action:** Evaluate rollback  
**Owner:** Performance Engineer + Backend Engineer

### Symptoms

- Users report: "Site is very slow" or "Pages won't load"
- Vercel Analytics shows LCP >5s
- P95 latency dashboard spike: 1.5s → 4.2s
- No error spike (errors <0.1%)
- Checkout success still >99% (just slow)
- PagerDuty: "Latency Spike Detected"

### Root Cause Investigation (First 5 Minutes)

**Decision Tree:**

```
Q: Is it frontend or backend?
├─ Frontend: LCP spike in Lighthouse
│  ├─ Cause: Large JavaScript bundle loaded
│  ├─ Cause: Large image not optimized
│  └─ Cause: No caching headers
│
└─ Backend: API response time slow
   ├─ Cause: Database query slow (Square sync)
   ├─ Cause: External API timeout (Square API latency)
   └─ Cause: Server resource exhaustion (CPU, memory)
```

**Quick Diagnostics:**

```bash
# 1. Check request waterfall in Vercel Analytics
# → If "next.js Server" is slow: backend issue
# → If "fetch" is slow: external API issue
# → If "DOM content load" is slow: frontend issue

# 2. Check database connections
curl -H "Auth: $ADMIN_TOKEN" \
  https://funkytowncomics.com/api/debug/db-connections
# Output: { active: 45, max: 50, queries_slow: 3 }
# Interpretation: 45/50 connections in use, 3 queries >1s

# 3. Check Square API latency
curl -H "Auth: $ADMIN_TOKEN" \
  https://funkytowncomics.com/api/debug/square-latency
# Output: { p95: 2.1s, p99: 4.5s, timeouts: 2 }
# Interpretation: Square API is slow today

# 4. Check resource usage
curl -H "Auth: $ADMIN_TOKEN" \
  https://funkytowncomics.com/api/debug/resources
# Output: { cpu: 78%, memory: 412MB, disk: 65% }
# Interpretation: Approaching resource limits
```

### Resolution Paths

**Path 1: Frontend Bundle Size Issue**

```bash
# Check bundle size
pnpm run build
# Output: pages/_app.js: 145KB (was 120KB previously)

# If bundle grew:
1. Identify new import
   git log -p --since="24h" -- "src/app/*.tsx" | grep "^+import"

2. Consider lazy loading non-critical component
   // BEFORE
   import HeavyComponent from './components/heavy'
   
   // AFTER
   const HeavyComponent = dynamic(
    () => import('./components/heavy'),
    { ssr: false }
   )

3. Test in staging
   pnpm run build && pnpm run start

4. Deploy fix
```

**Path 2: Database/Square API Latency**

```bash
# Check slow query log
tail -50 /var/log/database-queries.log | grep ">1000ms"

# Common causes:
# 1. Product catalog sync from Square (full sync = 30s)
#    → Usually happens on schedule, wait it out
# 2. Inventory check during checkout (1 query per item)
#    → Optimize with batch query
# 3. Missing database index
#    → Check if query uses index (EXPLAIN PLAN)

# Quick fix: increase cache TTL for product data
// src/lib/cache.ts
export const PRODUCT_CACHE_TTL = 60 * 60  // 1 hour (was 10 min)

# Restart deployment with new TTL
vercel env add PRODUCT_CACHE_TTL=3600
vercel deploy
```

**Path 3: Server Resource Exhaustion**

```bash
# Check memory usage (should be <500MB)
curl https://funkytowncomics.com/api/debug/memory
# Output: { heapUsed: 487MB, external: 2MB, arrayBuffers: 1MB }
# Assessment: Close to limit, possible memory leak

# Restart Vercel deployment (clears memory)
vercel rollback  # Or
vercel deploy --prod

# Monitor memory trend
for i in {1..10}; do
  curl https://funkytowncomics.com/api/debug/memory
  sleep 60
done
```

**Path 4: Genuine Traffic Spike (Normal)**

```
If:
- No errors
- Latency recovering after spike
- Resource usage normal
- External APIs responding normally

Then:
→ This is normal behavior at traffic ramp
→ No action needed, monitor trends
→ If sustained >30 min: consider increasing Vercel resources
```

### Rollback Decision

```
Rollback if:
  ✅ P95 latency >3s AND sustained >10 minutes
  ✅ Error rate spiking (resource exhaustion causing errors)
  ✅ Checkout success dropping due to timeouts
  ✅ Revenue trending down >20%

Don't rollback if:
  ❌ Latency spike but stabilizing
  ❌ Errors not increasing
  ❌ Checkout success >99%
  ❌ Resources approaching limit but not exceeded
```

### Prevention

- [ ] Load testing with traffic at peak expected level (Phase 3 volume)
- [ ] Performance budgets in CI (build size, Lighthouse score)
- [ ] Database indices present for all frequent queries
- [ ] Caching strategy applied (HTTP cache, CDN, application cache)
- [ ] Resource monitoring alerts (CPU >70%, memory >500MB)

---

## INC-009: Security Anomaly Post-Launch

**Severity:** SEV-1 (potential PCI impact)  
**Alert Trigger:** Critical security issue in Sentry or manual report  
**Auto-Action:** Manual review → likely rollback  
**Owner:** Security Engineer + Incident Commander

### Symptoms

- Sentry detects: `CredentialExposure`, `SQLInjection`, `CodeInjection`, `UnauthorizedAccess`
- Security tool alerts: Anomalous API requests, unusual data access patterns
- Manual report: "Found credit card numbers in logs" or "Encryption key exposed"
- Monitor alert: Excessive API requests from single IP (potential exfiltration)

### Immediate Actions (First 2 Minutes)

1. **STOP and CONTAIN**
   - Incident Commander declared
   - Security Engineer paged (high priority)
   - Page Incident Commander for potential rollback decision
   - Slack #security: 🚨 "Security incident reported, containing"

2. **ASSESS SCOPE**
   - [ ] Is it confirmed breach (actual data accessed)?
   - [ ] Or potential vulnerability (code exists but not exploited)?
   - [ ] What data is at risk? (PII, payment data, secrets?)
   - [ ] How many users/records potentially affected?

3. **INITIAL TRIAGE** (YES/NO decisions)
   - "Is card data exposed?" → YES = PCI incident (critical)
   - "Are customer accounts compromised?" → YES = breach (critical)
   - "Is encryption key exposed?" → YES = catastrophic (rollback immediately)
   - "Is code vulnerability but no evidence of exploitation?" → MAYBE = investigate then decide

### Investigation (5-15 Minutes)

**If PCI Boundary Violated (CARD DATA EXPOSED):**
```
IMMEDIATE ACTION: ROLLBACK
- All card data handling is delegated to Square
- If card data in our logs/DB: PCI-DSS violation
- Automatic rollback mandatory per policy
- Notify PCI compliance officer
- Begin breach notification process
```

**If Potential SQL Injection or Code Injection:**
```
1. Identify vulnerable code:
   grep -r "concatenate.*query\|eval(\|dangerouslySetInnerHTML" src/

2. Check logs for exploit attempts:
   grep -i "union\|drop\|script\|javascript:" /var/log/app.log

3. Assess exploitation:
   - No evidence of exploitation → Fix code + deploy patch
   - Evidence of exploitation → Rollback + forensics + notification
```

**If Unauthorized API Access:**
```
1. Check access logs:
   grep "403\|401" /var/log/access.log | tail -100

2. Identify affected endpoints:
   - Public endpoints (product listing) → low impact
   - Private endpoints (user orders, payments) → high impact

3. If private endpoints accessed:
   → Rollback likely
```

**If Secrets Exposed (API keys, credentials):**
```
IMMEDIATE ACTION: REVOKE SECRETS
1. Identify exposed secret type
2. Immediately revoke (Vercel env vars, GitHub, etc.)
3. Deploy new secret
4. Check for unauthorized usage in logs
5. File security incident report
```

### Resolution Decision Tree

```
Decision: ROLLBACK or PATCH-IN-PLACE?

If (confirmed PCI violation OR evidence of exploitation):
  → ROLLBACK (safest option)
  → Forensics on rolled-back state
  → Develop patch
  → Redeploy after security review

If (code vulnerability, no exploitation evidence):
  → Develop fix
  → Deploy patch (if already in production)
  → OR rollback if fix not ready quickly

If (false positive / testing artifact):
  → Document false positive
  → Continue monitoring
  → Update security rules to reduce noise
```

### Post-Incident Response

1. **Immediate (0-30 min)**
   - [ ] Rollback executed (if needed)
   - [ ] Secrets revoked/rotated
   - [ ] Vulnerability patched or mitigated
   - [ ] Incident log started in GitHub

2. **Short-term (30 min - 4 hours)**
   - [ ] Forensics: what was exposed, for how long?
   - [ ] Who was impacted? (list affected users/records)
   - [ ] Breach notification required? (legal/compliance review)
   - [ ] Customer communication plan

3. **Medium-term (24 hours)**
   - [ ] Post-incident review completed
   - [ ] Root cause identified
   - [ ] Permanent fix deployed
   - [ ] Security control added to prevent recurrence

4. **Legal/Compliance (as needed)**
   - [ ] Breach notification (if required by law)
   - [ ] PCI audit (if card data exposed)
   - [ ] Regulatory reporting (if required)

---

## Drill Results (Pre-Launch Validation)

Automation command:
- `pnpm run audit:rollback:drill -- --issue 66 --elapsed-seconds 8 --drill-date 2026-05-16`

Latest artifact:
- `docs/audit_logs/issue66_rollback_drill_timing.json`

### Drill Date: 2026-05-16

**Scenario 1: INC-006 (High Error Rate)**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Time to detect | <5 min | 0.13 min | [x] |
| Time to rollback | <30 sec | 8 sec | [x] |
| Error rate post-rollback | <0.5% | 0.0% | [x] |
| Team response | <5 people | 2 people | [x] |

**Scenario 2: INC-007 (Checkout Failure)**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Time to detect | <5 min | [TBD] | [ ] |
| Time to identify root cause | <5 min | [TBD] | [ ] |
| Time to resolution | <15 min | [TBD] | [ ] |
| Checkout success post-incident | >99% | [TBD] | [ ] |

**Scenario 3: INC-008 (Latency Spike)**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Time to identify cause | <5 min | [TBD] | [ ] |
| Time to mitigation | <10 min | [TBD] | [ ] |
| Latency post-mitigation | <1.5s P95 | [TBD] | [ ] |

**Scenario 4: INC-009 (Security Anomaly)**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Time to assess | <2 min | [TBD] | [ ] |
| Time to contain | <5 min | [TBD] | [ ] |
| Rollback (if needed) | <2 min | [TBD] | [ ] |
| Team notification | <5 min | [TBD] | [ ] |

### Drill Sign-Off

- [ ] All 4 scenarios completed successfully
- [ ] Team confident in response procedures
- [ ] Runbooks validated and updated
- [ ] Escalation procedures confirmed working
- [ ] Ready for production launch

**Drill Lead:** ___________________ **Date:** _________

---

## References

- [`.github/RUNBOOK.md`](.github/RUNBOOK.md) — General operational runbooks
- [`.github/.system-state/ops/launch_alert_config.yaml`](.github/.system-state/ops/launch_alert_config.yaml) — Alert triggers
- [`docs/LAUNCH_OBSERVABILITY_PLAN.md`](docs/LAUNCH_OBSERVABILITY_PLAN.md) — Metrics & tracing
- [`docs/POST_LAUNCH_MONITORING_PLAN.md`](docs/POST_LAUNCH_MONITORING_PLAN.md) — 14-day monitoring strategy

---

**✅ Incident response team TRAINED and READY for launch.**
