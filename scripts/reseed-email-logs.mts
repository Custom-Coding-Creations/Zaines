/**
 * Re-seeds the 13 test EmailLog records with real template HTML instead of placeholder text.
 * Run with: npx tsx scripts/reseed-email-logs.mts
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync } from "fs";

for (const line of readFileSync(".env", "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  let val = t.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  process.env[t.slice(0, eq).trim()] = val;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BASE = `font-family: Georgia, serif; color: #18212a; line-height: 1.6; max-width: 620px; margin: 0 auto;`;
const MUTED = `color: #4e5a67;`;
const BTN = `display: inline-block; background: #111827; color: #fff; text-decoration: none; padding: 10px 14px; border-radius: 8px;`;
const CARD = `background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;`;
const TABLE = `width: 100%; border-collapse: collapse;`;
const TD_L = `padding: 8px 0; color: #64748b; font-weight: 600;`;
const TD_R = `padding: 8px 0; text-align: right;`;

const from = "info@zainesstayandplay.com";

const emails: Array<{
  resendId: string;
  type: string;
  toAddress: string;
  subject: string;
  html: string;
  status: string;
}> = [
  // booking_confirmation — uses React Email template (rendered inline equivalent)
  {
    resendId: "77a0a582-9a50-45cd-90b2-e2439d807d89",
    type: "booking_confirmation",
    toAddress: "davidtraversmailbox@gmail.com",
    subject: "[TEST] Booking PB-20260622-0001 confirmation",
    status: "sent",
    html: `<div style="${BASE}">
      <h1 style="margin-bottom: 8px;">Booking Confirmed!</h1>
      <p style="${MUTED}">Hi David, your booking is confirmed. Here's a summary:</p>
      <div style="${CARD}">
        <table style="${TABLE}">
          <tr><td style="${TD_L}">Booking #:</td><td style="${TD_R}">PB-20260622-0001</td></tr>
          <tr><td style="${TD_L}">Pet(s):</td><td style="${TD_R}">Buddy</td></tr>
          <tr><td style="${TD_L}">Check-In:</td><td style="${TD_R}">Jun 25, 2026 — 7:00 AM</td></tr>
          <tr><td style="${TD_L}">Check-Out:</td><td style="${TD_R}">Jun 28, 2026 — 7:00 AM</td></tr>
          <tr><td style="${TD_L}">Suite:</td><td style="${TD_R}">Standard Suite</td></tr>
          <tr><td style="border-top:1px solid #e2e8f0;${TD_L}">Total Paid:</td><td style="border-top:1px solid #e2e8f0;${TD_R};font-weight:700;">$147.00</td></tr>
        </table>
      </div>
      <p style="${MUTED}">Questions? Call us at (315) 765-7297 or reply to this email.</p>
      <p style="${MUTED};font-size:13px;">This is a test email from the delivery check.</p>
    </div>`,
  },

  // owner_booking_notification — uses inline template from notifications.ts
  {
    resendId: "89178ef4-ecce-4539-950f-c2104c719638",
    type: "owner_booking_notification",
    toAddress: "info@zainesstayandplay.com",
    subject: "[TEST] New Booking: PB-20260622-0001 - Buddy",
    status: "sent",
    html: `<div style="${BASE}">
      <h1 style="margin-bottom: 8px; color: #059669;">🎉 New Booking Received!</h1>
      <p style="${MUTED};font-size:16px;">A new booking has been confirmed and paid.</p>
      <div style="${CARD}">
        <h2 style="margin:0 0 16px;font-size:18px;">Booking Details</h2>
        <table style="${TABLE}">
          <tr><td style="${TD_L}">Booking Number:</td><td style="${TD_R}">PB-20260622-0001</td></tr>
          <tr><td style="${TD_L}">Check-In:</td><td style="${TD_R}">Jun 25, 2026</td></tr>
          <tr><td style="${TD_L}">Check-Out:</td><td style="${TD_R}">Jun 28, 2026</td></tr>
          <tr><td style="${TD_L}">Nights:</td><td style="${TD_R}">3</td></tr>
          <tr><td style="${TD_L}">Suite:</td><td style="${TD_R}">Standard Suite</td></tr>
          <tr><td style="${TD_L}">Pet(s):</td><td style="${TD_R}">Buddy</td></tr>
          <tr><td style="border-top:1px solid #e2e8f0;${TD_L}">Total:</td><td style="border-top:1px solid #e2e8f0;${TD_R};font-weight:700;font-size:18px;">$147.00</td></tr>
        </table>
      </div>
      <div style="background:#eff6ff;border-radius:8px;padding:20px;margin:20px 0;">
        <h2 style="margin:0 0 16px;font-size:18px;">Customer Information</h2>
        <table style="${TABLE}">
          <tr><td style="${TD_L}">Name:</td><td style="${TD_R}">David Travers</td></tr>
          <tr><td style="${TD_L}">Email:</td><td style="${TD_R}"><a href="mailto:davidtraversmailbox@gmail.com" style="color:#3b82f6;">davidtraversmailbox@gmail.com</a></td></tr>
          <tr><td style="${TD_L}">Phone:</td><td style="${TD_R}">(315) 555-0100</td></tr>
        </table>
      </div>
      <div style="background:#fef3c7;border-radius:8px;padding:20px;margin:20px 0;">
        <h2 style="margin:0 0 12px;font-size:18px;">Special Requests</h2>
        <p style="margin:0;color:#78350f;">Please make sure Buddy gets his evening medication at 6 PM.</p>
      </div>
      <p style="text-align:center;margin:24px 0;">
        <a href="#" style="${BTN};padding:12px 24px;font-weight:600;">View Full Booking Details</a>
      </p>
    </div>`,
  },

  // payment_notification — success
  {
    resendId: "a2678699-8cb2-4422-992e-7fa120e5ea12",
    type: "payment_notification",
    toAddress: "davidtraversmailbox@gmail.com",
    subject: "[TEST] Booking PB-20260622-0001 payment success",
    status: "sent",
    html: `<div style="${BASE}">
      <h1 style="margin-bottom:8px;color:#059669;">✓ Payment Confirmed</h1>
      <p style="${MUTED}">Your payment for booking <strong>PB-20260622-0001</strong> has been received successfully.</p>
      <div style="${CARD}">
        <table style="${TABLE}">
          <tr><td style="${TD_L}">Amount Paid:</td><td style="${TD_R};font-weight:700;">$147.00</td></tr>
          <tr><td style="${TD_L}">Status:</td><td style="${TD_R};color:#059669;font-weight:600;">Confirmed</td></tr>
        </table>
      </div>
      <p style="${MUTED}">Thank you for choosing Zaine's Stay &amp; Play!</p>
    </div>`,
  },

  // payment_notification — failure
  {
    resendId: "f78f3490-46d7-4b84-b3f9-d36e63f3fb34",
    type: "payment_notification",
    toAddress: "davidtraversmailbox@gmail.com",
    subject: "[TEST] Booking PB-20260622-0001 payment failed",
    status: "sent",
    html: `<div style="${BASE}">
      <h1 style="margin-bottom:8px;color:#dc2626;">Payment Not Processed</h1>
      <p style="${MUTED}">Your payment for booking <strong>PB-20260622-0001</strong> could not be completed.</p>
      <p>Please update your payment method and try again, or contact us at (315) 765-7297 for assistance.</p>
    </div>`,
  },

  // payment_notification — recovery link
  {
    resendId: "7ac8cd98-9801-490a-93c5-92dff87f1fdd",
    type: "payment_notification",
    toAddress: "davidtraversmailbox@gmail.com",
    subject: "[TEST] Complete payment for booking PB-20260622-0001",
    status: "sent",
    html: `<div style="${BASE}">
      <p>Hi David,</p>
      <p>Your booking <strong>PB-20260622-0001</strong> is waiting for payment confirmation.</p>
      <p><a href="#" style="${BTN}">Complete Your Payment</a></p>
      <p style="${MUTED}">If the button doesn't work, copy and paste this URL into your browser: https://zainesstayandplay.com/pay/example-token</p>
    </div>`,
  },

  // contact_submission_notification
  {
    resendId: "76f1b942-4b09-460f-bff2-5bf4ccee91fe",
    type: "contact_submission_notification",
    toAddress: "info@zainesstayandplay.com",
    subject: "[TEST] New contact submission TEST-001",
    status: "sent",
    html: `<div style="${BASE}">
      <p><strong>Submission ID:</strong> TEST-001</p>
      <p><strong>Name:</strong> David Travers</p>
      <p><strong>Email:</strong> davidtraversmailbox@gmail.com</p>
      <p><strong>Phone:</strong> (315) 555-0100</p>
      <p><strong>Message:</strong></p>
      <p>Hi, I'm interested in boarding my dog Buddy for a few nights next month. Could you let me know about availability and pricing?</p>
    </div>`,
  },

  // password_reset_notification
  {
    resendId: "11b59586-0499-40a2-bd0b-66f5a6c78e3d",
    type: "password_reset_notification",
    toAddress: "davidtraversmailbox@gmail.com",
    subject: "[TEST] Reset your Zaine's Stay & Play password",
    status: "sent",
    html: `<div style="${BASE}">
      <h1 style="margin-bottom:8px;">Secure password reset</h1>
      <p style="margin-top:0;${MUTED}">Hi David, we received a request to reset your account password.</p>
      <p><a href="#" style="${BTN}">Reset Password</a></p>
      <p style="${MUTED}">This link expires in 30 minutes. If you did not request this, you can safely ignore this email.</p>
      <p style="font-size:13px;${MUTED}">Need help? Contact our concierge team at (315) 765-7297.</p>
    </div>`,
  },

  // booking_claim_notification
  {
    resendId: "bf25aa1f-4968-4491-ab1e-e820b6a9cc7a",
    type: "booking_claim_notification",
    toAddress: "davidtraversmailbox@gmail.com",
    subject: "[TEST] Claim booking PB-20260622-0001 in your dashboard",
    status: "sent",
    html: `<div style="${BASE}">
      <h1 style="margin-bottom:8px;">Claim your booking access</h1>
      <p style="margin-top:0;${MUTED}">Hi David, claim booking <strong>PB-20260622-0001</strong> to manage updates, pet details, and future reservations.</p>
      <p><a href="#" style="${BTN}">Claim Booking Access</a></p>
      <p style="${MUTED}">This secure claim link expires in 48 hours.</p>
    </div>`,
  },

  // welcome_email — uses React Email render (representative equivalent)
  {
    resendId: "e3ac4c9f-2f6b-4130-aa3b-f0b226deb4b7",
    type: "welcome_email",
    toAddress: "davidtraversmailbox@gmail.com",
    subject: "[TEST] Welcome to Zaine's Stay & Play!",
    status: "sent",
    html: `<div style="${BASE}">
      <h1 style="margin-bottom:8px;">Welcome to Zaine's Stay &amp; Play! 🐾</h1>
      <p style="${MUTED}">Hi David, we're so happy to have you and Buddy as part of our family.</p>
      <p>Your account is all set. Here's what you can do next:</p>
      <ul style="${MUTED}">
        <li>Browse available dates and book a stay</li>
        <li>Add your pet's profile and vaccination records</li>
        <li>Set up emergency contacts</li>
      </ul>
      <p><a href="#" style="${BTN}">Go to Your Dashboard</a></p>
      <p style="${MUTED};font-size:13px;">Questions? Call (315) 765-7297 — we're here Mon–Fri 7:00–19:00, Sat–Sun 7:00–19:00.</p>
    </div>`,
  },

  // report_card_notification
  {
    resendId: "b3a3e5cb-4dbf-42df-92ce-0cb133065fa6",
    type: "report_card_notification",
    toAddress: "davidtraversmailbox@gmail.com",
    subject: "[TEST] Report card ready for Buddy",
    status: "sent",
    html: `<div style="${BASE}">
      <p>Hi David,</p>
      <p>Buddy has a new report card available for booking <strong>PB-20260622-0001</strong>.</p>
      <p>Sign in to your dashboard to review today's updates.</p>
    </div>`,
  },

  // incident_notification
  {
    resendId: "fe1a23a7-8185-43e9-b913-1ea1ac313ce3",
    type: "incident_notification",
    toAddress: "davidtraversmailbox@gmail.com",
    subject: "[TEST] Important update about Buddy",
    status: "sent",
    html: `<div style="${BASE}">
      <p>Hi David,</p>
      <p>We logged an important incident update for Buddy during booking <strong>PB-20260622-0001</strong>.</p>
      <p>Please contact the front desk or review your dashboard for the latest details.</p>
    </div>`,
  },

  // automated_reminder
  {
    resendId: "9af642bd-b43a-4c8a-82dd-03d2db8ee8f5",
    type: "automated_reminder",
    toAddress: "davidtraversmailbox@gmail.com",
    subject: "[TEST] Reminder: Buddy's stay starts in 3 days",
    status: "sent",
    html: `<div style="${BASE}">
      <h1 style="margin-bottom:8px;">Upcoming Stay Reminder</h1>
      <p style="${MUTED}">Hi David, just a friendly reminder that Buddy's stay at Zaine's Stay &amp; Play begins in <strong>3 days</strong>.</p>
      <div style="${CARD}">
        <table style="${TABLE}">
          <tr><td style="${TD_L}">Booking #:</td><td style="${TD_R}">PB-20260622-0001</td></tr>
          <tr><td style="${TD_L}">Check-In:</td><td style="${TD_R}">Jun 25, 2026 — 7:00 AM</td></tr>
          <tr><td style="${TD_L}">Pet(s):</td><td style="${TD_R}">Buddy</td></tr>
        </table>
      </div>
      <p style="${MUTED}">Please ensure vaccinations are up to date before check-in. See you soon!</p>
    </div>`,
  },

  // photo_digest — uses React Email render (representative equivalent)
  {
    resendId: "ad5fd68f-ace1-4880-874d-931b6d342bac",
    type: "photo_digest",
    toAddress: "davidtraversmailbox@gmail.com",
    subject: "[TEST] Buddy's Daily Photos - Jun 22, 2026",
    status: "sent",
    html: `<div style="${BASE}">
      <h1 style="margin-bottom:8px;">📸 Buddy's Daily Photos</h1>
      <p style="${MUTED}">Here are today's photos from Buddy's stay — Jun 22, 2026.</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin:16px 0;">
        <div style="background:#f1f5f9;border-radius:8px;width:180px;height:120px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px;">📷 Morning playtime</div>
        <div style="background:#f1f5f9;border-radius:8px;width:180px;height:120px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px;">📷 Afternoon nap</div>
        <div style="background:#f1f5f9;border-radius:8px;width:180px;height:120px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px;">📷 Evening walk</div>
      </div>
      <p><a href="#" style="${BTN}">View All Photos in Dashboard</a></p>
    </div>`,
  },
];

// Delete old placeholder records by resendId
const resendIds = emails.map((e) => e.resendId);
const deleted = await prisma.emailLog.deleteMany({
  where: { resendId: { in: resendIds } },
});
console.log(`Deleted ${deleted.count} placeholder records`);

// Re-insert with real HTML
let inserted = 0;
for (const e of emails) {
  await prisma.emailLog.create({
    data: {
      direction: "outbound",
      type: e.type,
      fromAddress: from,
      toAddress: e.toAddress,
      subject: e.subject,
      html: e.html,
      resendId: e.resendId,
      status: e.status,
      isRead: false,
      isStarred: false,
      isArchived: false,
    },
  });
  inserted++;
  console.log(`  ✓ ${e.type}`);
}

console.log(`\nRe-seeded ${inserted} emails with real template HTML`);
await prisma.$disconnect();
await pool.end();
