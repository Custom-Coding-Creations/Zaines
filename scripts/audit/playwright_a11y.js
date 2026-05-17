#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const { chromium } = require("@playwright/test");
const axeSource = require("axe-core").source;
const { PUBLIC_AUDIT_ROUTES } = require("./shared-routes");

const BASE =
  process.argv.find((arg, index) => index > 1 && arg !== "--") ||
  "http://localhost:3000";
const ROUTES = PUBLIC_AUDIT_ROUTES;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const out = { base: BASE, scannedAt: new Date().toISOString(), results: [] };

  for (const route of ROUTES) {
    const url = BASE.replace(/\/$/, "") + route;
    try {
      console.log("Visiting", url);
      await page.goto(url, { waitUntil: "networkidle" });
      await page.addScriptTag({ content: axeSource });
      const results = await page.evaluate(async () => {
        return await window.axe.run(document, {
          resultTypes: ["violations"],
        });
      });
      
      // Categorize violations by impact
      const criticalViolations = results.violations.filter(v => v.impact === 'critical');
      const seriousViolations = results.violations.filter(v => v.impact === 'serious');
      const moderateViolations = results.violations.filter(v => v.impact === 'moderate');
      const minorViolations = results.violations.filter(v => v.impact === 'minor');
      
      out.results.push({
        route,
        url,
        violations: results.violations.length,
        critical: criticalViolations.length,
        serious: seriousViolations.length,
        moderate: moderateViolations.length,
        minor: minorViolations.length,
        results,
      });
      console.log(`  Violations: ${results.violations.length} (Critical: ${criticalViolations.length}, Serious: ${seriousViolations.length}, Moderate: ${moderateViolations.length}, Minor: ${minorViolations.length})`);
    } catch (err) {
      console.error("  Error on", url, err && err.message);
      out.results.push({ route, url, error: String(err) });
    }
  }

  await browser.close();

  const outDir = "docs/audit_logs";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    `${outDir}/PLAYWRIGHT_A11Y.json`,
    JSON.stringify(out, null, 2),
  );

  // Create a short markdown summary
  const md = [];
  md.push("# Playwright accessibility scan");
  md.push(`- Base: ${out.base}`);
  md.push(`- Scanned at: ${out.scannedAt}`);
  md.push("");
  
  let totalCritical = 0;
  let totalSerious = 0;
  let totalModerate = 0;
  let totalMinor = 0;
  const routeErrors = out.results.filter((result) => result.error).length;
  
  out.results.forEach((r) => {
    if (r.error) {
      md.push(`- ${r.route} — ERROR: ${r.error}`);
    } else {
      totalCritical += r.critical || 0;
      totalSerious += r.serious || 0;
      totalModerate += r.moderate || 0;
      totalMinor += r.minor || 0;
      md.push(`- ${r.route} — Total: ${r.violations} (🔴 ${r.critical || 0} critical, 🟠 ${r.serious || 0} serious, 🟡 ${r.moderate || 0} moderate, ⚪ ${r.minor || 0} minor)`);
    }
  });
  
  md.push("");
  md.push("## Summary");
  md.push(`- Route scan errors: ${routeErrors}`);
  md.push(`- 🔴 Critical: ${totalCritical}`);
  md.push(`- 🟠 Serious: ${totalSerious}`);
  md.push(`- 🟡 Moderate: ${totalModerate}`);
  md.push(`- ⚪ Minor: ${totalMinor}`);
  md.push(`- **Total: ${totalCritical + totalSerious + totalModerate + totalMinor}**`);
  
  fs.writeFileSync(`${outDir}/PLAYWRIGHT_A11Y.md`, md.join("\n"));

  if (routeErrors > 0) {
    console.error(`\n❌ Accessibility scan FAILED: ${routeErrors} route scan errors found.`);
    console.error(`   See docs/audit_logs/PLAYWRIGHT_A11Y.json for details.`);
    process.exit(1);
  }

  // Fail if critical or serious violations found (zero tolerance)
  if (totalCritical > 0 || totalSerious > 0) {
    console.error(
      `\n❌ Accessibility scan FAILED: ${totalCritical} critical and ${totalSerious} serious violations found.`,
    );
    console.error(`   CI gate enforces ZERO critical/serious violations.`);
    console.error(`   See docs/audit_logs/PLAYWRIGHT_A11Y.json for details.`);
    process.exit(1);
  }

  // Warn about moderate/minor violations
  if (totalModerate > 0 || totalMinor > 0) {
    console.warn(
      `\n⚠️  Warning: ${totalModerate} moderate and ${totalMinor} minor violations found.`,
    );
    console.warn(`   Consider fixing these for better accessibility.`);
  }

  console.log(
    "\n✅ Playwright accessibility scan complete — results written to docs/audit_logs",
  );
})();
