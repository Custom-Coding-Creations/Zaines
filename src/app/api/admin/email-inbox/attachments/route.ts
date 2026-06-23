import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { put } from "@vercel/blob";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  const authResult = await requireStaffSession();
  if (authResult.error) return authResult.error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type not allowed: ${file.type}` },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 10 MB limit" },
        { status: 400 },
      );
    }

    const slug = Math.random().toString(36).slice(2, 10);
    const key = `email-attachments/${slug}/${file.name}`;
    const blob = await put(key, file, { access: "public" });

    return NextResponse.json({
      url: blob.url,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    console.error("[email-attachments] upload failed", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
