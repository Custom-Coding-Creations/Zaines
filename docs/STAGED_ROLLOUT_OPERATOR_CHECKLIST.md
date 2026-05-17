# Staged Rollout Operator Checklist

> **Date:** May 16, 2026  
> **Authority:** Incident Commander  
> **Usage:** Print and complete for each phase of staged rollout  
> **Duration:** 5 phases × [24h, 48h, 72h, ∞] = ~5 days minimum monitoring

---

## Pre-Launch Checklist (T-24 hours)

**Operator:** ____________  **Time:** ____________  **Date:** ____________

### System Health Verification

- [ ] All monitoring dashboards accessible (Vercel Analytics, Sentry, custom)
- [ ] Alert channels operational (Slack #incidents, on-call PagerDuty/Opsgenie)
- [ ] Sentry project receiving test events
- [ ] Correlation ID logging verified (tail production logs)
- [ ] Database connection pool healthy
- [ ] Square API connectivity verified (test payment endpoint)
- [ ] DNS zones configured (vercel production + Square Online fallback)

### Team Readiness

- [ ] On-call schedule confirmed (primary + backup)
- [ ] Runbooks printed and at desk (all operators have copies)
- [ ] War room Slack channels created (#launches, #incidents)
- [ ] Incident Commander phone/slack verified active
- [ ] Backend Engineer on-call contact verified
- [ ] SRE on-call contact verified
- [ ] Product Owner notification list confirmed

### Rollback Verification

- [ ] Rollback Option 1 (Vercel instant): tested, target ≤30s, ✅ or ❌
- [ ] Rollback Option 2 (Git revert): tested, target ≤3min, ✅ or ❌
- [ ] Rollback Option 3 (DNS fallback): tested, target ≤5min, ✅ or ❌
- [ ] Rollback abort triggers documented and understood
- [ ] Post-rollback health check list ready (see below)

### Observability Tuning

- [ ] Alert thresholds set for initial phase (10% volume)
- [ ] Error rate threshold: `>1% for 5 minutes` → alert enabled
- [ ] Checkout success threshold: `<95% for 5 minutes` → alert enabled
- [ ] Latency threshold: `P95 >3s for 5 minutes` → alert enabled
- [ ] Revenue tracking enabled (if business metrics available)
- [ ] Customer-facing errors tracked in Sentry with tags

### Communication Plan

- [ ] Launch announcement Slack template ready
- [ ] Phase transition message template ready
- [ ] Incident communication template ready
- [ ] Stakeholder update frequency confirmed (e.g., 4h intervals)
- [ ] Executive dashboard link shared with leadership

**Pre-Launch Sign-Off:**
- [ ] Operator confirms all items complete
- [ ] Incident Commander reviews and approves
- [ ] Launch may proceed to Phase 1

---

## Phase 1: 10% Traffic (24 hours)

**Phase Start Time:** ____________  **Operator:** ____________  
**Target End Time:** ____________ (24 hours later)

### Phase Launch (T-0)

- [ ] Announce in #launches: "Phase 1 (10% traffic) LIVE at [TIME]"
- [ ] Set Vercel traffic split to 10% (verify in Vercel dashboard)
- [ ] Start continuous monitoring dashboard (open on screen)
- [ ] Set timer: 24-hour phase duration
- [ ] Log start: `Phase 1 start: [timestamp], 10% traffic active`

### Continuous Monitoring (every 2 hours)

**Hour 0-2:**
- [ ] Error rate: ______% (target <1%)
- [ ] Checkout success: ____% (target >99%)
- [ ] P95 latency: ____ms (target <1200ms)
- [ ] Sentry errors (last 2h): ____ (target <10)
- [ ] No critical logs from API routes
- [ ] Square API latency: ____ms (target <200ms)

**Hour 2-4:**
- [ ] Error rate: ______% (target <1%)
- [ ] Checkout success: ____% (target >99%)
- [ ] P95 latency: ____ms (target <1200ms)
- [ ] Sentry errors (last 2h): ____ (target <10)
- [ ] Customer complaints: ____ (target 0 new)
- [ ] Database connection pool: healthy ✅ or degraded ❌

**Hour 4-6:** (repeat above every 2 hours)
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 6-8:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 8-10:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 10-12:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 12-14:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 14-16:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 16-18:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 18-20:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 20-22:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 22-24:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

### Phase 1 Completion Gate (Hour 24)

**Completed By:** ____________  **Time:** ____________

- [ ] Phase duration: 24h complete
- [ ] Error rate all windows: <1% ✅ or breach ❌
- [ ] Checkout success all windows: >99% ✅ or breach ❌
- [ ] P95 latency all windows: <1.2s ✅ or breach ❌
- [ ] No critical incidents requiring rollback
- [ ] Total revenue: $__________ (track for trend)

**Phase 1 Outcome:**
- [ ] PASS: All gates met → proceed to Phase 2
- [ ] CONDITIONAL: Minor issues, discuss with leadership → proceed to Phase 2 or ABORT
- [ ] FAIL: Critical issues → EXECUTE ROLLBACK

**Operator Sign-Off:** ____________  **SRE Sign-Off:** ____________

---

## Phase 2: 25% Traffic (48 hours)

**Phase Start Time:** ____________  **Operator:** ____________  
**Target End Time:** ____________ (48 hours later)

### Phase Launch

- [ ] Announce: "Phase 2 (25% traffic) LIVE at [TIME]"
- [ ] Set Vercel traffic split to 25% (verify in dashboard)
- [ ] Reset monitoring dashboard and start timer
- [ ] Log start: `Phase 2 start: [timestamp], 25% traffic active`

### Continuous Monitoring (every 4 hours during Phase 2)

**Hour 0-4:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms
- [ ] New errors in Sentry: ____ | New issues: ____

**Hour 4-8:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms
- [ ] Trend analysis: improving/stable/degrading

**Hour 8-12:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 12-16:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 16-20:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 20-24:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 24-28:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 28-32:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 32-36:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 36-40:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 40-44:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

**Hour 44-48:**
- [ ] Error rate: ______% | Checkout: ____% | Latency: ____ms

### Phase 2 Completion Gate (Hour 48)

- [ ] Phase duration: 48h complete
- [ ] Error rate all windows: <0.5% ✅ or breach ❌
- [ ] Checkout success all windows: >99.5% ✅ or breach ❌
- [ ] P95 latency trend: stable/improving ✅ or degrading ❌
- [ ] No critical security incidents
- [ ] Revenue rate: $__________ (on pace for target: $15k+/month)

**Phase 2 Outcome:**
- [ ] PASS: proceed to Phase 3
- [ ] CONDITIONAL: minor issues, leadership discussion
- [ ] FAIL: EXECUTE ROLLBACK

**Operator Sign-Off:** ____________  **SRE Sign-Off:** ____________

---

## Phase 3: 50% Traffic (72 hours)

**Phase Start Time:** ____________  **Operator:** ____________  
**Target End Time:** ____________ (72 hours later)

### Phase Launch

- [ ] Announce: "Phase 3 (50% traffic) LIVE at [TIME]"
- [ ] Set Vercel traffic split to 50%
- [ ] Reset monitoring dashboard
- [ ] Log start: `Phase 3 start: [timestamp], 50% traffic active`

### Continuous Monitoring (twice daily during Phase 3)

**Day 1 Morning:** Error ____% | Checkout ____% | Latency ____ms | Issues: ____  
**Day 1 Evening:** Error ____% | Checkout ____% | Latency ____ms | Issues: ____

**Day 2 Morning:** Error ____% | Checkout ____% | Latency ____ms | Issues: ____  
**Day 2 Evening:** Error ____% | Checkout ____% | Latency ____ms | Issues: ____

**Day 3 Morning:** Error ____% | Checkout ____% | Latency ____ms | Issues: ____  
**Day 3 Evening:** Error ____% | Checkout ____% | Latency ____ms | Issues: ____

### Phase 3 Completion Gate (Hour 72)

- [ ] Phase duration: 72h complete
- [ ] Error rate all windows: <0.3% ✅
- [ ] Checkout success all windows: >99.5% ✅
- [ ] P95 latency: <1.2s ✅
- [ ] All metrics stable (no degradation)
- [ ] Daily revenue: trending toward $11k+/month ✅

**Phase 3 Outcome:**
- [ ] PASS: proceed to Phase 4 (100%)
- [ ] CONDITIONAL: discuss with executives
- [ ] FAIL: EXECUTE ROLLBACK

**Operator Sign-Off:** ____________  **Executive Sponsor Sign-Off:** ____________

---

## Phase 4: 100% Traffic (Production, Indefinite)

**Phase Start Time:** ____________  **Operator:** ____________

### Phase Launch

- [ ] Announce: "Phase 4 (100% traffic / FULL PRODUCTION) LIVE at [TIME]"
- [ ] Set Vercel traffic split to 100%
- [ ] Activate 14-day monitoring gates (see below)
- [ ] Log start: `Phase 4 start: [timestamp], 100% production traffic active`

### 14-Day Post-Launch Monitoring

**Purpose:** Continuous validation that metrics remain stable at full production scale.

**Daily Checklist (Days 1-14):**
- [ ] Error rate: ____% (target <0.5%)
- [ ] Checkout success: ____% (target >99%)
- [ ] P95 latency: ____ms (target <1.2s)
- [ ] Daily revenue: $______ (trend: improving/stable/declining)
- [ ] Customer complaints (ticket count): ____
- [ ] Sentry critical errors: ____ (target <5/day)
- [ ] No security incidents
- [ ] Square API sync healthy

**Incident Response:** If any metric breaches, execute appropriate incident runbook (see `docs/LAUNCH_INCIDENT_RUNBOOKS.md`).

**Gate Criteria for Sustained Success:**
- [ ] Days 1-7: Error <0.5%, Checkout >99%, Latency <1.2s
- [ ] Days 8-14: Error <0.5%, Checkout >99%, Latency <1.2s
- [ ] Revenue: trending toward $11k+/month target
- [ ] No major customer complaints or security incidents

**Post-Launch Review (Day 15):**
- [ ] All 14-day gates: PASS ✅ → Launch SUCCESSFUL
- [ ] Any gate: FAIL ❌ → Post-incident review + remediation plan

**Phase 4 Sign-Off (if all gates pass):** ____________

---

## Rollback Health Check (Post-Rollback Validation)

**Use this checklist after executing any rollback to verify system health.**

### Immediate (within 5 minutes of rollback)

- [ ] Vercel traffic reversed (back to previous version)
- [ ] DNS fallback to Square Online verified (if Option 3 used)
- [ ] Homepage loads in <2s
- [ ] Booking flow entry page loads
- [ ] No 500 errors on root route
- [ ] Database connections stable
- [ ] Square API connectivity verified
- [ ] Sentry receiving events from rolled-back version

### Short-term (5-30 minutes post-rollback)

- [ ] Error rate trending down (below 0.5%)
- [ ] Checkout success rate recovered (>99%)
- [ ] Customer complaints in Slack: none new
- [ ] All team members notified of rollback

### Post-Incident Checklist

- [ ] Root cause analysis scheduled (within 24h)
- [ ] Incident timeline documented (rollback reason, execution time, outcomes)
- [ ] Metrics collected (error rate by route, customer impact, revenue impact)
- [ ] Remediation plan drafted
- [ ] Stakeholder communication sent (status update + next steps)

---

## Auto-Abort Triggers (Any Phase)

**If ANY of the following occur, EXECUTE ROLLBACK IMMEDIATELY:**

### Trigger 1: High Error Rate
- **Condition:** Error rate >1% for 5 consecutive minutes
- **Action:** Execute rollback Option 1 (Vercel instant)
- **Operator:** [immediate execution]
- **Log:** `AUTO-ABORT-001: Error rate >1% [timestamp]`

### Trigger 2: Checkout Failure Spike
- **Condition:** Checkout success <95% for 5 consecutive minutes
- **Action:** Execute rollback Option 1 (Vercel instant)
- **Operator:** [immediate execution]
- **Log:** `AUTO-ABORT-002: Checkout success <95% [timestamp]`

### Trigger 3: Latency Degradation
- **Condition:** P95 latency >3s for 5 consecutive minutes
- **Action:** Page Incident Commander, execute rollback if confirmed
- **Operator:** [notify IC, then execute if IC approves]
- **Log:** `AUTO-ABORT-003: Latency degradation [timestamp]`

---

## Communication Checklist

### Launch Announcement (Phase 1 Start)

```
📢 Funky Town Comics & Vinyl Headless Launch is LIVE 🚀

New Platform: headless.funkytowncomics.com
Phase 1: 10% traffic (24-hour monitoring)
Timeline: 5 days total (phases: 10% → 25% → 50% → 100%)
Monitoring: Continuous (Error <1%, Checkout >99%, Latency <1.2s)
Rollback: Ready (if needed, <5 min restore to Square Online)

Questions? #launches channel or ask @IncidentCommander
```

### Phase Transition Announcement

```
✅ Phase X metrics PASSED ✅

Metrics Summary:
- Error rate: [X]% (target: <Y%)
- Checkout success: [X]% (target: >Y%)
- P95 latency: [X]ms (target: <Yms)
- Revenue trending: $X/month

Proceeding to Phase [X+1]: [Y]% traffic
Next gate check: [Date/Time]
```

### Incident Announcement (If Needed)

```
🚨 INCIDENT: [Brief description]

Severity: [P1/P2/P3]
Status: Investigating / Mitigating / Monitoring
Impact: [Description of customer impact]
ETA Resolution: [Best estimate]

Updates every 15 minutes in #incidents
```

---

## Appendix: Key Contacts

| Role | Name | Phone | Slack | On-Call |
|------|------|-------|-------|---------|
| Incident Commander | ____________ | ________ | ________ | ✅ or ❌ |
| SRE Engineer | ____________ | ________ | ________ | ✅ or ❌ |
| Backend Engineer | ____________ | ________ | ________ | ✅ or ❌ |
| Frontend Engineer | ____________ | ________ | ________ | ✅ or ❌ |
| Product Owner | ____________ | ________ | ________ | ✅ or ❌ |
| Stakeholder Executive | ____________ | ________ | ________ | As needed |
| Security Engineer | ____________ | ________ | ________ | As needed |

---

**Operator Checklist Version:** 1.0  
**Last Updated:** May 16, 2026  
**Authority:** Incident Commander  
**Print this document. Keep at your desk during launch.**
