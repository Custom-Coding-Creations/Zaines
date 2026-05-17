#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');

function getArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith('--')) return fallback;
  return value;
}

async function main() {
  const baseUrl = getArg('base-url', process.env.AUTH_HEALTH_BASE_URL || 'http://localhost:3000');
  const outputDir = getArg('output-dir', path.join(process.cwd(), 'docs', 'audit_logs'));
  const now = new Date().toISOString();
  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/admin/health/auth`;

  let response;
  let body;
  let probeError = null;

  try {
    response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    body = await response.json();
  } catch (error) {
    probeError = error instanceof Error ? error.message : String(error);
  }

  const report = {
    timestamp: now,
    endpoint,
    statusCode: response?.status ?? null,
    ok: response?.ok ?? false,
    probeError,
    payload: body ?? null,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  const outFile = path.join(outputDir, 'ADMIN_AUTH_HEALTH_PROBE.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  if (probeError) {
    console.error(`Auth health probe failed: ${probeError}`);
    console.error(`Report written to ${outFile}`);
    process.exit(2);
  }

  const status = body?.status;
  const code = body?.code;
  console.log(`Auth health: HTTP ${response.status} status=${status} code=${code}`);
  console.log(`Report written to ${outFile}`);

  if (response.status !== 200 || code !== 'ADMIN_AUTH_READY') {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected auth health probe error:', error);
  process.exit(2);
});
