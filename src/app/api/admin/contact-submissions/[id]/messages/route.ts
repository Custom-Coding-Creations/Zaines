import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import {
  appendContactSubmissionMessage,
  type ContactConversationAttachment,
} from "@/lib/api/issue26";

const MAX_ATTACHMENTS = 5;
const IMAGE_MAX_SIZE_BYTES = 8 * 1024 * 1024;
const VIDEO_MAX_SIZE_BYTES = 30 * 1024 * 1024;

function isAllowedType(contentType: string): "image" | "video" | null {
  if (contentType.startsWith("image/")) {
    return "image";
  }
  if (contentType.startsWith("video/")) {
    return "video";
  }
  return null;
}

async function storeAttachment(file: File, submissionId: string): Promise<string> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    const { put } = await import("@vercel/blob");
    const key = `contact/${submissionId}/${Date.now()}-${file.name}`;
    const blob = await put(key, file, { access: "public", token: blobToken });
    return blob.url;
  }

  const localDir = path.join(process.cwd(), "public", "uploads", "contact-media");
  await mkdir(localDir, { recursive: true });

  const extension = path.extname(file.name);
  const safeExtension = extension.length > 0 ? extension : "";
  const fileName = `${Date.now()}-${randomUUID()}${safeExtension}`;
  const filePath = path.join(localDir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return `/uploads/contact-media/${fileName}`;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }
  const session = authResult.session;
  const role = session?.user?.role;
  const senderName =
    session?.user?.name && session.user.name.trim().length > 0
      ? session.user.name
      : role === "admin"
        ? "Admin Team"
        : "Staff Team";

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing submission ID" }, { status: 400 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const contentValue = formData.get("content");
  const content = typeof contentValue === "string" ? contentValue.trim() : "";

  const fileCandidates = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File);

  if (!content && fileCandidates.length === 0) {
    return NextResponse.json(
      { error: "Message content or at least one attachment is required" },
      { status: 400 },
    );
  }

  if (content.length > 5000) {
    return NextResponse.json(
      { error: "Message is too long (max 5000 characters)" },
      { status: 400 },
    );
  }

  if (fileCandidates.length > MAX_ATTACHMENTS) {
    return NextResponse.json(
      { error: `Too many attachments (max ${MAX_ATTACHMENTS})` },
      { status: 400 },
    );
  }

  const attachments: ContactConversationAttachment[] = [];

  for (const file of fileCandidates) {
    const kind = isAllowedType(file.type);
    if (!kind) {
      return NextResponse.json(
        { error: `Unsupported attachment type: ${file.type || "unknown"}` },
        { status: 400 },
      );
    }

    if (kind === "image" && file.size > IMAGE_MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds size limit (8MB)" },
        { status: 400 },
      );
    }

    if (kind === "video" && file.size > VIDEO_MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Video exceeds size limit (30MB)" },
        { status: 400 },
      );
    }

    const url = await storeAttachment(file, id);
    attachments.push({
      attachmentId: randomUUID(),
      url,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
      kind,
    });
  }

  try {
    const updatedSubmission = await appendContactSubmissionMessage({
      submissionId: id,
      senderType: "staff",
      senderName,
      content,
      attachments,
    });

    return NextResponse.json(
      {
        submissionId: updatedSubmission.submissionId,
        conversation: updatedSubmission.conversation,
        status: updatedSubmission.status,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (message === "SUBMISSION_NOT_FOUND") {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    console.error("[API] Contact reply failed:", { submissionId: id, error: message });
    return NextResponse.json(
      { error: "Failed to create contact reply" },
      { status: 500 },
    );
  }
}
