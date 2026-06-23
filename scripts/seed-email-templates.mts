import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { createElement } from "react";
import { render } from "@react-email/components";

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

async function renderTemplate(component: unknown, props: Record<string, unknown>): Promise<string> {
  return render(createElement(component as React.ComponentType<Record<string, unknown>>, props));
}

// Import templates
const { BookingConfirmation } = await import("../src/emails/BookingConfirmation.js");
const { WelcomeEmail } = await import("../src/emails/WelcomeEmail.js");
const { PhotoDigest } = await import("../src/emails/PhotoDigest.js");
const { PaymentReceipt } = await import("../src/emails/PaymentReceipt.js");
const { VaccineExpiryReminder } = await import("../src/emails/VaccineExpiryReminder.js");
const { PasswordReset } = await import("../src/emails/PasswordReset.js");
const { BookingClaim } = await import("../src/emails/BookingClaim.js");
const { OwnerNotification } = await import("../src/emails/OwnerNotification.js");
const { IncidentNotification } = await import("../src/emails/IncidentNotification.js");
const { ReportCard } = await import("../src/emails/ReportCard.js");
const { AutomatedReminder } = await import("../src/emails/AutomatedReminder.js");

const templates = [
  {
    type: "booking_confirmation",
    name: "Booking Confirmation",
    subject: "Booking {{bookingNumber}} confirmed",
    component: BookingConfirmation,
    props: {
      customerName: "Sarah Johnson",
      bookingNumber: "PB-20260622-0001",
      petNames: ["Buddy"],
      checkInDate: "2026-06-25",
      checkOutDate: "2026-06-28",
      suiteType: "Deluxe Suite",
      suitePrice: 85,
      nights: 3,
      subtotal: 255,
      tax: 0,
      total: 255,
    },
  },
  {
    type: "welcome_email",
    name: "Welcome Email",
    subject: "Welcome to Zaine's Stay & Play!",
    component: WelcomeEmail,
    props: { customerName: "Sarah" },
  },
  {
    type: "photo_digest",
    name: "Photo Digest",
    subject: "{{petName}}'s Daily Photos — {{date}}",
    component: PhotoDigest,
    props: {
      customerName: "Sarah",
      petName: "Buddy",
      date: new Date().toISOString(),
      photos: [
        { url: "https://placehold.co/280x200/dbeafe/3b82f6?text=Morning+Play", caption: "Morning playtime", timestamp: new Date().toISOString() },
        { url: "https://placehold.co/280x200/dcfce7/16a34a?text=Afternoon+Nap", caption: "Afternoon nap", timestamp: new Date().toISOString() },
      ],
    },
  },
  {
    type: "payment_notification",
    name: "Payment Receipt",
    subject: "Payment receipt for booking {{bookingNumber}}",
    component: PaymentReceipt,
    props: {
      customerName: "Sarah Johnson",
      receiptNumber: "RCT-20260622-0001",
      paymentDate: new Date().toISOString(),
      bookingNumber: "PB-20260622-0001",
      paymentMethod: "Visa",
      lastFourDigits: "4242",
      items: [{ description: "Deluxe Suite — 3 nights", quantity: 3, unitPrice: 85, total: 255 }],
      subtotal: 255,
      tax: 0,
      total: 255,
    },
  },
  {
    type: "vaccine_expiry_reminder",
    name: "Vaccine Expiry Reminder",
    subject: "{{petName}}'s {{vaccineType}} expires soon",
    component: VaccineExpiryReminder,
    props: {
      customerName: "Sarah",
      petName: "Buddy",
      vaccineType: "Rabies",
      expiryDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      daysUntilExpiry: 7,
    },
  },
  {
    type: "password_reset_notification",
    name: "Password Reset",
    subject: "Reset your Zaine's Stay & Play password",
    component: PasswordReset,
    props: { firstName: "Sarah", resetUrl: "https://zainesstayandplay.com/reset-password?token=mock", expiryMinutes: 60 },
  },
  {
    type: "booking_claim_notification",
    name: "Booking Claim",
    subject: "Claim booking {{bookingNumber}} in your dashboard",
    component: BookingClaim,
    props: { firstName: "Sarah", bookingNumber: "PB-20260622-0001", claimUrl: "https://zainesstayandplay.com/claim?token=mock", expiryHours: 48 },
  },
  {
    type: "owner_booking_notification",
    name: "Owner Booking Notification",
    subject: "New Booking: {{bookingNumber}} — {{petNames}}",
    component: OwnerNotification,
    props: {
      bookingNumber: "PB-20260622-0001",
      customerName: "Sarah Johnson",
      customerEmail: "sarah@example.com",
      petNames: ["Buddy"],
      checkInDate: "June 25, 2026",
      checkOutDate: "June 28, 2026",
      suiteType: "Deluxe Suite",
      total: "$255.00",
      detailsUrl: "https://zainesstayandplay.com/admin/bookings/mock-id",
    },
  },
  {
    type: "incident_notification",
    name: "Incident Notification",
    subject: "Important update about {{petName}}",
    component: IncidentNotification,
    props: {
      customerName: "Sarah",
      petName: "Buddy",
      summary: "Buddy had a minor scrape on his paw during playtime. We have treated it and he is comfortable.",
      dashboardUrl: "https://zainesstayandplay.com/dashboard",
    },
  },
  {
    type: "report_card_notification",
    name: "Report Card",
    subject: "Report card ready for {{petName}}",
    component: ReportCard,
    props: {
      customerName: "Sarah",
      petName: "Buddy",
      highlights: ["Ate all meals with great enthusiasm", "Played well with the group", "Slept through the night"],
      dashboardUrl: "https://zainesstayandplay.com/dashboard",
    },
  },
  {
    type: "automated_reminder",
    name: "Automated Reminder",
    subject: "Reminder: {{petName}}'s stay starts soon",
    component: AutomatedReminder,
    props: {
      customerName: "Sarah",
      petName: "Buddy",
      reminderType: "check_in",
      checkInDate: "June 25, 2026",
      dashboardUrl: "https://zainesstayandplay.com/dashboard",
    },
  },
  {
    type: "contact_submission_notification",
    name: "Contact Form Notification",
    subject: "New contact form submission from {{name}}",
    html: `<div style="font-family:Georgia,serif;color:#18212a;max-width:620px;margin:0 auto;padding:32px;">
<h2 style="color:#18212a;margin:0 0 16px">New Contact Submission</h2>
<p style="color:#374151;margin:0 0 8px"><strong>Name:</strong> {{name}}</p>
<p style="color:#374151;margin:0 0 8px"><strong>Email:</strong> {{email}}</p>
<p style="color:#374151;margin:0 0 8px"><strong>Phone:</strong> {{phone}}</p>
<p style="color:#374151;margin:0 0 16px"><strong>Message:</strong></p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;color:#374151;">{{message}}</div>
</div>`,
  },
];

let upserted = 0;
for (const t of templates) {
  const html = "html" in t && t.html
    ? t.html
    : await renderTemplate(t.component!, t.props!);

  await prisma.emailTemplate.upsert({
    where: { type: t.type },
    update: {}, // never overwrite admin edits
    create: {
      type: t.type,
      name: t.name,
      subject: t.subject,
      html,
      isSystem: true,
      isEnabled: true,
    },
  });
  upserted++;
  console.log(`  ✓ ${t.type}: ${t.name}`);
}

console.log(`\nUpserted ${upserted} email templates`);
await prisma.$disconnect();
await pool.end();
