import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync } from "fs";

// Load .env
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

const seedEmails = [
  { type: "booking_confirmation", toAddress: "davidtraversmailbox@gmail.com", subject: "[TEST] Booking PB-20260622-0001 confirmation", status: "sent", resendId: "77a0a582-9a50-45cd-90b2-e2439d807d89" },
  { type: "owner_booking_notification", toAddress: "info@zainesstayandplay.com", subject: "[TEST] New Booking: PB-20260622-0001 - Buddy", status: "sent", resendId: "89178ef4-ecce-4539-950f-c2104c719638" },
  { type: "payment_notification", toAddress: "davidtraversmailbox@gmail.com", subject: "[TEST] Booking PB-20260622-0001 payment success", status: "sent", resendId: "a2678699-8cb2-4422-992e-7fa120e5ea12" },
  { type: "payment_notification", toAddress: "davidtraversmailbox@gmail.com", subject: "[TEST] Booking PB-20260622-0001 payment failed", status: "sent", resendId: "f78f3490-46d7-4b84-b3f9-d36e63f3fb34" },
  { type: "payment_notification", toAddress: "davidtraversmailbox@gmail.com", subject: "[TEST] Complete payment for booking PB-20260622-0001", status: "sent", resendId: "7ac8cd98-9801-490a-93c5-92dff87f1fdd" },
  { type: "contact_submission_notification", toAddress: "info@zainesstayandplay.com", subject: "[TEST] New contact submission TEST-001", status: "sent", resendId: "76f1b942-4b09-460f-bff2-5bf4ccee91fe" },
  { type: "password_reset_notification", toAddress: "davidtraversmailbox@gmail.com", subject: "[TEST] Reset your Zaine's Stay & Play password", status: "sent", resendId: "11b59586-0499-40a2-bd0b-66f5a6c78e3d" },
  { type: "booking_claim_notification", toAddress: "davidtraversmailbox@gmail.com", subject: "[TEST] Claim booking PB-20260622-0001 in your dashboard", status: "sent", resendId: "bf25aa1f-4968-4491-ab1e-e820b6a9cc7a" },
  { type: "welcome_email", toAddress: "davidtraversmailbox@gmail.com", subject: "[TEST] Welcome to Zaine's Stay & Play!", status: "sent", resendId: "e3ac4c9f-2f6b-4130-aa3b-f0b226deb4b7" },
  { type: "report_card_notification", toAddress: "davidtraversmailbox@gmail.com", subject: "[TEST] Report card ready for Buddy", status: "sent", resendId: "b3a3e5cb-4dbf-42df-92ce-0cb133065fa6" },
  { type: "incident_notification", toAddress: "davidtraversmailbox@gmail.com", subject: "[TEST] Important update about Buddy", status: "sent", resendId: "fe1a23a7-8185-43e9-b913-1ea1ac313ce3" },
  { type: "automated_reminder", toAddress: "davidtraversmailbox@gmail.com", subject: "[TEST] Reminder: Buddy's stay starts in 3 days", status: "sent", resendId: "9af642bd-b43a-4c8a-82dd-03d2db8ee8f5" },
  { type: "photo_digest", toAddress: "davidtraversmailbox@gmail.com", subject: "[TEST] Buddy's Daily Photos - Jun 22, 2026", status: "sent", resendId: "ad5fd68f-ace1-4880-874d-931b6d342bac" },
];

const from = "info@zainesstayandplay.com";
const html = "<p>(Test email — HTML body from delivery test run on 2026-06-22)</p>";

let inserted = 0;
for (const e of seedEmails) {
  await prisma.emailLog.create({
    data: {
      direction: "outbound",
      type: e.type,
      fromAddress: from,
      toAddress: e.toAddress,
      subject: e.subject,
      html,
      resendId: e.resendId,
      status: e.status,
      isRead: false,
      isStarred: false,
      isArchived: false,
    },
  });
  inserted++;
  console.log(`  ✓ ${e.type}: ${e.subject}`);
}

console.log(`\nSeeded ${inserted} emails into email_logs`);
await prisma.$disconnect();
await pool.end();
