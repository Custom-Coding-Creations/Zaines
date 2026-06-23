import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { getAdminSettings } from "@/lib/api/admin-settings";

const attachmentMetaSchema = z.object({
  url: z.string().url(),
  filename: z.string(),
  size: z.number(),
  mimeType: z.string(),
});

const composeSchema = z.object({
  to: z.string().email("Valid recipient email required"),
  cc: z.array(z.string().email()).optional(),
  subject: z.string().min(1, "Subject is required").max(200),
  html: z.string().min(1, "Body is required").max(500_000),
  attachments: z.array(attachmentMetaSchema).optional(),
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

  const { to, cc, subject, html, attachments, bookingId, userId } = parsed.data;

  const emailSettings = await getAdminSettings().then((s) => s.emailSettings).catch(() => null);
  const from = emailSettings
    ? `${emailSettings.fromName} <${emailSettings.fromAddress}>`
    : process.env.EMAIL_FROM || "info@zainesstayandplay.com";
  const replyTo = emailSettings?.replyTo;

  // Append signature if configured
  const signatureHtml = emailSettings?.signatureHtml;
  const finalHtml = signatureHtml
    ? `${html}<br/><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>${signatureHtml}`
    : html;

  const workerUrl = process.env.EMAIL_WORKER_URL;
  const workerSecret = process.env.EMAIL_WORKER_SECRET;

  let status: "sent" | "failed" = "failed";
  let resendId: string | null = null;

  if (workerUrl && workerSecret) {
    try {
      // Fetch attachment bytes for base64 encoding
      const workerAttachments = attachments
        ? await Promise.all(
            attachments.map(async (att) => {
              const res = await fetch(att.url);
              const buf = await res.arrayBuffer();
              const content = Buffer.from(buf).toString("base64");
              return { filename: att.filename, content, content_type: att.mimeType };
            }),
          )
        : undefined;

      const resp = await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${workerSecret}`,
        },
        body: JSON.stringify({
          from,
          to,
          ...(cc?.length ? { cc } : {}),
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject,
          html: finalHtml,
          ...(workerAttachments?.length ? { attachments: workerAttachments } : {}),
        }),
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
        cc: cc?.join(", ") ?? null,
        subject,
        html: finalHtml,
        resendId,
        status,
        bookingId: bookingId ?? null,
        userId: userId ?? null,
        attachments: attachments ?? undefined,
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
