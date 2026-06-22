import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { id } = await params;

  try {
    const email = await prisma.emailLog.findUnique({ where: { id } });

    if (!email) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Auto-mark as read on open
    if (!email.isRead) {
      await prisma.emailLog.update({ where: { id }, data: { isRead: true } });
    }

    return NextResponse.json({ success: true, data: { ...email, isRead: true } });
  } catch (error) {
    console.error("[email-inbox] detail failed", error);
    return NextResponse.json({ error: "Failed to load email" }, { status: 500 });
  }
}

const patchSchema = z.object({
  isRead: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const updated = await prisma.emailLog.update({
      where: { id },
      data: parsed.data,
      select: { id: true, isRead: true, isStarred: true, isArchived: true },
    });
    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
