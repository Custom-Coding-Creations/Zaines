#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const outDir = path.join(process.cwd(), "docs", "audit_logs");
fs.mkdirSync(outDir, { recursive: true });
const baselinePath = path.join(process.cwd(), "scripts", "audit", "issue66_security_baseline.json");
const strictMode = process.env.ISSUE66_SECURITY_STRICT === "1";

function runAudit() {
  try {
    return execFileSync("npm", ["audit", "--omit=dev", "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return error.stdout ? String(error.stdout) : "{}";
  }
}

function loadBaseline() {
  if (!fs.existsSync(baselinePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
  } catch {
    return null;
  }
}

function walkFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, files);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const auditJson = JSON.parse(runAudit());
const vulnerabilities = auditJson.metadata?.vulnerabilities ?? {};
const high = vulnerabilities.high ?? 0;
const critical = vulnerabilities.critical ?? 0;

const rawConsoleFindings = walkFiles(path.join(process.cwd(), "src", "app", "api"))
  .flatMap((file) => {
    const rel = path.relative(process.cwd(), file);
    const source = fs.readFileSync(file, "utf8");
    return source
      .split("\n")
      .map((line, index) => ({ rel, line, index: index + 1 }))
      .filter((item) => /console\.(log|warn|error|info)/.test(item.line));
  });

const baseline = loadBaseline();
const baselineAllowedPaths = new Set(baseline?.console?.allowedPaths || []);
const currentConsolePaths = [...new Set(rawConsoleFindings.map((finding) => finding.rel))];
const newConsolePaths = baseline
  ? currentConsolePaths.filter((rel) => !baselineAllowedPaths.has(rel))
  : [];

let pass = false;
if (strictMode || !baseline) {
  pass = critical === 0 && high === 0 && rawConsoleFindings.length === 0;
} else {
  const baselineCritical = baseline.npmAudit?.critical ?? 0;
  const baselineHigh = baseline.npmAudit?.high ?? 0;
  const baselineConsoleCount = baseline.console?.allowedCount ?? 0;
  pass =
    critical <= baselineCritical &&
    high <= baselineHigh &&
    rawConsoleFindings.length <= baselineConsoleCount &&
    newConsolePaths.length === 0;
}

const summary = {
  scannedAt: new Date().toISOString(),
  mode: strictMode ? "strict" : baseline ? "baseline-regression" : "strict-no-baseline",
  npmAudit: {
    critical,
    high,
    moderate: vulnerabilities.moderate ?? 0,
    low: vulnerabilities.low ?? 0,
    total: vulnerabilities.total ?? 0,
  },
  apiConsoleFindings: rawConsoleFindings,
  baseline: baseline || null,
  baselineDelta: baseline
    ? {
        npmAudit: {
          critical: critical - (baseline.npmAudit?.critical ?? 0),
          high: high - (baseline.npmAudit?.high ?? 0),
        },
        consoleCount: rawConsoleFindings.length - (baseline.console?.allowedCount ?? 0),
        newConsolePaths,
      }
    : null,
  pass,
};

fs.writeFileSync(
  path.join(outDir, "ISSUE66_SECURITY_GATE.json"),
  JSON.stringify(summary, null, 2),
);

const md = [
  "# Issue 66 Security Gate",
  `- Scanned at: ${summary.scannedAt}`,
  `- Mode: ${summary.mode}`,
  `- Result: ${summary.pass ? "PASS" : "FAIL"}`,
  `- npm audit critical/high: ${critical}/${high}`,
  `- npm audit moderate/low: ${summary.npmAudit.moderate}/${summary.npmAudit.low}`,
  `- Raw console usage in src/app/api: ${rawConsoleFindings.length}`,
  "",
  baseline
    ? `- Baseline delta (critical/high/console): ${summary.baselineDelta.npmAudit.critical}/${summary.baselineDelta.npmAudit.high}/${summary.baselineDelta.consoleCount}`
    : "- Baseline: not configured",
  baseline && summary.baselineDelta.newConsolePaths.length
    ? `- New console paths: ${summary.baselineDelta.newConsolePaths.length}`
    : "- New console paths: 0",
  "",
  rawConsoleFindings.length
    ? rawConsoleFindings.map((finding) => `- ${finding.rel}:${finding.index}`).join("\n")
    : "No raw API console logging found.",
];
fs.writeFileSync(path.join(outDir, "ISSUE66_SECURITY_GATE.md"), md.join("\n"));

if (!summary.pass) {
  console.error("Issue 66 security gate failed. See docs/audit_logs/ISSUE66_SECURITY_GATE.json");
  process.exit(1);
}

console.log("Issue 66 security gate passed.");
