#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

function loadJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function getArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return fallback;
  return value;
}

const auditLogDir = path.join(process.cwd(), "docs", "audit_logs");
const outputDir = getArg("output-dir", auditLogDir);
const outputPath = path.join(outputDir, "LAUNCH_READINESS_EVIDENCE_2026-05-16.json");

const evidence = {
  generatedAt: new Date().toISOString(),
  gates: {},
  artifacts: {},
  summary: {
    allGatesPassing: false,
    blockers: [],
    warnings: [],
    readinessLevel: "NOT_READY",
  },
};

// Gate 0: Admin auth health readiness
const authHealthGate = loadJsonIfExists(path.join(auditLogDir, "ADMIN_AUTH_HEALTH_PROBE.json"));
if (authHealthGate) {
  const authCode = authHealthGate.payload?.code || null;
  const authStatus = authHealthGate.payload?.status || null;
  const authProbePassing =
    authHealthGate.statusCode === 200 &&
    authCode === "ADMIN_AUTH_READY" &&
    authStatus === "ok";

  evidence.gates.authHealth = {
    name: "Admin Auth Health",
    status: authProbePassing ? "PASS" : "FAIL",
    statusCode: authHealthGate.statusCode,
    code: authCode,
    state: authStatus,
    probeError: authHealthGate.probeError || null,
  };
  evidence.artifacts.authHealth = "ADMIN_AUTH_HEALTH_PROBE.json";
  if (!authProbePassing) {
    evidence.summary.blockers.push("Admin auth health gate failed");
  }
} else {
  evidence.gates.authHealth = { status: "UNKNOWN", reason: "artifact not found" };
  evidence.summary.warnings.push("Admin auth health artifact not found");
}

// Gate 1: Security (baseline non-regression)
const securityGate = loadJsonIfExists(path.join(auditLogDir, "ISSUE66_SECURITY_GATE.json"));
if (securityGate) {
  evidence.gates.security = {
    name: "Issue 66 Security Non-Regression",
    status: securityGate.pass ? "PASS" : "FAIL",
    mode: securityGate.mode || "unknown",
    critical: securityGate.npmAudit?.critical || 0,
    high: securityGate.npmAudit?.high || 0,
    consoleFindings: securityGate.apiConsoleFindings?.length || 0,
  };
  evidence.artifacts.security = "ISSUE66_SECURITY_GATE.json";
  if (!securityGate.pass) {
    evidence.summary.blockers.push("Security gate failed");
  }
} else {
  evidence.gates.security = { status: "UNKNOWN", reason: "artifact not found" };
  evidence.summary.warnings.push("Security gate artifact not found");
}

// Gate 2: Performance Budget
const performanceGate = loadJsonIfExists(
  path.join(auditLogDir, "ISSUE66_PERFORMANCE_BUDGET.json"),
);
if (performanceGate) {
  evidence.gates.performance = {
    name: "Issue 66 Performance Budget",
    status: performanceGate.pass ? "PASS" : "FAIL",
    routeCount: performanceGate.routes?.length || 0,
    failedRoutes: performanceGate.routes?.filter((r) => r.violations?.length > 0)?.length || 0,
  };
  evidence.artifacts.performance = "ISSUE66_PERFORMANCE_BUDGET.json";
  if (!performanceGate.pass) {
    evidence.summary.blockers.push("Performance budget gate failed");
  }
} else {
  evidence.gates.performance = { status: "UNKNOWN", reason: "artifact not found" };
  evidence.summary.warnings.push("Performance budget artifact not found");
}

// Gate 3: Accessibility (Playwright)
const a11yGate = loadJsonIfExists(path.join(auditLogDir, "PLAYWRIGHT_A11Y.json"));
if (a11yGate) {
  const totalViolations = a11yGate.results?.reduce((sum, r) => sum + (r.violations || 0), 0) || 0;
  const criticalViolations = a11yGate.results?.reduce(
    (sum, r) => sum + (r.critical || 0),
    0,
  ) || 0;
  const seriousViolations = a11yGate.results?.reduce(
    (sum, r) => sum + (r.serious || 0),
    0,
  ) || 0;
  const hasErrors = a11yGate.results?.some((r) => r.error) || false;

  evidence.gates.accessibility = {
    name: "Playwright Accessibility (axe-core)",
    status:
      criticalViolations === 0 && seriousViolations === 0 && !hasErrors ? "PASS" : "FAIL",
    totalViolations,
    critical: criticalViolations,
    serious: seriousViolations,
    routeCount: a11yGate.results?.length || 0,
    routeErrors: hasErrors ? a11yGate.results?.filter((r) => r.error)?.length : 0,
  };
  evidence.artifacts.accessibility = "PLAYWRIGHT_A11Y.json";
  if (
    criticalViolations > 0 ||
    seriousViolations > 0 ||
    hasErrors
  ) {
    evidence.summary.blockers.push("Accessibility gate failed (critical/serious violations or route errors)");
  }
} else {
  evidence.gates.accessibility = { status: "UNKNOWN", reason: "artifact not found" };
  evidence.summary.warnings.push("Accessibility gate artifact not found");
}

// Gate 4: Rollback Drill
const rollbackDrill = loadJsonIfExists(path.join(auditLogDir, "issue66_rollback_drill_timing.json"));
if (rollbackDrill) {
  evidence.gates.rollback = {
    name: "Rollback Drill Timing",
    status: rollbackDrill.result,
    elapsedSeconds: rollbackDrill.elapsedSeconds,
    elapsedMinutes: rollbackDrill.elapsedMinutes,
    thresholdMinutes: rollbackDrill.thresholdMinutes,
    withinThreshold: rollbackDrill.withinThreshold,
    verificationsPassed: Object.values(rollbackDrill.verificationChecks || {}).every(
      Boolean,
    ),
  };
  evidence.artifacts.rollback = "issue66_rollback_drill_timing.json";
  if (rollbackDrill.result !== "PASS") {
    evidence.summary.blockers.push("Rollback drill failed");
  }
} else {
  evidence.gates.rollback = { status: "UNKNOWN", reason: "artifact not found" };
  evidence.summary.warnings.push("Rollback drill artifact not found");
}

// Summary
const gatesPassing = Object.values(evidence.gates).filter((g) => g.status === "PASS").length;
const gatesTotal = Object.keys(evidence.gates).length;
evidence.summary.gatesPassing = gatesPassing;
evidence.summary.gatesTotal = gatesTotal;
evidence.summary.allGatesPassing =
  gatesPassing === gatesTotal && evidence.summary.blockers.length === 0;

if (evidence.summary.allGatesPassing) {
  evidence.summary.readinessLevel = "READY_FOR_STAGED_ROLLOUT";
} else if (evidence.summary.blockers.length === 0 && gatesPassing > gatesTotal / 2) {
  evidence.summary.readinessLevel = "CONDITIONALLY_READY";
} else if (gatesPassing > 0) {
  evidence.summary.readinessLevel = "PARTIALLY_READY";
} else {
  evidence.summary.readinessLevel = "NOT_READY";
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(evidence, null, 2));

const md = [
  "# Launch Readiness Evidence (2026-05-16)",
  `- Generated: ${evidence.generatedAt}`,
  `- Readiness Level: **${evidence.summary.readinessLevel}**`,
  `- Gates Passing: ${evidence.summary.gatesPassing}/${evidence.summary.gatesTotal}`,
  "",
  "## Hard Gates Status",
  "",
];

Object.entries(evidence.gates).forEach(([, gate]) => {
  const icon = gate.status === "PASS" ? "✅" : gate.status === "FAIL" ? "❌" : "❓";
  md.push(`### ${icon} ${gate.name}`);
  md.push(`- **Status:** ${gate.status}`);
  if (gate.mode) md.push(`- **Mode:** ${gate.mode}`);
  if (gate.critical !== undefined) md.push(`- **Critical:** ${gate.critical}`);
  if (gate.high !== undefined) md.push(`- **High:** ${gate.high}`);
  if (gate.serious !== undefined) md.push(`- **Serious:** ${gate.serious}`);
  if (gate.totalViolations !== undefined) md.push(`- **Total Violations:** ${gate.totalViolations}`);
  if (gate.elapsedSeconds !== undefined) {
    md.push(
      `- **Elapsed:** ${gate.elapsedSeconds}s (${gate.elapsedMinutes}m / ${gate.thresholdMinutes}m threshold)`,
    );
  }
  if (gate.verificationsPassed !== undefined) {
    md.push(`- **Verifications Passed:** ${gate.verificationsPassed}`);
  }
  md.push("");
});

md.push("## Summary");
if (evidence.summary.blockers.length > 0) {
  md.push("### 🔴 Blockers");
  evidence.summary.blockers.forEach((b) => md.push(`- ${b}`));
  md.push("");
}

if (evidence.summary.warnings.length > 0) {
  md.push("### ⚠️  Warnings");
  evidence.summary.warnings.forEach((w) => md.push(`- ${w}`));
  md.push("");
}

md.push("## Recommendation");
if (evidence.summary.readinessLevel === "READY_FOR_STAGED_ROLLOUT") {
  md.push(
    "✅ **All hard gates passing. Recommend immediate progression to staged rollout (10% → 25% → 50% → 100%)**.",
  );
} else if (evidence.summary.readinessLevel === "CONDITIONALLY_READY") {
  md.push("⚠️  **Most gates passing. Review warnings before staged rollout.**");
} else if (evidence.summary.readinessLevel === "PARTIALLY_READY") {
  md.push("🔴 **Some gates failing. Address blockers before rollout consideration.**");
} else {
  md.push("🛑 **Not ready. Critical gates failing. Fix blockers before retesting.**");
}

const mdPath = path.join(outputDir, "LAUNCH_READINESS_EVIDENCE_2026-05-16.md");
fs.writeFileSync(mdPath, md.join("\n"));

console.log(`Launch readiness evidence written: ${outputPath}`);
console.log(`Launch readiness markdown written: ${mdPath}`);
console.log(`\n${evidence.summary.readinessLevel}`);

if (!evidence.summary.allGatesPassing && evidence.summary.blockers.length > 0) {
  process.exit(1);
}
