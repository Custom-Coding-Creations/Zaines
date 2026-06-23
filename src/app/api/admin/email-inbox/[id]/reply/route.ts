import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { getAdminSettings } from "@/lib/api/admin-settings";

type RouteContext = { params: Promise<{ id: string }> };

const attachmentMetaSchema = z.object({
  url: z.string().url(),
  filename: z.string(),
  size: z.number(),
  mimeType: z.string(),
});

const replySchema = z.object({
  html: z.string().min(1, "Reply content is required").max(500_000),
  attachments: z.array(attachmentMetaSchema).optional(),
});

export async function POST(request: NextRequest, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { id } = await params;

  const original = await prisma.emailLog.findUnique({
    where: { id },
    select: { toAddress: true, fromAddress: true, subject: true, html: true },
  });

  if (!original) {
    return NextResponse.json({ error: "Email not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const emailSettings = await getAdminSettings().then((s) => s.emailSettings).catch(() => null);
  const from = emailSettings
    ? `${emailSettings.fromName} <${emailSettings.fromAddress}>`
    : process.env.EMAIL_FROM || "info@zainesstayandplay.com";
  const replyTo = emailSettings?.replyTo;

  const replySubject = original.subject.startsWith("Re: ")
    ? original.subject
    : `Re: ${original.subject}`;

  const signatureHtml = emailSettings?.signatureHtml;
  const replyHtml = `
    <div style="font-family:Georgia,serif;color:#18212a;line-height:1.6;max-width:620px;">
      ${parsed.data.html}
      ${signatureHtml ? `<br/><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>${signatureHtml}` : ""}
    </div>
    <br/>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
    <blockquote style="margin:0;padding-left:12px;border-left:3px solid #e2e8f0;color:#64748b;font-size:13px;">
      ${original.html}
    </blockquote>
  `;

  const to = original.toAddress;
  const workerUrl = process.env.EMAIL_WORKER_URL;
  const workerSecret = process.env.EMAIL_WORKER_SECRET;

  let status: "sent" | "failed" = "failed";
  let resendId: string | null = null;

  if (workerUrl && workerSecret) {
    try {
      const workerAttachments = parsed.data.attachments
        ? await Promise.all(
            parsed.data.attachments.map(async (att) => {
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
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject: replySubject,
          html: replyHtml,
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

  const log = await prisma.emailLog.create({
    data: {
      direction: "outbound",
      type: "compose",
      fromAddress: from,
      toAddress: to,
      subject: replySubject,
      html: replyHtml,
      resendId,
      status,
      attachments: parsed.data.attachments ?? undefined,
      isRead: true, // admin sent it — mark read immediately
    },
  });

  if (status === "failed") {
    return NextResponse.json(
      { error: "Reply could not be delivered. Check EMAIL_WORKER_URL configuration.", data: log },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, data: log }, { status: 201 });
}
