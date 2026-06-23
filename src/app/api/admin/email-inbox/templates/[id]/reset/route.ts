import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { render } from "@react-email/components";

const MOCK_DATA: Record<string, () => Promise<{ subject: string; html: string }>> = {
  booking_confirmation: async () => {
    const { BookingConfirmation } = await import("@/emails/BookingConfirmation");
    return {
      subject: "Booking {{bookingNumber}} confirmed",
      html: await render(
        BookingConfirmation({
          customerName: "Sarah Johnson",
          bookingNumber: "PB-20260622-0001",
          petNames: ["Buddy"],
          checkInDate: "June 25, 2026",
          checkOutDate: "June 28, 2026",
          suiteType: "Deluxe Suite",
          suitePrice: 85,
          nights: 3,
          subtotal: 255,
          tax: 22.95,
          total: 277.95,
        }),
      ),
    };
  },
  welcome_email: async () => {
    const { WelcomeEmail } = await import("@/emails/WelcomeEmail");
    return {
      subject: "Welcome to Zaine's Stay & Play!",
      html: await render(WelcomeEmail({ customerName: "Sarah" })),
    };
  },
  photo_digest: async () => {
    const { PhotoDigest } = await import("@/emails/PhotoDigest");
    return {
      subject: "{{petName}}'s Daily Photos - {{date}}",
      html: await render(
        PhotoDigest({
          customerName: "Sarah",
          petName: "Buddy",
          photos: [
            { url: "https://placehold.co/280x200/dbeafe/3b82f6?text=Morning+Play", caption: "Morning playtime", timestamp: new Date().toISOString() },
            { url: "https://placehold.co/280x200/dcfce7/16a34a?text=Afternoon+Nap", caption: "Afternoon nap", timestamp: new Date().toISOString() },
          ],
          date: "June 22, 2026",
        }),
      ),
    };
  },
  payment_notification: async () => {
    const { PaymentReceipt } = await import("@/emails/PaymentReceipt");
    return {
      subject: "Payment receipt for booking {{bookingNumber}}",
      html: await render(
        PaymentReceipt({
          customerName: "Sarah Johnson",
          bookingNumber: "PB-20260622-0001",
          receiptNumber: "RCT-20260622-0001",
          paymentDate: "June 22, 2026",
          paymentMethod: "Credit Card",
          lastFourDigits: "4242",
          items: [{ description: "Deluxe Suite — 3 nights", quantity: 3, unitPrice: 85, total: 255 }],
          subtotal: 255,
          tax: 22.95,
          total: 277.95,
        }),
      ),
    };
  },
  vaccine_expiry_reminder: async () => {
    const { VaccineExpiryReminder } = await import("@/emails/VaccineExpiryReminder");
    return {
      subject: "{{petName}}'s vaccine expires soon",
      html: await render(
        VaccineExpiryReminder({
          customerName: "Sarah",
          petName: "Buddy",
          vaccineType: "Rabies",
          expiryDate: "July 15, 2026",
          daysUntilExpiry: 23,
        }),
      ),
    };
  },
  password_reset_notification: async () => {
    const { PasswordReset } = await import("@/emails/PasswordReset");
    return {
      subject: "Reset your Zaine's Stay & Play password",
      html: await render(PasswordReset({ firstName: "Sarah", resetUrl: "https://zainesstayandplay.com/reset-password?token=mock", expiryMinutes: 60 })),
    };
  },
  booking_claim_notification: async () => {
    const { BookingClaim } = await import("@/emails/BookingClaim");
    return {
      subject: "Claim booking {{bookingNumber}} in your dashboard",
      html: await render(BookingClaim({ firstName: "Sarah", bookingNumber: "PB-20260622-0001", claimUrl: "https://zainesstayandplay.com/claim?token=mock", expiryHours: 48 })),
    };
  },
  owner_booking_notification: async () => {
    const { OwnerNotification } = await import("@/emails/OwnerNotification");
    return {
      subject: "New Booking: {{bookingNumber}} — {{petNames}}",
      html: await render(
        OwnerNotification({
          bookingNumber: "PB-20260622-0001",
          customerName: "Sarah Johnson",
          customerEmail: "sarah@example.com",
          petNames: ["Buddy"],
          checkInDate: "June 25, 2026",
          checkOutDate: "June 28, 2026",
          suiteType: "Deluxe Suite",
          total: "$255.00",
          detailsUrl: "https://zainesstayandplay.com/admin/bookings/mock-id",
        }),
      ),
    };
  },
  incident_notification: async () => {
    const { IncidentNotification } = await import("@/emails/IncidentNotification");
    return {
      subject: "Important update about {{petName}}",
      html: await render(
        IncidentNotification({
          customerName: "Sarah",
          petName: "Buddy",
          summary: "Buddy had a minor scrape on his paw during playtime. We have treated it and he is comfortable.",
          dashboardUrl: "https://zainesstayandplay.com/dashboard",
        }),
      ),
    };
  },
  report_card_notification: async () => {
    const { ReportCard } = await import("@/emails/ReportCard");
    return {
      subject: "Report card ready for {{petName}}",
      html: await render(
        ReportCard({
          customerName: "Sarah",
          petName: "Buddy",
          highlights: ["Ate all meals with great enthusiasm", "Played well with the group", "Slept through the night"],
          dashboardUrl: "https://zainesstayandplay.com/dashboard",
        }),
      ),
    };
  },
  automated_reminder: async () => {
    const { AutomatedReminder } = await import("@/emails/AutomatedReminder");
    return {
      subject: "Reminder: {{petName}}'s stay starts soon",
      html: await render(
        AutomatedReminder({
          customerName: "Sarah",
          petName: "Buddy",
          reminderType: "check_in",
          checkInDate: "June 25, 2026",
          dashboardUrl: "https://zainesstayandplay.com/dashboard",
        }),
      ),
    };
  },
  contact_submission_notification: async () => ({
    subject: "New contact submission from {{name}}",
    html: `<p>Name: {{name}}</p><p>Email: {{email}}</p><p>Message: {{message}}</p>`,
  }),
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireStaffSession();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { id } = await params;
    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const generator = MOCK_DATA[template.type];
    if (!generator) {
      return NextResponse.json(
        { error: `No default render available for type: ${template.type}` },
        { status: 400 },
      );
    }

    const { subject, html } = await generator();
    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: { subject, html },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[email-templates] reset failed", error);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
