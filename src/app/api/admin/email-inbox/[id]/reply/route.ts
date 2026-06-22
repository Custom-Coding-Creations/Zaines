import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const replySchema = z.object({
  content: z.string().min(1, "Reply content is required").max(50_000),
});

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

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

  const replySubject = original.subject.startsWith("Re: ")
    ? original.subject
    : `Re: ${original.subject}`;

  const replyHtml = `
    <div style="font-family:Georgia,serif;color:#18212a;line-height:1.6;max-width:620px;">
      ${escapeHtml(parsed.data.content).replace(/\n/g, "<br/>")}
    </div>
    <br/>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
    <blockquote style="margin:0;padding-left:12px;border-left:3px solid #e2e8f0;color:#64748b;font-size:13px;">
      ${original.html}
    </blockquote>
  `;

  const from = process.env.EMAIL_FROM || "info@zainesstayandplay.com";
  const to = original.toAddress;
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
        body: JSON.stringify({ from, to, subject: replySubject, html: replyHtml }),
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
