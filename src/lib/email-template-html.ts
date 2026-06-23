/**
 * Branded email template generators with {{variable}} placeholders.
 * Used by the seed script and the "Reset to Default" route so admins
 * can fill in real values at compose time.
 */

const C = {
  primary: "#3b82f6",
  dark: "#1e3a5f",
  text: "#18212a",
  muted: "#64748b",
  bg: "#f8fafc",
  border: "#e2e8f0",
};

function wrap(heading: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#eef2f7">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<div style="font-family:Georgia,serif;color:${C.text};line-height:1.65;max-width:620px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.10)">
  <div style="background:${C.dark};padding:20px 32px">
    <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-.3px">Zaine&#x27;s Stay &amp; Play</span>
  </div>
  <div style="padding:32px">
    <h1 style="font-size:21px;font-weight:700;color:${C.dark};margin:0 0 18px;line-height:1.3">${heading}</h1>
    ${body}
    <div style="border-top:1px solid ${C.border};margin-top:36px;padding-top:16px">
      <p style="font-size:12px;color:${C.muted};margin:0;line-height:1.9">
        Zaine&#x27;s Stay &amp; Play &bull; (315)&nbsp;765-7297 &bull; info@zainesstayandplay.com<br>
        If you have questions, reply to this email or call us anytime.
      </p>
    </div>
  </div>
</div>
</td></tr></table>
</body></html>`;
}

function btn(href: string, label: string): string {
  return `<p style="text-align:center;margin:28px 0 4px"><a href="${href}" style="background:${C.primary};color:#fff;text-decoration:none;padding:13px 32px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;line-height:1">${label}</a></p>`;
}

function row(label: string, value: string, bold = false): string {
  const s = bold ? "font-weight:700;color:#111;" : `color:${C.muted};`;
  return `<tr><td style="padding:9px 0;font-size:14px;${s}border-bottom:1px solid ${C.border}">${label}</td><td style="padding:9px 0;text-align:right;font-size:14px;${s}border-bottom:1px solid ${C.border}">${value}</td></tr>`;
}

function tbl(...rows: string[]): string {
  return `<table style="width:100%;border-collapse:collapse;margin:20px 0">${rows.join("")}</table>`;
}

export type TemplateContent = { subject: string; html: string };

const generators: Record<string, () => TemplateContent> = {
  booking_confirmation: () => ({
    subject: "Booking {{bookingNumber}} confirmed — {{petNames}}",
    html: wrap("Your booking is confirmed! 🐾", `
<p>Hi <strong>{{customerName}}</strong>,</p>
<p>Great news — your reservation at Zaine&#x27;s Stay &amp; Play is confirmed. Your furry family member is all set for a wonderful stay!</p>
${tbl(
  row("Booking #", "<strong>{{bookingNumber}}</strong>"),
  row("Pet(s)", "{{petNames}}"),
  row("Suite", "{{suiteType}}"),
  row("Check-In", "{{checkInDate}}"),
  row("Check-Out", "{{checkOutDate}}"),
  row("Nights", "{{nights}}"),
  row("Subtotal", "{{subtotal}}"),
  row("Tax", "{{tax}}"),
  row("Total Charged", "{{total}}", true),
)}
<p style="font-size:14px;color:${C.muted}">Questions? Reply to this email or call (315) 765-7297.</p>
${btn("https://zainesstayandplay.com/dashboard", "View Booking Details")}
`),
  }),

  welcome_email: () => ({
    subject: "Welcome to Zaine's Stay & Play, {{customerName}}!",
    html: wrap("Welcome to the family! 🐾", `
<p>Hi <strong>{{customerName}}</strong>,</p>
<p>We&#x27;re so excited to welcome you and your pup to Zaine&#x27;s Stay &amp; Play! Your account is ready and you can start managing bookings, pet profiles, and more from your dashboard.</p>
<p><strong>What you can do:</strong></p>
<ul style="padding-left:20px;line-height:2;font-size:15px">
  <li>Book boarding, daycare, or grooming</li>
  <li>View daily photo updates during your pet&#x27;s stay</li>
  <li>Access report cards and vet documents</li>
  <li>Manage upcoming and past reservations</li>
</ul>
${btn("https://zainesstayandplay.com/dashboard", "Go to My Dashboard")}
<p style="font-size:14px;color:${C.muted};text-align:center">We can&#x27;t wait to meet your pup!</p>
`),
  }),

  photo_digest: () => ({
    subject: "{{petName}}'s daily photos — {{date}}",
    html: wrap("{{petName}}'s daily photo update 📸", `
<p>Hi <strong>{{customerName}}</strong>,</p>
<p>Here&#x27;s a peek at <strong>{{petName}}</strong>&#x27;s day at Zaine&#x27;s Stay &amp; Play on <strong>{{date}}</strong>. We hope these photos brighten your day!</p>
<div style="background:${C.bg};border-radius:8px;padding:16px;margin:20px 0;text-align:center;color:${C.muted};font-size:14px">
  <em>Photos for this update are available in your dashboard.</em>
</div>
${btn("https://zainesstayandplay.com/dashboard", "View All Photos")}
<p style="font-size:14px;color:${C.muted};text-align:center">{{petName}} is having a great time — we look forward to seeing you at pickup!</p>
`),
  }),

  payment_notification: () => ({
    subject: "Payment received — booking {{bookingNumber}}",
    html: wrap("Payment received ✓", `
<p>Hi <strong>{{customerName}}</strong>,</p>
<p>We&#x27;ve received your payment for booking <strong>{{bookingNumber}}</strong>. Here&#x27;s your receipt:</p>
${tbl(
  row("Booking #", "{{bookingNumber}}"),
  row("Receipt #", "{{receiptNumber}}"),
  row("Payment Date", "{{paymentDate}}"),
  row("Method", "{{paymentMethod}} ending {{lastFourDigits}}"),
  row("Amount Paid", "{{total}}", true),
)}
<p style="font-size:14px;color:${C.muted}">Keep this as your receipt. Questions about your payment? Reply here or call (315) 765-7297.</p>
${btn("https://zainesstayandplay.com/dashboard", "View Booking")}
`),
  }),

  vaccine_expiry_reminder: () => ({
    subject: "{{petName}}'s {{vaccineType}} expires in {{daysUntilExpiry}} days",
    html: wrap("Vaccine expiring soon — action needed", `
<p>Hi <strong>{{customerName}}</strong>,</p>
<p>This is a friendly reminder that <strong>{{petName}}</strong>&#x27;s <strong>{{vaccineType}}</strong> vaccine is expiring soon.</p>
${tbl(
  row("Pet", "{{petName}}"),
  row("Vaccine", "{{vaccineType}}"),
  row("Expiry Date", "<strong>{{expiryDate}}</strong>"),
  row("Days Remaining", "{{daysUntilExpiry}} days"),
)}
<p>Up-to-date vaccines are required for all stays. Please visit your vet and upload the updated record before your next booking.</p>
${btn("https://zainesstayandplay.com/dashboard/pets", "Upload Vaccine Record")}
<p style="font-size:14px;color:${C.muted}">Thank you for helping keep all our guests safe and healthy!</p>
`),
  }),

  password_reset_notification: () => ({
    subject: "Reset your Zaine's Stay & Play password",
    html: wrap("Password reset request", `
<p>Hi <strong>{{firstName}}</strong>,</p>
<p>We received a request to reset your password. Click below to choose a new one. This link expires in <strong>{{expiryMinutes}} minutes</strong>.</p>
${btn("{{resetUrl}}", "Reset My Password")}
<p style="font-size:14px;color:${C.muted};text-align:center">If you didn&#x27;t request this, you can safely ignore this email — your password won&#x27;t change.</p>
<div style="background:${C.bg};border-radius:8px;padding:12px 16px;margin-top:20px">
  <p style="font-size:12px;color:${C.muted};margin:0">If the button doesn&#x27;t work, copy this link:<br><span style="color:${C.primary};word-break:break-all">{{resetUrl}}</span></p>
</div>
`),
  }),

  booking_claim_notification: () => ({
    subject: "Claim booking {{bookingNumber}} in your dashboard",
    html: wrap("Claim your booking access", `
<p>Hi <strong>{{firstName}}</strong>,</p>
<p>A booking was made for you — <strong>{{bookingNumber}}</strong>. Claim it to manage your pet&#x27;s stay, receive updates, and book again in the future.</p>
${btn("{{claimUrl}}", "Claim My Booking")}
<p style="font-size:14px;color:${C.muted};text-align:center">This secure link expires in <strong>{{expiryHours}} hours</strong>.</p>
<div style="background:${C.bg};border-radius:8px;padding:12px 16px;margin-top:20px">
  <p style="font-size:12px;color:${C.muted};margin:0">If the button doesn&#x27;t work, copy this link:<br><span style="color:${C.primary};word-break:break-all">{{claimUrl}}</span></p>
</div>
`),
  }),

  owner_booking_notification: () => ({
    subject: "New Booking: {{bookingNumber}} — {{petNames}}",
    html: wrap("New booking received 🎉", `
<p>A new booking has been confirmed and paid.</p>
${tbl(
  row("Booking #", "<strong>{{bookingNumber}}</strong>"),
  row("Pet(s)", "{{petNames}}"),
  row("Suite", "{{suiteType}}"),
  row("Check-In", "{{checkInDate}}"),
  row("Check-Out", "{{checkOutDate}}"),
  row("Total", "<strong>{{total}}</strong>"),
)}
<p style="font-weight:600;margin:4px 0 0">Customer</p>
${tbl(
  row("Name", "{{customerName}}"),
  row("Email", '<a href="mailto:{{customerEmail}}" style="color:#3b82f6">{{customerEmail}}</a>'),
)}
${btn("{{detailsUrl}}", "View Full Booking")}
`),
  }),

  incident_notification: () => ({
    subject: "Important update about {{petName}}",
    html: wrap("Important update about {{petName}}", `
<p>Hi <strong>{{customerName}}</strong>,</p>
<p>We want to keep you informed about a situation that occurred during <strong>{{petName}}</strong>&#x27;s stay.</p>
<div style="background:#fef3c7;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:16px 20px;margin:20px 0">
  <p style="margin:0;font-size:14px;color:#78350f">{{summary}}</p>
</div>
<p>Your pet&#x27;s comfort and safety are our top priority. We have taken appropriate steps to ensure {{petName}} is comfortable and well cared for.</p>
<p>Please don&#x27;t hesitate to reach out — reply to this email or call us at (315) 765-7297.</p>
${btn("https://zainesstayandplay.com/dashboard", "View Dashboard")}
`),
  }),

  report_card_notification: () => ({
    subject: "{{petName}}'s report card is ready",
    html: wrap("{{petName}}'s report card 📋", `
<p>Hi <strong>{{customerName}}</strong>,</p>
<p>Great news — <strong>{{petName}}</strong> had a fantastic day and their report card is ready to view!</p>
<div style="background:${C.bg};border-radius:8px;padding:20px;margin:20px 0">
  <p style="font-weight:700;margin:0 0 10px;color:${C.dark}">Today&#x27;s highlights:</p>
  <p style="margin:0;white-space:pre-line;font-size:14px;color:${C.text}">{{highlights}}</p>
</div>
<p style="font-size:14px;color:${C.muted}">Log in to see photos, notes, and the full report.</p>
${btn("https://zainesstayandplay.com/dashboard", "View Full Report Card")}
`),
  }),

  automated_reminder: () => ({
    subject: "Reminder: {{petName}}'s upcoming stay",
    html: wrap("Don't forget — {{petName}}'s stay is coming up!", `
<p>Hi <strong>{{customerName}}</strong>,</p>
<p>This is a friendly reminder about <strong>{{petName}}</strong>&#x27;s upcoming stay at Zaine&#x27;s Stay &amp; Play.</p>
${tbl(
  row("Pet", "{{petName}}"),
  row("Check-In", "<strong>{{checkInDate}}</strong>"),
  row("Reminder", "{{reminderType}}"),
)}
<p>Please make sure the following are ready before check-in:</p>
<ul style="padding-left:20px;line-height:2;font-size:14px">
  <li>Up-to-date vaccine records uploaded to your dashboard</li>
  <li>Emergency contact information is current</li>
  <li>Any special instructions for our team are noted</li>
</ul>
${btn("https://zainesstayandplay.com/dashboard", "Manage Booking")}
<p style="font-size:14px;color:${C.muted};text-align:center">We look forward to welcoming {{petName}}!</p>
`),
  }),

  contact_submission_notification: () => ({
    subject: "New contact form submission from {{name}}",
    html: wrap("New contact form submission", `
<p>A visitor submitted the contact form on zainesstayandplay.com.</p>
${tbl(
  row("Name", "{{name}}"),
  row("Email", '<a href="mailto:{{email}}" style="color:#3b82f6">{{email}}</a>'),
  row("Phone", "{{phone}}"),
)}
<div style="background:${C.bg};border-radius:8px;padding:16px 20px;margin:16px 0">
  <p style="font-weight:700;margin:0 0 8px;font-size:14px;color:${C.dark}">Message:</p>
  <p style="margin:0;font-size:14px;color:${C.text};white-space:pre-line">{{message}}</p>
</div>
<p style="font-size:14px;color:${C.muted}">Reply directly to this email to respond to <strong>{{name}}</strong>.</p>
`),
  }),
};

export function generateTemplateContent(type: string): TemplateContent | null {
  return generators[type]?.() ?? null;
}

export function getAllTemplateTypes(): Array<{ type: string; name: string; subject: string; html: string }> {
  const names: Record<string, string> = {
    booking_confirmation: "Booking Confirmation",
    welcome_email: "Welcome Email",
    photo_digest: "Photo Digest",
    payment_notification: "Payment Receipt",
    vaccine_expiry_reminder: "Vaccine Expiry Reminder",
    password_reset_notification: "Password Reset",
    booking_claim_notification: "Booking Claim",
    owner_booking_notification: "Owner Booking Notification",
    incident_notification: "Incident Notification",
    report_card_notification: "Report Card",
    automated_reminder: "Automated Reminder",
    contact_submission_notification: "Contact Form Notification",
  };
  return Object.entries(generators).map(([type, gen]) => ({
    type,
    name: names[type] ?? type,
    ...gen(),
  }));
}
