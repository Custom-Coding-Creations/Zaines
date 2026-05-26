"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "@/components/admin/AdminAsyncState";

type CrmTimelineItem = {
  id: string;
  type:
    | "booking"
    | "message"
    | "activity"
    | "incident"
    | "contact_submission"
    | "note"
    | "interaction"
    | "opportunity";
  title: string;
  detail: string;
  timestamp: string;
};

type CrmNote = {
  noteId: string;
  userId: string;
  content: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
};

type CrmTask = {
  taskId: string;
  userId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: "open" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  createdById: string;
  createdByName: string;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAt: string;
  completedAt: string | null;
};

type CrmInteraction = {
  id: string;
  userId: string;
  channel: string;
  direction: string;
  subject: string | null;
  content: string;
  occurredAt: string;
  createdByName: string | null;
};

type CrmOpportunity = {
  id: string;
  userId: string;
  customerName: string | null;
  title: string;
  description: string | null;
  stage: "new" | "qualified" | "proposal" | "won" | "lost";
  source: string | null;
  estimatedValue: number | null;
  expectedCloseAt: string | null;
  ownerName: string | null;
  createdAt: string;
};

type CrmTag = {
  id: string;
  name: string;
  color: string;
};

type CrmCustomerProfileResponse = {
  customer: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    loyaltyTier: string;
    createdAt: string;
    pets: Array<{ id: string; name: string; breed: string }>;
    totalBookings: number;
    totalSpent: number;
    tags: CrmTag[];
  };
  timeline: CrmTimelineItem[];
  notes: CrmNote[];
  tasks: CrmTask[];
  interactions: CrmInteraction[];
  opportunities: CrmOpportunity[];
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

type Props = {
  customerId: string;
};

export function CrmCustomerProfile({ customerId }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workspace, setWorkspace] = useState<CrmCustomerProfileResponse | null>(null);

  const [noteDraft, setNoteDraft] = useState("");
  const [taskTitleDraft, setTaskTitleDraft] = useState("");
  const [taskDescriptionDraft, setTaskDescriptionDraft] = useState("");
  const [taskDueAtDraft, setTaskDueAtDraft] = useState("");
  const [taskPriority, setTaskPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");

  const [interactionChannel, setInteractionChannel] = useState("email");
  const [interactionDirection, setInteractionDirection] = useState("outbound");
  const [interactionSubject, setInteractionSubject] = useState("");
  const [interactionContent, setInteractionContent] = useState("");

  const [tagOptions, setTagOptions] = useState<CrmTag[]>([]);
  const [selectedTagId, setSelectedTagId] = useState("");

  async function loadWorkspace() {
    setLoading(true);
    setError("");

    try {
      const [profileRes, tagsRes] = await Promise.all([
        fetch(`/api/admin/crm/customers/${customerId}`, { cache: "no-store" }),
        fetch(`/api/admin/crm/tags`, { cache: "no-store" }),
      ]);

      const profileData = (await profileRes.json()) as CrmCustomerProfileResponse & { error?: string };
      const tagsData = (await tagsRes.json()) as { tags?: CrmTag[]; error?: string };

      if (!profileRes.ok) {
        throw new Error(profileData.error ?? "Unable to load customer workspace");
      }

      if (!tagsRes.ok) {
        throw new Error(tagsData.error ?? "Unable to load CRM tags");
      }

      setWorkspace(profileData);
      setTagOptions(tagsData.tags ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load customer workspace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkspace();
  }, [customerId]);

  async function submitNote() {
    const content = noteDraft.trim();
    if (!content) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/crm/customers/${customerId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to save note");
      }

      setNoteDraft("");
      await loadWorkspace();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save note");
    }
  }

  async function submitTask() {
    const title = taskTitleDraft.trim();
    if (!title) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/crm/customers/${customerId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: taskDescriptionDraft.trim() || undefined,
          dueAt: taskDueAtDraft.trim() || undefined,
          priority: taskPriority,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create task");
      }

      setTaskTitleDraft("");
      setTaskDescriptionDraft("");
      setTaskDueAtDraft("");
      setTaskPriority("normal");
      await loadWorkspace();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to create task");
    }
  }

  async function updateTaskStatus(taskId: string, status: "open" | "completed") {
    try {
      const response = await fetch(`/api/admin/crm/customers/${customerId}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update task");
      }

      await loadWorkspace();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update task");
    }
  }

  async function submitInteraction() {
    const content = interactionContent.trim();
    if (!content) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/crm/customers/${customerId}/interactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: interactionChannel,
          direction: interactionDirection,
          subject: interactionSubject.trim() || undefined,
          content,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to log interaction");
      }

      setInteractionSubject("");
      setInteractionContent("");
      await loadWorkspace();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to log interaction");
    }
  }

  async function addTag() {
    if (!selectedTagId) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/crm/customers/${customerId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId: selectedTagId }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to assign tag");
      }

      setSelectedTagId("");
      await loadWorkspace();
    } catch (tagError) {
      setError(tagError instanceof Error ? tagError.message : "Unable to assign tag");
    }
  }

  async function removeTag(tagId: string) {
    try {
      const response = await fetch(`/api/admin/crm/customers/${customerId}/tags`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagId }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to remove tag");
      }

      await loadWorkspace();
    } catch (tagError) {
      setError(tagError instanceof Error ? tagError.message : "Unable to remove tag");
    }
  }

  const openTasks = useMemo(
    () => workspace?.tasks.filter((task) => task.status === "open") ?? [],
    [workspace],
  );

  if (loading) {
    return <AdminLoadingState message="Loading customer CRM workspace..." />;
  }

  if (error && !workspace) {
    return (
      <AdminErrorState
        message={error}
        action={{ label: "Retry", onAction: () => void loadWorkspace() }}
      />
    );
  }

  if (!workspace) {
    return (
      <AdminEmptyState
        title="Customer workspace unavailable"
        message="This customer may have been removed or does not have enough CRM data yet."
        action={{ label: "Back to CRM list", href: "/admin/crm" }}
      />
    );
  }

  const { customer, timeline, notes, tasks, interactions, opportunities } = workspace;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 px-0">
            <Link href="/admin/crm" className="inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to CRM list
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">{customer.name ?? customer.email ?? "Customer"}</h1>
          <p className="text-sm text-muted-foreground">
            {customer.email ?? "No email"} · {customer.phone ?? "No phone"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">Tier: {customer.loyaltyTier}</Badge>
          <Badge variant="outline">Bookings: {customer.totalBookings}</Badge>
          <Badge variant="outline">Spent: {formatCurrency(customer.totalSpent)}</Badge>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/crm/pipeline">Pipeline</Link>
          </Button>
        </div>
      </div>

      {error ? (
        <AdminErrorState
          title="CRM action issue"
          message={error}
          action={{ label: "Reload workspace", onAction: () => void loadWorkspace() }}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Address:</span>{" "}
              {[customer.address, customer.city, customer.state, customer.zip]
                .filter((value): value is string => Boolean(value))
                .join(", ") || "Not provided"}
            </p>
            <p>
              <span className="font-medium">Joined:</span>{" "}
              {new Date(customer.createdAt).toLocaleDateString()}
            </p>
            <p>
              <span className="font-medium">Pets:</span>{" "}
              {customer.pets.length > 0
                ? customer.pets.map((pet) => `${pet.name} (${pet.breed})`).join(", ")
                : "No pets"}
            </p>
            <div className="space-y-2 pt-2">
              <p className="font-medium">Tags</p>
              <div className="flex flex-wrap gap-1">
                {customer.tags.map((tag) => (
                  <button
                    key={tag.id}
                    className="inline-flex items-center rounded border px-2 py-1 text-xs"
                    onClick={() => void removeTag(tag.id)}
                    title="Remove tag"
                  >
                    {tag.name}
                  </button>
                ))}
                {customer.tags.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No tags assigned.</span>
                ) : null}
              </div>
              <div className="flex gap-2">
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={selectedTagId}
                  onChange={(event) => setSelectedTagId(event.target.value)}
                >
                  <option value="">Select tag</option>
                  {tagOptions
                    .filter((tag) => !customer.tags.some((assigned) => assigned.id === tag.id))
                    .map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                </select>
                <Button variant="outline" size="sm" onClick={() => void addTag()} disabled={!selectedTagId}>
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Unified Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <AdminEmptyState
                title="No timeline events yet"
                message="Bookings, messages, notes, interactions, and other activity will appear here."
              />
            ) : (
              <div className="max-h-[520px] space-y-3 overflow-auto pr-1">
                {timeline.map((event) => (
                  <div key={event.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{event.title}</p>
                      <Badge variant="outline">{event.type}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{event.detail || "No details"}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Internal Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Add a private CRM note for this customer..."
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              rows={4}
            />
            <Button onClick={() => void submitNote()} disabled={!noteDraft.trim()}>
              Add Note
            </Button>
            <div className="max-h-[240px] space-y-2 overflow-auto pr-1">
              {notes.map((note) => (
                <div key={note.noteId} className="rounded-md border p-3">
                  <p className="text-sm">{note.content}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {note.createdByName} · {new Date(note.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
              {notes.length === 0 ? <p className="text-sm text-muted-foreground">No notes yet.</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Internal Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Task title"
              value={taskTitleDraft}
              onChange={(event) => setTaskTitleDraft(event.target.value)}
            />
            <Textarea
              placeholder="Task description (optional)"
              value={taskDescriptionDraft}
              onChange={(event) => setTaskDescriptionDraft(event.target.value)}
              rows={3}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Due date (ISO)"
                value={taskDueAtDraft}
                onChange={(event) => setTaskDueAtDraft(event.target.value)}
              />
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={taskPriority}
                onChange={(event) =>
                  setTaskPriority(event.target.value as "low" | "normal" | "high" | "urgent")
                }
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <Button onClick={() => void submitTask()} disabled={!taskTitleDraft.trim()}>
              Create Task
            </Button>

            <p className="text-sm font-medium">Open Tasks ({openTasks.length})</p>
            <div className="max-h-[220px] space-y-2 overflow-auto pr-1">
              {tasks.map((task) => (
                <div key={task.taskId} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{task.title}</p>
                    <Badge variant={task.status === "completed" ? "secondary" : "outline"}>
                      {task.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Priority: {task.priority}</p>
                  {task.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                  ) : null}
                  <div className="mt-2">
                    {task.status === "open" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void updateTaskStatus(task.taskId, "completed")}
                      >
                        Mark Complete
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void updateTaskStatus(task.taskId, "open")}
                      >
                        Reopen
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {tasks.length === 0 ? <p className="text-sm text-muted-foreground">No tasks yet.</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interactions & Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={interactionChannel}
                onChange={(event) => setInteractionChannel(event.target.value)}
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="call">Call</option>
                <option value="in_person">In Person</option>
              </select>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={interactionDirection}
                onChange={(event) => setInteractionDirection(event.target.value)}
              >
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>
            </div>
            <Input
              placeholder="Interaction subject (optional)"
              value={interactionSubject}
              onChange={(event) => setInteractionSubject(event.target.value)}
            />
            <Textarea
              placeholder="Log interaction details"
              value={interactionContent}
              onChange={(event) => setInteractionContent(event.target.value)}
              rows={3}
            />
            <Button onClick={() => void submitInteraction()} disabled={!interactionContent.trim()}>
              Log Interaction
            </Button>

            <div className="max-h-[220px] space-y-2 overflow-auto pr-1">
              {interactions.map((item) => (
                <div key={item.id} className="rounded-md border p-3">
                  <p className="text-sm font-medium">{item.direction} {item.channel}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.subject ? `${item.subject} · ` : ""}{item.content}
                  </p>
                </div>
              ))}
              {interactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No interactions yet.</p>
              ) : null}
            </div>

            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">Opportunities</p>
              <p className="text-xs text-muted-foreground mt-1">
                {opportunities.length} linked opportunity records
              </p>
              <Button asChild variant="outline" size="sm" className="mt-2">
                <Link href="/admin/crm/pipeline">Open Pipeline</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
