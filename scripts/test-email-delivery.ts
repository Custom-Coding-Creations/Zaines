/**
 * End-to-end email delivery test.
 * Calls the Cloudflare email worker directly — no DB required.
 *
 * Usage:
 *   npx tsx scripts/test-email-delivery.ts
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Load .env (simple parser — avoids adding dotenv dep)
// ---------------------------------------------------------------------------
function loadEnv(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return env;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const envVars = loadEnv(path.resolve(process.cwd(), ".env"));
const WORKER_URL = envVars.EMAIL_WORKER_URL || process.env.EMAIL_WORKER_URL || "";
const WORKER_SECRET = envVars.EMAIL_WORKER_SECRET || process.env.EMAIL_WORKER_SECRET || "";
const EMAIL_FROM = envVars.EMAIL_FROM || process.env.EMAIL_FROM || "info@zainesstayandplay.com";
const OWNER_EMAIL = envVars.OWNER_EMAIL || process.env.OWNER_EMAIL || "info@zainesstayandplay.com";
const CUSTOMER_EMAIL = "davidtraversmailbox@gmail.com";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const COLORS = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};
const ok = (msg: string) => console.log(`${COLORS.green}✓${COLORS.reset} ${msg}`);
const fail = (msg: string) => console.log(`${COLORS.red}✗${COLORS.reset} ${msg}`);
const info = (msg: string) => console.log(`${COLORS.cyan}→${COLORS.reset} ${msg}`);
const header = (msg: string) => console.log(`\n${COLORS.bold}${COLORS.yellow}${msg}${COLORS.reset}`);

async function sendViaWorker(payload: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string; raw?: unknown }> {
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${WORKER_SECRET}`,
    },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (res.ok) {
    return { ok: true, messageId: (json?.messageId as string) || undefined };
  }
  return { ok: false, error: (json?.error as string) || res.statusText, raw: json };
}

interface TestCase {
  name: string;
  payload: { from: string; to: string; subject: string; html: string };
}

// ---------------------------------------------------------------------------
// Test cases — one per notification type
// ---------------------------------------------------------------------------
const TESTS: TestCase[] = [
  // 1. Booking confirmation → customer
  {
    name: "Booking confirmation (→ customer)",
    payload: {
      from: EMAIL_FROM,
      to: CUSTOMER_EMAIL,
      subject: "[TEST] Booking PB-20260622-0001 confirmation",
      html: `
        <div style="font-family:Georgia,serif;color:#18212a;max-width:620px;margin:0 auto;line-height:1.6">
          <h1 style="color:#059669">Your booking is confirmed!</h1>
          <p>Hi <strong>David</strong>, your booking has been received and confirmed.</p>
          <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;padding:16px">
            <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Booking #:</td><td style="text-align:right">PB-20260622-0001</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Check-In:</td><td style="text-align:right">Mon, Jul 7, 2026</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Check-Out:</td><td style="text-align:right">Fri, Jul 11, 2026</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Suite:</td><td style="text-align:right">Deluxe Suite</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Pet(s):</td><td style="text-align:right">Buddy</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0">Total:</td><td style="text-align:right;font-weight:700;font-size:18px;border-top:1px solid #e2e8f0">$320.00</td></tr>
          </table>
          <p style="color:#64748b;font-size:13px;text-align:center">This is a <strong>test email</strong> from Zaine's Stay &amp; Play email delivery check.</p>
        </div>
      `,
    },
  },

  // 2. Owner booking notification → owner inbox
  {
    name: "Owner booking notification (→ owner)",
    payload: {
      from: EMAIL_FROM,
      to: OWNER_EMAIL,
      subject: "[TEST] New Booking: PB-20260622-0001 - Buddy",
      html: `
        <div style="font-family:Georgia,serif;color:#18212a;max-width:620px;margin:0 auto;line-height:1.6">
          <h1 style="color:#059669">🎉 New Booking Received! (TEST)</h1>
          <p style="color:#4e5a67">A new booking has been confirmed and paid.</p>
          <div style="background:#f8fafc;border-radius:8px;padding:20px;margin:20px 0">
            <h2 style="margin:0 0 16px;font-size:18px">Booking Details</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Booking #:</td><td style="text-align:right">PB-20260622-0001</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Check-In:</td><td style="text-align:right">Mon, Jul 7, 2026</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Check-Out:</td><td style="text-align:right">Fri, Jul 11, 2026</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Suite:</td><td style="text-align:right">Deluxe Suite</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Pet(s):</td><td style="text-align:right">Buddy</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0">Total:</td><td style="text-align:right;font-weight:700;font-size:18px;border-top:1px solid #e2e8f0">$320.00</td></tr>
            </table>
          </div>
          <div style="background:#eff6ff;border-radius:8px;padding:20px;margin:20px 0">
            <h2 style="margin:0 0 16px;font-size:18px">Customer Information</h2>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Name:</td><td style="text-align:right">David Travers</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Email:</td><td style="text-align:right">${CUSTOMER_EMAIL}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-weight:600">Phone:</td><td style="text-align:right">(315) 555-0100</td></tr>
            </table>
          </div>
          <p style="color:#64748b;font-size:13px;text-align:center">This is a <strong>test email</strong> from the email delivery check.</p>
        </div>
      `,
    },
  },

  // 3. Payment success → customer
  {
    name: "Payment success notification (→ customer)",
    payload: {
      from: EMAIL_FROM,
      to: CUSTOMER_EMAIL,
      subject: "[TEST] Booking PB-20260622-0001 payment success",
      html: `
        <div style="font-family:Georgia,serif;color:#18212a;max-width:620px;margin:0 auto;line-height:1.6">
          <h1 style="color:#059669">Payment Received</h1>
          <p>Hi <strong>David</strong>, your payment for booking <strong>PB-20260622-0001</strong> has been successfully processed. Your reservation is confirmed.</p>
          <p style="color:#64748b;font-size:13px;text-align:center">This is a <strong>test email</strong> from Zaine's Stay &amp; Play email delivery check.</p>
        </div>
      `,
    },
  },

  // 4. Payment failure → customer
  {
    name: "Payment failure notification (→ customer)",
    payload: {
      from: EMAIL_FROM,
      to: CUSTOMER_EMAIL,
      subject: "[TEST] Booking PB-20260622-0001 payment failed",
      html: `
        <div style="font-family:Georgia,serif;color:#18212a;max-width:620px;margin:0 auto;line-height:1.6">
          <h1 style="color:#dc2626">Payment Failed</h1>
          <p>Hi <strong>David</strong>, your payment for booking <strong>PB-20260622-0001</strong> was not successful. Please revisit checkout to complete your reservation.</p>
          <p style="color:#64748b;font-size:13px;text-align:center">This is a <strong>test email</strong> from Zaine's Stay &amp; Play email delivery check.</p>
        </div>
      `,
    },
  },

  // 5. Payment recovery link → customer
  {
    name: "Payment recovery link (→ customer)",
    payload: {
      from: EMAIL_FROM,
      to: CUSTOMER_EMAIL,
      subject: "[TEST] Complete payment for booking PB-20260622-0001",
      html: `
        <div style="font-family:Georgia,serif;color:#18212a;max-width:620px;margin:0 auto;line-height:1.6">
          <p>Hi <strong>David</strong>,</p>
          <p>Your booking <strong>PB-20260622-0001</strong> is waiting for payment confirmation.</p>
          <p><a href="https://zainesstayandplay.com/book/confirmation?bookingId=test-123" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px">Complete Payment Securely</a></p>
          <p style="color:#64748b;font-size:13px;text-align:center">This is a <strong>test email</strong> from Zaine's Stay &amp; Play email delivery check.</p>
        </div>
      `,
    },
  },

  // 6. Contact submission → owner inbox
  {
    name: "Contact form submission (→ owner inbox)",
    payload: {
      from: EMAIL_FROM,
      to: OWNER_EMAIL,
      subject: "[TEST] New contact submission TEST-001",
      html: `
        <div style="font-family:Georgia,serif;color:#18212a;max-width:620px;margin:0 auto;line-height:1.6">
          <h2>New Contact Submission (TEST)</h2>
          <p><strong>Submission ID:</strong> TEST-001</p>
          <p><strong>Name:</strong> David Travers</p>
          <p><strong>Email:</strong> ${CUSTOMER_EMAIL}</p>
          <p><strong>Phone:</strong> (315) 555-0100</p>
          <p><strong>Message:</strong></p>
          <p>This is a test contact submission from the email delivery check script.</p>
          <p style="color:#64748b;font-size:13px">This is a <strong>test email</strong>.</p>
        </div>
      `,
    },
  },

  // 7. Password reset → customer
  {
    name: "Password reset (→ customer)",
    payload: {
      from: EMAIL_FROM,
      to: CUSTOMER_EMAIL,
      subject: "[TEST] Reset your Zaine's Stay & Play password",
      html: `
        <div style="font-family:Georgia,serif;color:#18212a;max-width:620px;margin:0 auto;line-height:1.6">
          <h1>Secure password reset (TEST)</h1>
          <p style="color:#4e5a67">Hi David, we received a request to reset your account password.</p>
          <p><a href="https://zainesstayandplay.com/auth/reset-password?token=test-token-abc123" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px">Reset Password</a></p>
          <p style="color:#4e5a67">This link expires in 30 minutes. If you did not request this, you can safely ignore this email.</p>
          <p style="font-size:13px;color:#4e5a67">This is a <strong>test email</strong> from the email delivery check.</p>
        </div>
      `,
    },
  },

  // 8. Booking claim → customer
  {
    name: "Booking claim notification (→ customer)",
    payload: {
      from: EMAIL_FROM,
      to: CUSTOMER_EMAIL,
      subject: "[TEST] Claim booking PB-20260622-0001 in your dashboard",
      html: `
        <div style="font-family:Georgia,serif;color:#18212a;max-width:620px;margin:0 auto;line-height:1.6">
          <h1>Claim your booking access (TEST)</h1>
          <p style="color:#4e5a67">Hi David, claim booking <strong>PB-20260622-0001</strong> to manage updates, pet details, and future reservations.</p>
          <p><a href="https://zainesstayandplay.com/claim?token=test-claim-token-abc123" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px">Claim Booking Access</a></p>
          <p style="color:#4e5a67">This secure claim link expires in 48 hours.</p>
          <p style="font-size:13px;color:#64748b">This is a <strong>test email</strong> from the email delivery check.</p>
        </div>
      `,
    },
  },

  // 9. Welcome email → customer
  {
    name: "Welcome email (→ customer)",
    payload: {
      from: EMAIL_FROM,
      to: CUSTOMER_EMAIL,
      subject: "[TEST] Welcome to Zaine's Stay & Play!",
      html: `
        <div style="font-family:Georgia,serif;color:#18212a;max-width:620px;margin:0 auto;line-height:1.6">
          <h1 style="color:#059669">Welcome to Zaine's Stay &amp; Play! (TEST)</h1>
          <p>Hi <strong>David</strong>, we're so excited to welcome you and your furry family to our community.</p>
          <p>You can now sign in to your dashboard to manage bookings, view pet profiles, and stay up to date.</p>
          <p style="font-size:13px;color:#64748b;text-align:center">This is a <strong>test email</strong> from the email delivery check.</p>
        </div>
      `,
    },
  },

  // 10. Report card → customer
  {
    name: "Report card notification (→ customer)",
    payload: {
      from: EMAIL_FROM,
      to: CUSTOMER_EMAIL,
      subject: "[TEST] Report card ready for Buddy",
      html: `
        <div style="font-family:Georgia,serif;color:#18212a;max-width:620px;margin:0 auto;line-height:1.6">
          <h2>Report Card Ready (TEST)</h2>
          <p>Hi <strong>David</strong>,</p>
          <p>Buddy has a new report card available for booking <strong>PB-20260622-0001</strong>.</p>
          <p>Sign in to your dashboard to review today's updates.</p>
          <p style="font-size:13px;color:#64748b;text-align:center">This is a <strong>test email</strong> from the email delivery check.</p>
        </div>
      `,
    },
  },

  // 11. Incident notification → customer
  {
    name: "Incident notification (→ customer)",
    payload: {
      from: EMAIL_FROM,
      to: CUSTOMER_EMAIL,
      subject: "[TEST] Important update about Buddy",
      html: `
        <div style="font-family:Georgia,serif;color:#18212a;max-width:620px;margin:0 auto;line-height:1.6">
          <h2 style="color:#dc2626">Important Update (TEST)</h2>
          <p>Hi <strong>David</strong>,</p>
          <p>We logged an important incident update for <strong>Buddy</strong> during booking <strong>PB-20260622-0001</strong>.</p>
          <p>Please contact the front desk or review your dashboard for the latest details.</p>
          <p style="font-size:13px;color:#64748b;text-align:center">This is a <strong>test email</strong> from the email delivery check.</p>
        </div>
      `,
    },
  },

  // 12. Booking reminder → customer
  {
    name: "Booking reminder (→ customer)",
    payload: {
      from: EMAIL_FROM,
      to: CUSTOMER_EMAIL,
      subject: "[TEST] Reminder: Buddy's stay starts in 3 days",
      html: `
        <div style="font-family:Georgia,serif;color:#18212a;max-width:620px;margin:0 auto;line-height:1.6">
          <h2>Upcoming Stay Reminder (TEST)</h2>
          <p>Hi <strong>David</strong>,</p>
          <p>Just a friendly reminder that <strong>Buddy's</strong> stay at Zaine's Stay &amp; Play begins in <strong>3 days</strong> on <strong>Mon, Jul 7, 2026</strong>.</p>
          <p>Drop-off is at <strong>8:00 AM – 10:00 AM</strong>. We look forward to seeing you!</p>
          <p style="font-size:13px;color:#64748b;text-align:center">This is a <strong>test email</strong> from the email delivery check.</p>
        </div>
      `,
    },
  },

  // 13. Photo digest → customer
  {
    name: "Daily photo digest (→ customer)",
    payload: {
      from: EMAIL_FROM,
      to: CUSTOMER_EMAIL,
      subject: "[TEST] Buddy's Daily Photos - Jun 22, 2026",
      html: `
        <div style="font-family:Georgia,serif;color:#18212a;max-width:620px;margin:0 auto;line-height:1.6">
          <h2>Buddy's Daily Photos (TEST)</h2>
          <p>Hi <strong>David</strong>, here are today's photos of <strong>Buddy</strong> from Jun 22, 2026.</p>
          <div style="background:#f8fafc;border-radius:8px;padding:20px;margin:16px 0;text-align:center">
            <p style="color:#64748b;font-style:italic">[Photo placeholders — real digest would include embedded images]</p>
            <p><strong>Morning Playtime</strong> — 9:15 AM</p>
            <p><strong>Nap Time</strong> — 1:30 PM</p>
          </div>
          <p style="font-size:13px;color:#64748b;text-align:center">This is a <strong>test email</strong> from the email delivery check.</p>
        </div>
      `,
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n${COLORS.bold}Zaine's Email Delivery Test${COLORS.reset}`);
  console.log("─".repeat(50));

  // Pre-flight checks
  header("Pre-flight checks");
  if (!WORKER_URL) {
    fail("EMAIL_WORKER_URL is not set");
    process.exit(1);
  }
  if (!WORKER_SECRET) {
    fail("EMAIL_WORKER_SECRET is not set");
    process.exit(1);
  }
  info(`Worker URL: ${WORKER_URL}`);
  info(`From: ${EMAIL_FROM}`);
  info(`Customer email: ${CUSTOMER_EMAIL}`);
  info(`Owner email: ${OWNER_EMAIL}`);

  // Health check
  header("Worker health check");
  try {
    const healthRes = await fetch(WORKER_URL);
    const healthJson = (await healthRes.json().catch(() => null)) as Record<string, unknown> | null;
    if (healthRes.ok && healthJson?.status === "ok") {
      ok(`Worker is healthy — ${healthJson.service} v${healthJson.version}`);
    } else {
      fail(`Worker returned unexpected response: ${JSON.stringify(healthJson)}`);
      process.exit(1);
    }
  } catch (err) {
    fail(`Cannot reach worker: ${err}`);
    process.exit(1);
  }

  // Send all test emails
  header(`Sending ${TESTS.length} test emails`);

  const results: { name: string; success: boolean; messageId?: string; error?: string }[] = [];

  for (const test of TESTS) {
    process.stdout.write(`  ${test.name} ... `);
    try {
      const result = await sendViaWorker(test.payload);
      if (result.ok) {
        console.log(`${COLORS.green}sent${COLORS.reset} (id: ${result.messageId ?? "n/a"})`);
        results.push({ name: test.name, success: true, messageId: result.messageId });
      } else {
        console.log(`${COLORS.red}FAILED${COLORS.reset}: ${result.error}`);
        results.push({ name: test.name, success: false, error: result.error });
      }
    } catch (err) {
      console.log(`${COLORS.red}ERROR${COLORS.reset}: ${err}`);
      results.push({ name: test.name, success: false, error: String(err) });
    }
    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  // Summary
  header("Summary");
  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`  Sent: ${COLORS.green}${passed}${COLORS.reset} / ${TESTS.length}`);
  if (failed > 0) {
    console.log(`  Failed: ${COLORS.red}${failed}${COLORS.reset}`);
    for (const r of results.filter((r) => !r.success)) {
      console.log(`    ${COLORS.red}✗${COLORS.reset} ${r.name}: ${r.error}`);
    }
  }

  console.log(`\n  Customer emails → ${COLORS.cyan}${CUSTOMER_EMAIL}${COLORS.reset}`);
  console.log(`  Owner emails    → ${COLORS.cyan}${OWNER_EMAIL}${COLORS.reset}`);
  console.log(`\n  Check both inboxes for emails with subject prefix ${COLORS.bold}[TEST]${COLORS.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

void main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
