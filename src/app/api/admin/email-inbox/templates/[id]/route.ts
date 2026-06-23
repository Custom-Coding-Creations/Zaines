import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";

export async function GET(
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
    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error("[email-templates] get failed", error);
    return NextResponse.json({ error: "Failed to load template" }, { status: 503 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireStaffSession();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as {
      name?: string;
      subject?: string;
      html?: string;
      isEnabled?: boolean;
    };

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.subject !== undefined ? { subject: body.subject } : {}),
        ...(body.html !== undefined ? { html: body.html } : {}),
        ...(body.isEnabled !== undefined ? { isEnabled: body.isEnabled } : {}),
      },
    });

    return NextResponse.json({ success: true, data: template });
  } catch (error) {
    console.error("[email-templates] update failed", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(
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
    if (template.isSystem) {
      return NextResponse.json({ error: "System templates cannot be deleted" }, { status: 403 });
    }

    await prisma.emailTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[email-templates] delete failed", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
