import { NextRequest, NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { getAdminSettings, updateAdminSettings } from "@/lib/api/admin-settings";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const emailSettingsSchema = z.object({
  fromName: z.string().min(1).max(100),
  fromAddress: z.string().email(),
  replyTo: z.string().email(),
  signatureHtml: z.string().max(50000),
});

export async function GET() {
  const authResult = await requireStaffSession();
  if (authResult.error) return authResult.error;

  try {
    const settings = await getAdminSettings();
    return NextResponse.json({ success: true, data: settings.emailSettings });
  } catch (error) {
    console.error("[email-settings] get failed", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireStaffSession();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const parsed = emailSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid settings", details: parsed.error.issues },
        { status: 400 },
      );
    }

    await updateAdminSettings({ emailSettings: parsed.data });
    revalidatePath("/admin/inbox");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[email-settings] update failed", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
