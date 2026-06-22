import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";

const composeSchema = z.object({
  to: z.string().email("Valid recipient email required"),
  subject: z.string().min(1, "Subject is required").max(200),
  html: z.string().min(1, "Body is required").max(500_000),
  bookingId: z.string().optional(),
  userId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const authResult = await requireStaffSession();
  if (authResult.error) return authResult.error;

  const body = await request.json().catch(() => null);
  const parsed = composeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { to, subject, html, bookingId, userId } = parsed.data;
  const from = process.env.EMAIL_FROM || "info@zainesstayandplay.com";
  const workerUrl = process.env.EMAIL_WORKER_URL;
  const workerSecret = process.env.EMAIL_WORKER_SECRET;

  let status: "sent" | "failed" = "failed";
  let resendId: string | null = null;

  if (workerUrl && workerSecret) {
    try {
      const resp = await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${workerSecret}`,
        },
        body: JSON.stringify({ from, to, subject, html }),
      });
      const json = (await resp.json().catch(() => ({}))) as { messageId?: string };
      if (resp.ok) {
        status = "sent";
        resendId = json.messageId ?? null;
      }
    } catch {
      status = "failed";
    }
  }

  if (isDatabaseConfigured()) {
    await prisma.emailLog.create({
      data: {
        direction: "outbound",
        type: "compose",
        fromAddress: from,
        toAddress: to,
        subject,
        html,
        resendId,
        status,
        bookingId: bookingId ?? null,
        userId: userId ?? null,
        isRead: true, // admin composed it — mark read immediately
      },
    });
  }

  if (status === "failed") {
    return NextResponse.json(
      { error: "Email could not be delivered. Check EMAIL_WORKER_URL configuration." },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, resendId }, { status: 201 });
}
