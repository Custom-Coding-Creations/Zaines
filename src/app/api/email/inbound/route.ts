import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";

const inboundSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  subject: z.string().default("(no subject)"),
  html: z.string().default(""),
  receivedAt: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const secret = process.env.INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[inbound] INBOUND_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = inboundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { from, to, subject, html, receivedAt } = parsed.data;

  try {
    const record = await prisma.emailLog.create({
      data: {
        direction: "inbound",
        type: "inbound",
        fromAddress: from,
        toAddress: to,
        subject,
        html,
        status: "received",
        isRead: false,
        sentAt: receivedAt ? new Date(receivedAt) : new Date(),
      },
    });

    return NextResponse.json({ success: true, id: record.id }, { status: 201 });
  } catch (error) {
    console.error("[inbound] failed to create EmailLog", error);
    return NextResponse.json({ error: "Failed to store email" }, { status: 500 });
  }
}
