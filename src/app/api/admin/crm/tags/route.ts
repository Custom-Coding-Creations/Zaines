import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import { createCrmTag, listCrmTags } from "@/lib/api/admin-crm";

export async function GET() {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  try {
    const tags = await listCrmTags();
    return NextResponse.json({ tags });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({ tags: [] });
    }

    console.error("[API] CRM tags fetch failed", { message });
    return NextResponse.json({ error: "Unable to load CRM tags" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const payload = (await request.json().catch(() => null)) as {
    name?: string;
    color?: string;
    description?: string;
  } | null;

  const name = payload?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
  }

  try {
    const tag = await createCrmTag({
      name,
      color: payload?.color,
      description: payload?.description,
    });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Tag already exists" }, { status: 409 });
    }

    console.error("[API] CRM tag create failed", { message });
    return NextResponse.json({ error: "Unable to create CRM tag" }, { status: 500 });
  }
}
