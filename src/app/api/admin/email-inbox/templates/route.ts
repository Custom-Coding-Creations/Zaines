import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";

export async function GET() {
  const authResult = await requireStaffSession();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: [] });
  }

  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error("[email-templates] list failed", error);
    return NextResponse.json({ error: "Failed to load templates" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireStaffSession();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      type?: string;
      name?: string;
      subject?: string;
      html?: string;
    };

    if (!body.type || !body.name || !body.subject || !body.html) {
      return NextResponse.json({ error: "type, name, subject, html are required" }, { status: 400 });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        type: body.type,
        name: body.name,
        subject: body.subject,
        html: body.html,
        isSystem: false,
        isEnabled: true,
      },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    console.error("[email-templates] create failed", error);
    return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
  }
}
