#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");
const { ISSUE66_PERFORMANCE_ROUTES } = require("./shared-routes");

const BASE =
  process.argv.find((arg, index) => index > 1 && arg !== "--") ||
  process.env.ISSUE66_BASE_URL ||
  "http://127.0.0.1:3000";
const ROUTES = ISSUE66_PERFORMANCE_ROUTES;

const BUDGETS = {
  domNodes: 1800,
  documentCompleteMs: 5000,
  encodedBytes: 1_250_000,
  // Dev-server chunks include framework instrumentation; this keeps critical
  // pages below a 1 MB script transfer ceiling while still catching regressions.
  scriptBytes: 950_000,
  styleBytes: 250_000,
};

async function collectRoute(page, route) {
  const url = BASE.replace(/\/$/, "") + route.path;
  const startedAt = Date.now();
  const response = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  const status = response ? response.status() : 0;
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    const byType = resources.reduce(
      (acc, resource) => {
        const size = Math.round(resource.transferSize || resource.encodedBodySize || 0);
        acc.encodedBytes += size;
        if (resource.initiatorType === "script") acc.scriptBytes += size;
        if (resource.initiatorType === "css" || resource.name.endsWith(".css")) {
          acc.styleBytes += size;
        }
        return acc;
      },
      { encodedBytes: 0, scriptBytes: 0, styleBytes: 0 },
    );

    return {
      documentCompleteMs: Math.round(nav ? nav.loadEventEnd : performance.now()),
      domNodes: document.querySelectorAll("*").length,
      ...byType,
    };
  });

  const measured = {
    route: route.path,
    name: route.name,
    url,
    status,
    wallTimeMs: Date.now() - startedAt,
    ...metrics,
  };
  const violations = Object.entries(BUDGETS)
    .filter(([key, value]) => measured[key] > value)
    .map(([key, value]) => ({
      metric: key,
      budget: value,
      actual: measured[key],
    }));

  return { ...measured, violations };
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const results = [];

  for (const route of ROUTES) {
    try {
      results.push(await collectRoute(page, route));
    } catch (error) {
      results.push({
        route: route.path,
        name: route.name,
        url: BASE.replace(/\/$/, "") + route.path,
        error: error instanceof Error ? error.message : String(error),
        violations: [{ metric: "route_load", budget: "no error", actual: "error" }],
      });
    }
  }

  await browser.close();

  const summary = {
    base: BASE,
    measuredAt: new Date().toISOString(),
    budgets: BUDGETS,
    routes: results,
    pass: results.every((route) => route.violations.length === 0 && route.status < 500),
  };

  const outDir = path.join(process.cwd(), "docs", "audit_logs");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "ISSUE66_PERFORMANCE_BUDGET.json"),
    JSON.stringify(summary, null, 2),
  );

  const md = [
    "# Issue 66 Performance Budget",
    `- Base: ${summary.base}`,
    `- Measured at: ${summary.measuredAt}`,
    `- Result: ${summary.pass ? "PASS" : "FAIL"}`,
    "",
    "| Route | Status | Load ms | DOM nodes | Encoded bytes | Script bytes | Style bytes | Violations |",
    "|---|---:|---:|---:|---:|---:|---:|---|",
    ...summary.routes.map((route) => [
      route.route,
      route.status ?? "ERR",
      route.documentCompleteMs ?? "ERR",
      route.domNodes ?? "ERR",
      route.encodedBytes ?? "ERR",
      route.scriptBytes ?? "ERR",
      route.styleBytes ?? "ERR",
      route.violations.map((violation) => `${violation.metric}: ${violation.actual}/${violation.budget}`).join(", ") || "none",
    ].join(" | ")).map((line) => `| ${line} |`),
  ];
  fs.writeFileSync(path.join(outDir, "ISSUE66_PERFORMANCE_BUDGET.md"), md.join("\n"));

  if (!summary.pass) {
    console.error("Issue 66 performance budget failed. See docs/audit_logs/ISSUE66_PERFORMANCE_BUDGET.json");
    process.exit(1);
  }

  console.log("Issue 66 performance budget passed.");
})();
