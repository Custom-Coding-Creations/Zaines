import { NextResponse } from "next/server";
import { requireStaffSession } from "@/lib/api/admin-auth";
import {
  createCustomerTask,
  listCustomerTasks,
  updateCustomerTaskStatus,
} from "@/lib/api/admin-crm";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
  }

  try {
    const tasks = await listCustomerTasks(id, 100);
    return NextResponse.json({ tasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json({ tasks: [] });
    }

    console.error("[API] CRM tasks fetch failed", { customerId: id, message });
    return NextResponse.json(
      { error: "Unable to load customer tasks" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as {
    title?: string;
    description?: string;
    dueAt?: string;
    priority?: string;
    assignedToId?: string;
  } | null;

  const title = payload?.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Task title is required" }, { status: 400 });
  }

  if (title.length > 200) {
    return NextResponse.json(
      { error: "Task title is too long (max 200 chars)" },
      { status: 400 },
    );
  }

  const dueAt = payload?.dueAt?.trim();
  if (dueAt) {
    const dueDate = new Date(dueAt);
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: "dueAt must be a valid ISO date" }, { status: 400 });
    }
  }

  try {
    const session = authResult.session;
    const task = await createCustomerTask({
      userId: id,
      title,
      description: payload?.description,
      dueAt,
      priority: payload?.priority,
      createdById: session.user.id,
      assignedToId: payload?.assignedToId,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }

    console.error("[API] CRM task create failed", { customerId: id, message });
    return NextResponse.json({ error: "Unable to create task" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const authResult = await requireStaffSession();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as {
    taskId?: string;
    status?: string;
  } | null;

  const taskId = payload?.taskId?.trim();
  const status = payload?.status;

  if (!taskId) {
    return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  }

  if (status !== "open" && status !== "completed") {
    return NextResponse.json(
      { error: "status must be open or completed" },
      { status: 400 },
    );
  }

  try {
    const task = await updateCustomerTaskStatus({
      userId: id,
      taskId,
      status,
    });

    return NextResponse.json({ task });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "TASK_NOT_FOUND") {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (message === "PERSISTENCE_UNAVAILABLE") {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }

    console.error("[API] CRM task status update failed", {
      customerId: id,
      taskId,
      message,
    });
    return NextResponse.json({ error: "Unable to update task" }, { status: 500 });
  }
}