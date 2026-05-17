#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const { JSDOM } = require("jsdom");
const axe = require("axe-core");
const fs = require("fs");
const { PUBLIC_AUDIT_ROUTES } = require("./shared-routes");

const BASE = process.argv[2] || "http://localhost:3000";
const ROUTES = PUBLIC_AUDIT_ROUTES;

async function fetchHtml(url) {
  const res = await fetch(url);
  return await res.text();
}

async function runAxeOnHtml(html, url) {
  // create JSDOM for static markup analysis without executing app bundles
  const dom = new JSDOM(html, { url, runScripts: "outside-only" });
  const win = dom.window;

  // inject axe runtime directly into the window context
  win.eval(axe.source);

  const results = await win.axe.run();
  return results;
}

(async () => {
  const aggregated = {
    url: BASE,
    scannedAt: new Date().toISOString(),
    results: [],
  };

  for (const route of ROUTES) {
    const url = BASE.replace(/\/$/, "") + route;
    try {
      console.log("Scanning", url);
      const html = await fetchHtml(url);
      const result = await runAxeOnHtml(html, url);
      aggregated.results.push({
        route,
        url,
        violations: result.violations.length,
        details: result.violations,
      });
      console.log(`  Violations: ${result.violations.length}`);
    } catch (err) {
      console.error("  Error scanning", url, err && err.message);
      aggregated.results.push({ route, url, error: String(err) });
    }
  }

  // write JSON results
  const outDir = "docs/audit_logs";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    `${outDir}/AXE_RESULTS.json`,
    JSON.stringify(aggregated, null, 2),
  );

  // create a brief markdown summary
  const lines = [];
  lines.push("# Accessibility scan summary");
  lines.push(`- Base: ${BASE}`);
  lines.push(`- Scanned at: ${aggregated.scannedAt}`);
  lines.push("");
  for (const r of aggregated.results) {
    if (r.error) {
      lines.push(`- ${r.route} — ERROR: ${r.error}`);
    } else {
      lines.push(`- ${r.route} — Violations: ${r.violations}`);
      if (r.violations > 0) {
        const first = r.details[0];
        lines.push(
          `  - Example: ${first.id} — ${first.help} (nodes: ${first.nodes.length})`,
        );
      }
    }
  }

  fs.writeFileSync(`${outDir}/ACCESSIBILITY.md`, lines.join("\n"));
  console.log(
    "\nAccessibility scan complete — results written to docs/audit_logs",
  );
})();
