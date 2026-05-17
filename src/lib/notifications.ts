import fs from "fs";
import path from "path";
import os from "os";
import { render } from "@react-email/render";
import BookingConfirmation from "@/emails/BookingConfirmation";
import PaymentReceipt from "@/emails/PaymentReceipt";
import WelcomeEmail from "@/emails/WelcomeEmail";
import PhotoDigest from "@/emails/PhotoDigest";
import { getAdminSettings, updateAdminSettings } from "@/lib/api/admin-settings";

// Use an explicit env override if provided, otherwise prefer a writable
// system temp directory (works on serverless platforms like Vercel).
const DEV_QUEUE_PATH = process.env.DEV_QUEUE_PATH
  ? path.resolve(process.env.DEV_QUEUE_PATH)
  : path.resolve(
      process.env.NODE_ENV === "production" ? os.tmpdir() : process.cwd(),
      "tmp",
      "email-queue.log",
    );
const MAX_RETRIES = 4;
const RETRY_BASE_MS = 250; // base backoff
let redisQueue: {
  add: (name: string, data: unknown, opts?: unknown) => Promise<unknown>;
} | null = null;

async function ensureQueueDir() {
  const dir = path.dirname(DEV_QUEUE_PATH);
  await fs.promises.mkdir(dir, { recursive: true });
}

async function appendToDevQueue(entry: unknown) {
  // If REDIS_URL is configured, push the entry to Redis queue for background processing
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    try {
      if (!redisQueue) {
        // dynamic import to avoid adding hard dependency at module load
        const { Queue } = await import("bullmq");
        // Type of Queue from bullmq is compatible with our minimal shape
        // @ts-expect-error - dynamic import types are not worth enforcing here
        redisQueue = new Queue("emailQueue", { connection: { url: redisUrl } });
      }

      if (redisQueue) {
        await redisQueue.add("email", { entry }, {
          attempts: 5,
          backoff: { type: "exponential", delay: 500 },
        } as unknown);
        return;
      }
    } catch {
      // fallthrough to file queue on error
    }
  }

  await ensureQueueDir();
  const line = JSON.stringify({ ts: new Date().toISOString(), entry }) + "\n";
  await fs.promises.appendFile(DEV_QUEUE_PATH, line, "utf8");
}

type SendResult = {
  sent: boolean;
  provider: "resend" | "dev-queue";
  detail?: unknown;
};

export type NotificationSendResult = SendResult & {
  sms?: {
    sent: boolean;
    provider:
      | "disabled"
      | "invalid-recipient"
      | "budget-paused"
      | "dev-log"
      | "twilio";
    detail?: unknown;
  };
};

function normalizePhoneNumber(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (value.trim().startsWith("+") && digits.length >= 10) {
    return `+${digits}`;
  }

  return null;
}

async function appendToDevSmsLog(entry: unknown) {
  await ensureQueueDir();
  const smsLogPath = path.resolve(path.dirname(DEV_QUEUE_PATH), "sms-queue.log");
  const line = JSON.stringify({ ts: new Date().toISOString(), entry }) + "\n";
  await fs.promises.appendFile(smsLogPath, line, "utf8");
}

async function sendSmsViaTwilio(payload: {
  to: string;
  from: string;
  body: string;
}): Promise<{ ok: boolean; json?: unknown }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error("Twilio credentials not configured");
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: payload.to,
        From: payload.from,
        Body: payload.body,
      }).toString(),
    },
  );

  const json = await response.json().catch(() => null);
  return { ok: response.ok, json };
}

export async function sendSmsNotification(payload: {
  to?: string | null;
  message: string;
  category:
    | "booking_confirmation"
    | "payment_success"
    | "payment_failure"
    | "report_card"
    | "incident"
    | "booking_reminder"
    | "pickup_reminder"
    | "rebook_nudge"
    | "vaccine_expiry"
    | "assessment_due";
  bookingId?: string;
}) {
  const settings = await getAdminSettings();
  if (!settings.smsSettings.enabled) {
    return {
      sent: false,
      provider: "disabled" as const,
      detail: "sms-disabled",
    };
  }

  const normalizedTo = normalizePhoneNumber(payload.to);
  if (!normalizedTo) {
    return {
      sent: false,
      provider: "invalid-recipient" as const,
      detail: "invalid-phone-number",
    };
  }

  const normalizedFrom = normalizePhoneNumber(settings.smsSettings.fromNumber);
  if (!normalizedFrom) {
    return {
      sent: false,
      provider: "invalid-recipient" as const,
      detail: "invalid-from-number",
    };
  }

  const { monthlyBudgetLimit, currentMonthSpend, budgetAlertThreshold, pauseWhenExceeded } =
    settings.smsBudgetSettings;
  const estimatedCost = 0.015;
  const projectedSpend = currentMonthSpend + estimatedCost;
  const thresholdAmount = monthlyBudgetLimit * (budgetAlertThreshold / 100);

  if (pauseWhenExceeded && projectedSpend > monthlyBudgetLimit) {
    return {
      sent: false,
      provider: "budget-paused" as const,
      detail: {
        currentMonthSpend,
        monthlyBudgetLimit,
      },
    };
  }

  const hasTwilioCredentials = Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN,
  );

  if (!hasTwilioCredentials) {
    await appendToDevSmsLog({
      ...payload,
      to: normalizedTo,
      from: normalizedFrom,
      projectedSpend,
      thresholdReached: projectedSpend >= thresholdAmount,
    });

    await updateAdminSettings({
      smsBudgetSettings: {
        ...settings.smsBudgetSettings,
        currentMonthSpend: Math.round(projectedSpend * 100) / 100,
      },
    });

    return {
      sent: false,
      provider: "dev-log" as const,
      detail: {
        thresholdReached: projectedSpend >= thresholdAmount,
      },
    };
  }

  const response = await sendSmsViaTwilio({
    to: normalizedTo,
    from: normalizedFrom,
    body: payload.message,
  });

  if (response.ok) {
    await updateAdminSettings({
      smsBudgetSettings: {
        ...settings.smsBudgetSettings,
        currentMonthSpend: Math.round(projectedSpend * 100) / 100,
      },
    });
  }

  return {
    sent: response.ok,
    provider: "twilio" as const,
    detail: response.json,
  };
}

export async function sendReminderNotification(payload: {
  channel: "email" | "sms";
  toEmail?: string | null;
  toPhone?: string | null;
  subject: string;
  html: string;
  text: string;
  category:
    | "booking_reminder"
    | "pickup_reminder"
    | "rebook_nudge"
    | "vaccine_expiry"
    | "assessment_due";
  bookingId?: string;
}): Promise<NotificationSendResult> {
  if (payload.channel === "sms") {
    const sms = await sendSmsNotification({
      to: payload.toPhone,
      message: payload.text,
      category: payload.category,
      bookingId: payload.bookingId,
    });

    return {
      sent: sms.sent,
      provider: "dev-queue",
      detail: payload.channel,
      sms,
    };
  }

  const from = process.env.EMAIL_FROM || "noreply@pawfectstays.com";
  const apiKey = process.env.RESEND_API_KEY;
  const to = payload.toEmail;

  if (!to) {
    return { sent: false, provider: "dev-queue", detail: "no-recipient" };
  }

  if (!apiKey) {
    await appendToDevQueue({
      type: "automated_reminder",
      to,
      from,
      subject: payload.subject,
      html: payload.html,
      category: payload.category,
      bookingId: payload.bookingId,
    });
    return { sent: false, provider: "dev-queue", detail: payload.category };
  }

  try {
    const resp = await sendEmailViaResend({
      from,
      to,
      subject: payload.subject,
      html: payload.html,
    });

    if (resp.ok) {
      return { sent: true, provider: "resend", detail: resp.json };
    }

    await appendToDevQueue({
      type: "automated_reminder",
      to,
      from,
      subject: payload.subject,
      html: payload.html,
      category: payload.category,
      bookingId: payload.bookingId,
      response: resp.json,
    });

    return { sent: false, provider: "dev-queue", detail: resp.json };
  } catch (error) {
    await appendToDevQueue({
      type: "automated_reminder",
      to,
      from,
      subject: payload.subject,
      html: payload.html,
      category: payload.category,
      bookingId: payload.bookingId,
      error: String(error),
    });
    return { sent: false, provider: "dev-queue", detail: String(error) };
  }
}

async function sendEmailViaResend(payload: {
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; json?: unknown }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (res.ok) return { ok: true, json };

      // Treat 5xx as retryable
      if (res.status >= 500 && res.status < 600) {
        lastError = { status: res.status, json };
      } else {
        return { ok: false, json };
      }
    } catch (err) {
      lastError = err;
    }

    // exponential backoff
    const backoff = RETRY_BASE_MS * Math.pow(2, attempt);
    await new Promise((res) => setTimeout(res, backoff));
  }

  throw lastError;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type EmailQueueBookingEntry = {
  type: "booking_confirmation";
  from: string;
  to: string;
  subject: string;
  html: string;
  bookingId?: string;
  response?: unknown;
  error?: string;
};

type EmailQueuePaymentEntry = {
  type: "payment_notification";
  from: string;
  to: string;
  subject: string;
  html: string;
  bookingId?: string;
  status?: string;
  response?: unknown;
  error?: string;
};

type EmailQueueContactEntry = {
  type: "contact_submission_notification";
  from: string;
  to: string;
  subject: string;
  html: string;
  submissionId: string;
  response?: unknown;
  error?: string;
};

type EmailQueuePasswordResetEntry = {
  type: "password_reset_notification";
  from: string;
  to: string;
  subject: string;
  html: string;
  response?: unknown;
  error?: string;
};

type EmailQueueBookingClaimEntry = {
  type: "booking_claim_notification";
  from: string;
  to: string;
  subject: string;
  html: string;
  response?: unknown;
  error?: string;
};

type EmailQueueEntry =
  | EmailQueueBookingEntry
  | EmailQueuePaymentEntry
  | EmailQueueContactEntry
  | EmailQueuePasswordResetEntry
  | EmailQueueBookingClaimEntry
  | { type?: string };

async function processQueuedEntries() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // nothing to do in dev mode

  try {
    const data = await fs.promises.readFile(DEV_QUEUE_PATH, "utf8");
    const lines = data.split("\n").filter(Boolean);
    if (lines.length === 0) return;

    const remaining: string[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as { entry?: unknown };
        const entry = parsed.entry as EmailQueueEntry | undefined;
        if (!entry || !entry.type) {
          // unknown entry, skip
          continue;
        }

        if (
          entry.type === "booking_confirmation" ||
          entry.type === "payment_notification" ||
          entry.type === "contact_submission_notification" ||
          entry.type === "password_reset_notification" ||
          entry.type === "booking_claim_notification"
        ) {
          const e = entry as
            | EmailQueueBookingEntry
            | EmailQueuePaymentEntry
            | EmailQueueContactEntry
            | EmailQueuePasswordResetEntry
            | EmailQueueBookingClaimEntry;
          const payload = {
            from: e.from,
            to: e.to,
            subject: e.subject,
            html: e.html,
          };

          try {
            await sendEmailViaResend(payload);
            // success — do not re-add
            continue;
          } catch {
            // failed to send — keep in remaining
            remaining.push(line);
            continue;
          }
        }

        // unknown type — keep it for manual inspection
        remaining.push(line);
      } catch {
        // if a line is corrupt, skip it
      }
    }

    // rewrite file with remaining lines
    if (remaining.length > 0) {
      await fs.promises.writeFile(
        DEV_QUEUE_PATH,
        remaining.join("\n") + "\n",
        "utf8",
      );
    } else {
      // no remaining entries — remove file
      await fs.promises.rm(DEV_QUEUE_PATH).catch(() => {});
    }
  } catch {
    // no queue file — nothing to process
  }
}

// Try processing queued entries on module import if possible
void processQueuedEntries().catch(() => {});

export type Booking = {
  id?: string;
  bookingNumber?: string;
  status?: string;
  checkInDate?: Date;
  checkOutDate?: Date;
  subtotal?: number;
  tax?: number;
  total?: number;
  suite?: { name?: string | null; tier?: string | null } | null;
  bookingPets?: Array<{ pet?: { name?: string | null } | null }>;
  user?: { email?: string | null; name?: string | null; phone?: string | null };
};

function formatDate(value?: Date): string {
  if (!value) return "TBD";
  return value.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(value?: number): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export async function sendBookingConfirmation(
  booking: Booking,
): Promise<NotificationSendResult> {
  const from = process.env.EMAIL_FROM || "noreply@pawfectstays.com";
  const apiKey = process.env.RESEND_API_KEY;
  const to = booking?.user?.email;
  const appBaseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://zainesstayandplay.com";
  const receiptUrl = booking?.id
    ? `${appBaseUrl}/book/confirmation?bookingId=${booking.id}`
    : appBaseUrl;
  const safeCheckInDate = booking?.checkInDate || new Date();
  const safeCheckOutDate = booking?.checkOutDate || new Date(safeCheckInDate);
  if (!booking?.checkOutDate) {
    safeCheckOutDate.setDate(safeCheckOutDate.getDate() + 1);
  }
  const suiteLabel = booking?.suite?.name || booking?.suite?.tier || "Private Suite";
  const petNamesArray =
    booking?.bookingPets
      ?.map((entry) => entry.pet?.name)
      .filter((name): name is string => typeof name === "string" && name.length > 0) || ["Your pet"];
  const petNamesString = petNamesArray.join(", ");
  const subject = `Booking ${booking?.bookingNumber} confirmation`;
  const bookingNumber = booking?.bookingNumber || booking?.id || "your booking";
  
  // Calculate nights
  const checkIn = booking?.checkInDate;
  const checkOut = booking?.checkOutDate;
  const nights = checkIn && checkOut 
    ? Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    : 1;
  const suitePrice = (booking?.subtotal || 0) / nights;
  
  // Use React Email template
  const html = await render(
    BookingConfirmation({
      customerName: booking?.user?.name || "Guest",
      bookingNumber: booking?.bookingNumber || "Pending",
      checkInDate: formatDate(safeCheckInDate),
      checkOutDate: formatDate(safeCheckOutDate),
      suiteType: suiteLabel,
      suitePrice,
      nights,
      petNames: petNamesArray,
      subtotal: booking?.subtotal || 0,
      tax: booking?.tax || 0,
      total: booking?.total || 0,
    })
  );

  const sms = await sendSmsNotification({
    to: booking?.user?.phone || null,
    category: "booking_confirmation",
    bookingId: booking?.id,
    message: `Zaine's Stay & Play: ${bookingNumber} is reserved for ${petNamesString} from ${formatDate(booking?.checkInDate)} to ${formatDate(booking?.checkOutDate)}.`,
  });

  if (!to) {
    return { sent: false, provider: "dev-queue", detail: "no-recipient", sms };
  }

  if (!apiKey) {
    await appendToDevQueue({
      type: "booking_confirmation",
      to,
      from,
      subject,
      html,
      bookingId: booking?.id,
    });
    return { sent: false, provider: "dev-queue", sms };
  }

  try {
    const resp = await sendEmailViaResend({ from, to, subject, html });
    if (resp && resp.ok)
      return { sent: true, provider: "resend", detail: resp.json, sms };
    // non-ok response (validation etc.) — record to dev queue for manual inspection
    await appendToDevQueue({
      type: "booking_confirmation",
      to,
      from,
      subject,
      html,
      bookingId: booking?.id,
      response: resp.json,
    });
    return { sent: false, provider: "dev-queue", detail: resp.json, sms };
  } catch (err) {
    // after retries, still failed — append to queue for manual retry later
    await appendToDevQueue({
      type: "booking_confirmation",
      to,
      from,
      subject,
      html,
      bookingId: booking?.id,
      error: String(err),
    });
    return { sent: false, provider: "dev-queue", detail: String(err), sms };
  }
}

export async function sendPaymentNotification(
  bookingId: string,
  type: "success" | "failure",
  booking?: Booking,
): Promise<NotificationSendResult> {
  const from = process.env.EMAIL_FROM || "noreply@pawfectstays.com";
  const apiKey = process.env.RESEND_API_KEY;
  const to = booking?.user?.email;
  const subject = `Booking ${booking?.bookingNumber || bookingId} payment ${type}`;
  const html = `<p>Your payment for booking ${booking?.bookingNumber || bookingId} has ${type}.</p>`;
  const sms = await sendSmsNotification({
    to: booking?.user?.phone || null,
    category: type === "success" ? "payment_success" : "payment_failure",
    bookingId,
    message:
      type === "success"
        ? `Zaine's Stay & Play: Payment received for booking ${booking?.bookingNumber || bookingId}. Your reservation is confirmed.`
        : `Zaine's Stay & Play: Payment failed for booking ${booking?.bookingNumber || bookingId}. Please revisit checkout to complete your reservation.`,
  });

  if (!to) {
    return { sent: false, provider: "dev-queue", detail: "no-recipient", sms };
  }

  if (!apiKey) {
    await appendToDevQueue({
      type: "payment_notification",
      to,
      from,
      subject,
      html,
      bookingId,
      status: type,
    });
    return { sent: false, provider: "dev-queue", sms };
  }

  try {
    const resp = await sendEmailViaResend({ from, to, subject, html });
    if (resp && resp.ok)
      return { sent: true, provider: "resend", detail: resp.json, sms };
    await appendToDevQueue({
      type: "payment_notification",
      to,
      from,
      subject,
      html,
      bookingId,
      status: type,
      response: resp.json,
    });
    return { sent: false, provider: "dev-queue", detail: resp.json, sms };
  } catch (err) {
    await appendToDevQueue({
      type: "payment_notification",
      to,
      from,
      subject,
      html,
      bookingId,
      status: type,
      error: String(err),
    });
    return { sent: false, provider: "dev-queue", detail: String(err), sms };
  }
}

export async function sendPaymentRecoveryLinkNotification(
  bookingId: string,
  recoveryUrl: string,
  booking?: Booking,
): Promise<SendResult> {
  const from = process.env.EMAIL_FROM || "noreply@pawfectstays.com";
  const apiKey = process.env.RESEND_API_KEY;
  const to = booking?.user?.email;
  const safeBookingNumber = escapeHtml(booking?.bookingNumber || bookingId);
  const safeRecoveryUrl = escapeHtml(recoveryUrl);
  const subject = `Complete payment for booking ${booking?.bookingNumber || bookingId}`;
  const html = `
    <p>Hi ${escapeHtml(booking?.user?.name || "there")},</p>
    <p>Your booking <strong>${safeBookingNumber}</strong> is waiting for payment confirmation.</p>
    <p><a href="${safeRecoveryUrl}">Click here to complete your payment securely</a>.</p>
    <p>If the link does not work, copy and paste this URL into your browser:</p>
    <p>${safeRecoveryUrl}</p>
  `;

  if (!to) {
    return { sent: false, provider: "dev-queue", detail: "no-recipient" };
  }

  if (!apiKey) {
    await appendToDevQueue({
      type: "payment_notification",
      to,
      from,
      subject,
      html,
      bookingId,
      status: "recovery_link",
    });
    return { sent: false, provider: "dev-queue" };
  }

  try {
    const resp = await sendEmailViaResend({ from, to, subject, html });
    if (resp && resp.ok)
      return { sent: true, provider: "resend", detail: resp.json };

    await appendToDevQueue({
      type: "payment_notification",
      to,
      from,
      subject,
      html,
      bookingId,
      status: "recovery_link",
      response: resp.json,
    });
    return { sent: false, provider: "dev-queue", detail: resp.json };
  } catch (err) {
    await appendToDevQueue({
      type: "payment_notification",
      to,
      from,
      subject,
      html,
      bookingId,
      status: "recovery_link",
      error: String(err),
    });
    return { sent: false, provider: "dev-queue", detail: String(err) };
  }
}

export async function sendContactSubmissionNotification(payload: {
  submissionId: string;
  fullName: string;
  email: string;
  phone?: string | null;
  message: string;
}): Promise<SendResult> {
  const from = process.env.EMAIL_FROM || "noreply@pawfectstays.com";
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_INBOX_EMAIL;

  if (!to) {
    return {
      sent: false,
      provider: "dev-queue",
      detail: "no-contact-inbox-recipient",
    };
  }

  const subject = `New contact submission ${payload.submissionId}`;
  const safeName = escapeHtml(payload.fullName);
  const safeEmail = escapeHtml(payload.email);
  const safePhone = escapeHtml(payload.phone || "Not provided");
  const safeMessage = escapeHtml(payload.message).replace(/\n/g, "<br />");
  const html = `
    <p><strong>Submission ID:</strong> ${payload.submissionId}</p>
    <p><strong>Name:</strong> ${safeName}</p>
    <p><strong>Email:</strong> ${safeEmail}</p>
    <p><strong>Phone:</strong> ${safePhone}</p>
    <p><strong>Message:</strong></p>
    <p>${safeMessage}</p>
  `;

  if (!apiKey) {
    await appendToDevQueue({
      type: "contact_submission_notification",
      to,
      from,
      subject,
      html,
      submissionId: payload.submissionId,
    });
    return { sent: false, provider: "dev-queue" };
  }

  try {
    const resp = await sendEmailViaResend({ from, to, subject, html });
    if (resp && resp.ok)
      return { sent: true, provider: "resend", detail: resp.json };
    await appendToDevQueue({
      type: "contact_submission_notification",
      to,
      from,
      subject,
      html,
      submissionId: payload.submissionId,
      response: resp.json,
    });
    return { sent: false, provider: "dev-queue", detail: resp.json };
  } catch (err) {
    await appendToDevQueue({
      type: "contact_submission_notification",
      to,
      from,
      subject,
      html,
      submissionId: payload.submissionId,
      error: String(err),
    });
    return { sent: false, provider: "dev-queue", detail: String(err) };
  }
}

export async function sendPasswordResetNotification(payload: {
  email: string;
  resetUrl: string;
  firstName?: string | null;
}): Promise<SendResult> {
  const from = process.env.EMAIL_FROM || "noreply@pawfectstays.com";
  const apiKey = process.env.RESEND_API_KEY;
  const to = payload.email;
  const subject = "Reset your Zaine's Stay & Play password";
  const safeResetUrl = escapeHtml(payload.resetUrl);
  const safeName = escapeHtml(payload.firstName || "there");

  const html = `
    <div style="font-family: Georgia, serif; color: #18212a; line-height: 1.6; max-width: 620px; margin: 0 auto;">
      <h1 style="margin-bottom: 8px;">Secure password reset</h1>
      <p style="margin-top: 0; color: #4e5a67;">Hi ${safeName}, we received a request to reset your account password.</p>
      <p>
        <a href="${safeResetUrl}" style="display: inline-block; background: #111827; color: #fff; text-decoration: none; padding: 10px 14px; border-radius: 8px;">
          Reset Password
        </a>
      </p>
      <p style="color: #4e5a67;">This link expires in 30 minutes. If you did not request this, you can safely ignore this email.</p>
      <p style="font-size: 13px; color: #4e5a67;">Need help? Contact our concierge team at (315) 657-1332.</p>
    </div>
  `;

  if (!apiKey) {
    await appendToDevQueue({
      type: "password_reset_notification",
      to,
      from,
      subject,
      html,
    });
    return { sent: false, provider: "dev-queue" };
  }

  try {
    const resp = await sendEmailViaResend({ from, to, subject, html });
    if (resp && resp.ok) {
      return { sent: true, provider: "resend", detail: resp.json };
    }

    await appendToDevQueue({
      type: "password_reset_notification",
      to,
      from,
      subject,
      html,
      response: resp.json,
    });
    return { sent: false, provider: "dev-queue", detail: resp.json };
  } catch (err) {
    await appendToDevQueue({
      type: "password_reset_notification",
      to,
      from,
      subject,
      html,
      error: String(err),
    });
    return { sent: false, provider: "dev-queue", detail: String(err) };
  }
}

export async function sendBookingClaimNotification(payload: {
  email: string;
  claimUrl: string;
  bookingNumber: string;
  firstName?: string | null;
}): Promise<SendResult> {
  const from = process.env.EMAIL_FROM || "noreply@pawfectstays.com";
  const apiKey = process.env.RESEND_API_KEY;
  const to = payload.email;
  const subject = `Claim booking ${payload.bookingNumber} in your dashboard`;
  const safeClaimUrl = escapeHtml(payload.claimUrl);
  const safeBookingNumber = escapeHtml(payload.bookingNumber);
  const safeName = escapeHtml(payload.firstName || "there");

  const html = `
    <div style="font-family: Georgia, serif; color: #18212a; line-height: 1.6; max-width: 620px; margin: 0 auto;">
      <h1 style="margin-bottom: 8px;">Claim your booking access</h1>
      <p style="margin-top: 0; color: #4e5a67;">Hi ${safeName}, claim booking <strong>${safeBookingNumber}</strong> to manage updates, pet details, and future reservations.</p>
      <p>
        <a href="${safeClaimUrl}" style="display: inline-block; background: #111827; color: #fff; text-decoration: none; padding: 10px 14px; border-radius: 8px;">
          Claim Booking Access
        </a>
      </p>
      <p style="color: #4e5a67;">This secure claim link expires in 48 hours.</p>
    </div>
  `;

  if (!apiKey) {
    await appendToDevQueue({
      type: "booking_claim_notification",
      to,
      from,
      subject,
      html,
    });
    return { sent: false, provider: "dev-queue" };
  }

  try {
    const resp = await sendEmailViaResend({ from, to, subject, html });
    if (resp && resp.ok) {
      return { sent: true, provider: "resend", detail: resp.json };
    }

    await appendToDevQueue({
      type: "booking_claim_notification",
      to,
      from,
      subject,
      html,
      response: resp.json,
    });
    return { sent: false, provider: "dev-queue", detail: resp.json };
  } catch (err) {
    await appendToDevQueue({
      type: "booking_claim_notification",
      to,
      from,
      subject,
      html,
      error: String(err),
    });
    return { sent: false, provider: "dev-queue", detail: String(err) };
  }
}

/**
 * Send welcome email to new customers
 */
export async function sendWelcomeEmail(payload: {
  email: string;
  name?: string | null;
}): Promise<SendResult> {
  const from = process.env.EMAIL_FROM || "noreply@pawfectstays.com";
  const apiKey = process.env.RESEND_API_KEY;
  const to = payload.email;
  const subject = "Welcome to Zaine's Stay & Play! 🐾";
  
  const html = await render(
    WelcomeEmail({
      customerName: payload.name || "there",
    })
  );

  if (!apiKey) {
    await appendToDevQueue({
      type: "welcome_email" as any,
      to,
      from,
      subject,
      html,
    });
    return { sent: false, provider: "dev-queue" };
  }

  try {
    const resp = await sendEmailViaResend({ from, to, subject, html });
    if (resp && resp.ok) {
      return { sent: true, provider: "resend", detail: resp.json };
    }

    await appendToDevQueue({
      type: "welcome_email" as any,
      to,
      from,
      subject,
      html,
      response: resp.json,
    });
    return { sent: false, provider: "dev-queue", detail: resp.json };
  } catch (err) {
    await appendToDevQueue({
      type: "welcome_email" as any,
      to,
      from,
      subject,
      html,
      error: String(err),
    });
    return { sent: false, provider: "dev-queue", detail: String(err) };
  }
}

/**
 * Send daily photo digest to customers
 */
export async function sendPhotoDigest(payload: {
  email: string;
  customerName: string;
  petName: string;
  date: string;
  photos: Array<{
    url: string;
    caption: string;
    timestamp: string;
  }>;
}): Promise<SendResult> {
  const from = process.env.EMAIL_FROM || "noreply@pawfectstays.com";
  const apiKey = process.env.RESEND_API_KEY;
  const to = payload.email;
  const subject = `📸 ${payload.petName}'s Daily Photos - ${payload.date}`;
  
  const html = await render(
    PhotoDigest({
      customerName: payload.customerName,
      petName: payload.petName,
      date: payload.date,
      photos: payload.photos,
    })
  );

  if (!apiKey) {
    await appendToDevQueue({
      type: "photo_digest" as any,
      to,
      from,
      subject,
      html,
    });
    return { sent: false, provider: "dev-queue" };
  }

  try {
    const resp = await sendEmailViaResend({ from, to, subject, html });
    if (resp && resp.ok) {
      return { sent: true, provider: "resend", detail: resp.json };
    }

    await appendToDevQueue({
      type: "photo_digest" as any,
      to,
      from,
      subject,
      html,
      response: resp.json,
    });
    return { sent: false, provider: "dev-queue", detail: resp.json };
  } catch (err) {
    await appendToDevQueue({
      type: "photo_digest" as any,
      to,
      from,
      subject,
      html,
      error: String(err),
    });
    return { sent: false, provider: "dev-queue", detail: String(err) };
  }
}

export async function sendReportCardNotification(payload: {
  toEmail?: string | null;
  toPhone?: string | null;
  customerName?: string | null;
  petName: string;
  bookingNumber?: string | null;
}) : Promise<NotificationSendResult> {
  const from = process.env.EMAIL_FROM || "noreply@pawfectstays.com";
  const apiKey = process.env.RESEND_API_KEY;
  const to = payload.toEmail;
  const subject = `Report card ready for ${payload.petName}`;
  const html = `
    <p>Hi ${escapeHtml(payload.customerName || "there")},</p>
    <p>${escapeHtml(payload.petName)} has a new report card available${payload.bookingNumber ? ` for booking <strong>${escapeHtml(payload.bookingNumber)}</strong>` : ""}.</p>
    <p>Sign in to your dashboard to review today's updates.</p>
  `;

  const sms = await sendSmsNotification({
    to: payload.toPhone,
    category: "report_card",
    message: `Zaine's Stay & Play: ${payload.petName}'s new report card is ready${payload.bookingNumber ? ` for booking ${payload.bookingNumber}` : ""}. Check your dashboard for details.`,
  });

  if (!to || !apiKey) {
    if (to) {
      await appendToDevQueue({
        type: "report_card_notification",
        to,
        from,
        subject,
        html,
      });
    }

    return { sent: false, provider: "dev-queue", detail: to ? undefined : "no-recipient", sms };
  }

  try {
    const resp = await sendEmailViaResend({ from, to, subject, html });
    if (resp.ok) {
      return { sent: true, provider: "resend", detail: resp.json, sms };
    }

    await appendToDevQueue({
      type: "report_card_notification",
      to,
      from,
      subject,
      html,
      response: resp.json,
    });

    return { sent: false, provider: "dev-queue", detail: resp.json, sms };
  } catch (error) {
    await appendToDevQueue({
      type: "report_card_notification",
      to,
      from,
      subject,
      html,
      error: String(error),
    });

    return { sent: false, provider: "dev-queue", detail: String(error), sms };
  }
}

export async function sendIncidentNotification(payload: {
  toEmail?: string | null;
  toPhone?: string | null;
  customerName?: string | null;
  petName: string;
  bookingNumber?: string | null;
}) : Promise<NotificationSendResult> {
  const from = process.env.EMAIL_FROM || "noreply@pawfectstays.com";
  const apiKey = process.env.RESEND_API_KEY;
  const to = payload.toEmail;
  const subject = `Important update about ${payload.petName}`;
  const html = `
    <p>Hi ${escapeHtml(payload.customerName || "there")},</p>
    <p>We logged an important incident update for ${escapeHtml(payload.petName)}${payload.bookingNumber ? ` during booking <strong>${escapeHtml(payload.bookingNumber)}</strong>` : ""}.</p>
    <p>Please contact the front desk or review your dashboard for the latest details.</p>
  `;

  const sms = await sendSmsNotification({
    to: payload.toPhone,
    category: "incident",
    message: `Zaine's Stay & Play: We recorded an incident update for ${payload.petName}${payload.bookingNumber ? ` during booking ${payload.bookingNumber}` : ""}. Please check your dashboard or contact us.`,
  });

  if (!to || !apiKey) {
    if (to) {
      await appendToDevQueue({
        type: "incident_notification",
        to,
        from,
        subject,
        html,
      });
    }

    return { sent: false, provider: "dev-queue", detail: to ? undefined : "no-recipient", sms };
  }

  try {
    const resp = await sendEmailViaResend({ from, to, subject, html });
    if (resp.ok) {
      return { sent: true, provider: "resend", detail: resp.json, sms };
    }

    await appendToDevQueue({
      type: "incident_notification",
      to,
      from,
      subject,
      html,
      response: resp.json,
    });

    return { sent: false, provider: "dev-queue", detail: resp.json, sms };
  } catch (error) {
    await appendToDevQueue({
      type: "incident_notification",
      to,
      from,
      subject,
      html,
      error: String(error),
    });

    return { sent: false, provider: "dev-queue", detail: String(error), sms };
  }
}
