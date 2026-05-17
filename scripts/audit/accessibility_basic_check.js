#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const fetch = global.fetch || require("node-fetch");
const cheerio = require("cheerio");
const { PUBLIC_AUDIT_ROUTES } = require("./shared-routes");

const BASE = process.argv[2] || "http://localhost:3000";
const ROUTES = PUBLIC_AUDIT_ROUTES;

function analyze(html) {
  const $ = cheerio.load(html);
  const issues = [];

  // images without alt or empty alt
  $("img").each((i, el) => {
    const alt = $(el).attr("alt");
    if (alt === undefined)
      issues.push({ type: "img-missing-alt", selector: $(el).toString() });
    if (alt === "")
      issues.push({ type: "img-empty-alt", selector: $(el).toString() });
  });

  // inputs without labels
  $("input, textarea, select").each((i, el) => {
    const $el = $(el);
    // ignore intentionally hidden/native controls used by UI libraries
    const ariaHidden = $el.attr("aria-hidden") === "true";
    const style = ($el.attr("style") || "").toLowerCase();
    const visuallyHidden =
      /clip\(|position:\s*absolute|width:\s*1px|height:\s*1px|overflow:\s*hidden|display:\s*none/.test(
        style,
      );
    const hasHiddenAttr = $el.attr("hidden") !== undefined;
    const isHiddenInput = ($el.attr("type") || "").toLowerCase() === "hidden";
    if (ariaHidden || visuallyHidden || hasHiddenAttr || isHiddenInput) return;

    const id = $el.attr("id");
    const hasLabel = id && $(`label[for="${id}"]`).length > 0;
    const ariaLabel = $el.attr("aria-label");
    if (!hasLabel && !ariaLabel)
      issues.push({ type: "form-control-no-label", selector: $el.toString() });
  });

  // buttons without accessible name
  $('button,input[type="button"],input[type="submit"]').each((i, el) => {
    const text = $(el).text().trim() || $(el).attr("value") || "";
    const ariaLabel = $(el).attr("aria-label");
    if (!text && !ariaLabel)
      issues.push({ type: "button-no-name", selector: $(el).toString() });
  });

  // headings order and presence
  const headings = [];
  $("h1,h2,h3,h4,h5,h6").each((i, el) => headings.push($(el).get(0).tagName));
  if (headings.length === 0)
    issues.push({ type: "no-heading", detail: "no h1-h6 found" });

  return issues;
}

(async () => {
  const out = { base: BASE, scannedAt: new Date().toISOString(), results: [] };
  for (const route of ROUTES) {
    const url = BASE.replace(/\/$/, "") + route;
    try {
      console.log("Fetching", url);
      const res = await fetch(url);
      const html = await res.text();
      const issues = analyze(html, url);
      out.results.push({
        route,
        url,
        status: res.status,
        issuesCount: issues.length,
        issues,
      });
      console.log(`  Status: ${res.status}  Issues: ${issues.length}`);
    } catch (err) {
      console.error("  Error fetching", url, err && err.message);
      out.results.push({ route, url, error: String(err) });
    }
  }

  const outDir = "docs/audit_logs";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    `${outDir}/AXE_BASIC_RESULTS.json`,
    JSON.stringify(out, null, 2),
  );

  const lines = [
    `# Basic accessibility scan (${out.base})`,
    `Scanned: ${out.scannedAt}`,
    "",
  ];
  for (const r of out.results) {
    if (r.error) {
      lines.push(`- ${r.route} — ERROR: ${r.error}`);
    } else {
      lines.push(
        `- ${r.route} — status: ${r.status}, issues: ${r.issuesCount}`,
      );
      if (r.issuesCount > 0)
        lines.push(`  - Example: ${JSON.stringify(r.issues.slice(0, 1)[0])}`);
    }
  }
  fs.writeFileSync(`${outDir}/ACCESSIBILITY_BASIC.md`, lines.join("\n"));
  console.log(
    "\nBasic accessibility scan complete — results written to docs/audit_logs",
  );
})();
