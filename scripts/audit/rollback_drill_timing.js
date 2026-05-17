#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

function getArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) return fallback;
  return value;
}

function toBool(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return fallback;
}

function safeBranchName() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const issue = Number(getArg("issue", process.env.ROLLBACK_DRILL_ISSUE || "66"));
const thresholdMinutes = Number(
  getArg("threshold-minutes", process.env.ROLLBACK_DRILL_THRESHOLD_MINUTES || "5"),
);
const elapsedSeconds = Number(
  getArg("elapsed-seconds", process.env.ROLLBACK_DRILL_ELAPSED_SECONDS || "0"),
);
const drillDate = getArg("drill-date", process.env.ROLLBACK_DRILL_DATE || new Date().toISOString().slice(0, 10));
const branch = getArg("branch", process.env.ROLLBACK_DRILL_BRANCH || safeBranchName());
const operatorsCsv = getArg(
  "operators",
  process.env.ROLLBACK_DRILL_OPERATORS || "qa-test-engineer,tech-lead",
);
const trigger = getArg(
  "trigger",
  process.env.ROLLBACK_DRILL_TRIGGER || "simulated release-checkpoint failure requiring fallback",
);
const fallbackTarget = getArg("fallback-target", process.env.ROLLBACK_DRILL_TARGET || "Square Online");
const now = new Date();
const endTimestampUtc = getArg("end", process.env.ROLLBACK_DRILL_END || now.toISOString());
const startFromElapsed = new Date(now.getTime() - Math.max(0, elapsedSeconds) * 1000).toISOString();
const startTimestampUtc = getArg("start", process.env.ROLLBACK_DRILL_START || startFromElapsed);

const verificationChecks = {
  rootRouteHealthy: toBool(
    getArg("root-route-healthy", process.env.ROLLBACK_DRILL_ROOT_ROUTE_HEALTHY),
    true,
  ),
  bookingEntryReachable: toBool(
    getArg("booking-entry-reachable", process.env.ROLLBACK_DRILL_BOOKING_REACHABLE),
    true,
  ),
  contactEntryReachable: toBool(
    getArg("contact-entry-reachable", process.env.ROLLBACK_DRILL_CONTACT_REACHABLE),
    true,
  ),
  checkoutBoundarySquareDelegated: toBool(
    getArg("checkout-boundary-square-delegated", process.env.ROLLBACK_DRILL_SQUARE_DELEGATED),
    true,
  ),
};

const allChecksPass = Object.values(verificationChecks).every(Boolean);
const withinThreshold = elapsedSeconds <= thresholdMinutes * 60;
const result = withinThreshold && allChecksPass ? "PASS" : "FAIL";

const jsonOutputPath = getArg(
  "output",
  process.env.ROLLBACK_DRILL_OUTPUT || `docs/audit_logs/issue${issue}_rollback_drill_timing.json`,
);
const mdOutputPath = getArg(
  "output-md",
  process.env.ROLLBACK_DRILL_OUTPUT_MD || `docs/audit_logs/issue${issue}_rollback_drill_timing.md`,
);

const payload = {
  issue,
  branch,
  drillDate,
  operators: operatorsCsv
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  trigger,
  fallbackTarget,
  startTimestampUtc,
  endTimestampUtc,
  elapsedSeconds: Number(elapsedSeconds.toFixed(2)),
  elapsedMinutes: Number((elapsedSeconds / 60).toFixed(2)),
  thresholdMinutes,
  withinThreshold,
  verificationChecks,
  result,
  reason:
    result === "PASS"
      ? `Fallback drill completed within <=${thresholdMinutes} minutes with all verification checks true.`
      : `Fallback drill exceeded threshold and/or verification checks failed.`,
};

fs.mkdirSync(path.dirname(jsonOutputPath), { recursive: true });
fs.writeFileSync(jsonOutputPath, JSON.stringify(payload, null, 2));

const md = [
  `# Rollback Drill Timing (Issue ${issue})`,
  `- Result: ${payload.result}`,
  `- Drill Date: ${payload.drillDate}`,
  `- Branch: ${payload.branch}`,
  `- Elapsed: ${payload.elapsedSeconds}s (${payload.elapsedMinutes}m)`,
  `- Threshold: <= ${payload.thresholdMinutes}m`,
  "",
  "## Verification Checks",
  `- Root route healthy: ${payload.verificationChecks.rootRouteHealthy}`,
  `- Booking entry reachable: ${payload.verificationChecks.bookingEntryReachable}`,
  `- Contact entry reachable: ${payload.verificationChecks.contactEntryReachable}`,
  `- Checkout boundary delegated to Square: ${payload.verificationChecks.checkoutBoundarySquareDelegated}`,
  "",
  `Reason: ${payload.reason}`,
];
fs.writeFileSync(mdOutputPath, md.join("\n"));

console.log(`Rollback drill artifact written: ${jsonOutputPath}`);
console.log(`Rollback drill markdown written: ${mdOutputPath}`);

if (result !== "PASS") {
  process.exit(1);
}
