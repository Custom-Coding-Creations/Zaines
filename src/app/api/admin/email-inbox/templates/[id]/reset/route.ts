import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { generateTemplateContent } from "@/lib/email-template-html";

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

    const content = generateTemplateContent(template.type);
    if (!content) {
      return NextResponse.json(
        { error: `No default available for type: ${template.type}` },
        { status: 400 },
      );
    }

    const updated = await prisma.emailTemplate.update({
      where: { id },
      data: { subject: content.subject, html: content.html },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[email-templates] reset failed", error);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
