"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AdminErrorState, AdminLoadingState } from "@/components/admin/AdminAsyncState";

type Campaign = {
  id: string;
  name: string;
  channel: "email" | "sms";
  status: "draft" | "scheduled" | "sent" | "cancelled";
  subject: string | null;
  body: string;
  segmentId: string | null;
  recipientCount: number;
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
};

type Segment = {
  id: string;
  name: string;
};

type CampaignRecipient = {
  id: string;
  userId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  status: "pending" | "sent" | "failed" | "skipped";
  sentAt: string | null;
  error: string | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  createdAt: string;
};

type CampaignRecipientAttempt = {
  id: string;
  recipientId: string;
  campaignId: string;
  userId: string;
  channel: "email" | "sms";
  status: "sent" | "failed" | "retry_queued";
  errorCode: string | null;
  errorDetail: string | null;
  attemptedAt: string;
  createdAt: string;
};

type CampaignRecipientSummary = {
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
  total: number;
};

type CampaignRecipientPagination = {
  offset: number;
  limit: number;
  hasMore: boolean;
  totalFiltered: number;
};

type CampaignRecipientAttemptPagination = {
  offset: number;
  limit: number;
  hasMore: boolean;
  total: number;
};

export function CrmCampaignsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [operationMessage, setOperationMessage] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [expandedCampaignId, setExpandedCampaignId] = useState("");
  const [recipientStatusFilter, setRecipientStatusFilter] = useState<"all" | "pending" | "sent" | "failed" | "skipped">("all");
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [recipientSummary, setRecipientSummary] = useState<CampaignRecipientSummary | null>(null);
  const [expandedRecipientId, setExpandedRecipientId] = useState("");
  const [loadingRecipientAttemptsId, setLoadingRecipientAttemptsId] = useState("");
  const [recipientAttempts, setRecipientAttempts] = useState<Record<string, CampaignRecipientAttempt[]>>({});
  const [recipientAttemptPagination, setRecipientAttemptPagination] = useState<
    Record<string, CampaignRecipientAttemptPagination>
  >({});
  const [recipientPagination, setRecipientPagination] = useState<CampaignRecipientPagination>({
    offset: 0,
    limit: 50,
    hasMore: false,
    totalFiltered: 0,
  });

  const [name, setName] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [segmentId, setSegmentId] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");

  const segmentNameById = useMemo(() => {
    return new Map(segments.map((segment) => [segment.id, segment.name]));
  }, [segments]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [campaignRes, segmentRes] = await Promise.all([
        fetch("/api/admin/crm/campaigns", { cache: "no-store" }),
        fetch("/api/admin/crm/segments", { cache: "no-store" }),
      ]);

      const campaignData = (await campaignRes.json()) as { campaigns?: Campaign[]; error?: string };
      const segmentData = (await segmentRes.json()) as { segments?: Segment[]; error?: string };

      if (!campaignRes.ok) {
        throw new Error(campaignData.error ?? "Unable to load campaigns");
      }

      if (!segmentRes.ok) {
        throw new Error(segmentData.error ?? "Unable to load segments");
      }

      setCampaigns(campaignData.campaigns ?? []);
      setSegments(segmentData.segments ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load campaigns");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createCampaign() {
    if (!name.trim() || !body.trim()) {
      setError("Campaign name and body are required.");
      return;
    }

    try {
      const response = await fetch("/api/admin/crm/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          channel,
          subject: subject.trim() || undefined,
          body: body.trim(),
          segmentId: segmentId || undefined,
          scheduledFor: scheduledFor.trim() || undefined,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create campaign");
      }

      setName("");
      setChannel("email");
      setSubject("");
      setBody("");
      setSegmentId("");
      setScheduledFor("");
      setOperationMessage("Campaign created.");
      await loadData();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create campaign");
    }
  }

  async function updateStatus(campaignId: string, status: Campaign["status"]) {
    try {
      const response = await fetch("/api/admin/crm/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, status }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to update campaign");
      }

      setOperationMessage(`Campaign moved to ${status}.`);
      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update campaign");
    }
  }

  async function loadRecipients(
    campaignId: string,
    statusFilter?: "all" | "pending" | "sent" | "failed" | "skipped",
    offset?: number,
  ) {
    const effectiveFilter = statusFilter ?? recipientStatusFilter;
    const effectiveOffset = Math.max(offset ?? recipientPagination.offset, 0);

    try {
      const params = new URLSearchParams({
        limit: String(recipientPagination.limit),
        offset: String(effectiveOffset),
      });
      if (effectiveFilter !== "all") {
        params.set("status", effectiveFilter);
      }

      const response = await fetch(`/api/admin/crm/campaigns/${campaignId}/recipients?${params.toString()}`, {
        cache: "no-store",
      });

      const data = (await response.json()) as {
        recipients?: CampaignRecipient[];
        summary?: CampaignRecipientSummary;
        pagination?: CampaignRecipientPagination;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load campaign recipients");
      }

      setRecipients(data.recipients ?? []);
      setRecipientSummary(data.summary ?? { pending: 0, sent: 0, failed: 0, skipped: 0, total: 0 });
      setRecipientPagination(
        data.pagination ?? {
          offset: effectiveOffset,
          limit: recipientPagination.limit,
          hasMore: false,
          totalFiltered: data.recipients?.length ?? 0,
        },
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load campaign recipients");
    }
  }

  async function retryFailedRecipients(campaignId: string, recipientIds?: string[]) {
    try {
      const response = await fetch(`/api/admin/crm/campaigns/${campaignId}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "retryFailed",
          recipientIds,
        }),
      });

      const data = (await response.json()) as { retried?: number; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to retry failed recipients");
      }

      setOperationMessage(`Retried ${data.retried ?? 0} failed recipients.`);
      await loadRecipients(campaignId, undefined, recipientPagination.offset);
      if (expandedRecipientId && (!recipientIds || recipientIds.includes(expandedRecipientId))) {
        await loadRecipientAttempts(campaignId, expandedRecipientId);
      }
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Unable to retry failed recipients");
    }
  }

  async function loadRecipientAttempts(campaignId: string, recipientId: string, offset = 0) {
    setLoadingRecipientAttemptsId(recipientId);

    try {
      const currentPagination = recipientAttemptPagination[recipientId];
      const limit = currentPagination?.limit ?? 10;
      const params = new URLSearchParams({ limit: String(limit), offset: String(Math.max(offset, 0)) });
      const response = await fetch(
        `/api/admin/crm/campaigns/${campaignId}/recipients/${recipientId}/attempts?${params.toString()}`,
        { cache: "no-store" },
      );

      const data = (await response.json()) as {
        attempts?: CampaignRecipientAttempt[];
        pagination?: CampaignRecipientAttemptPagination;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load recipient attempts");
      }

      setRecipientAttempts((current) => ({
        ...current,
        [recipientId]: data.attempts ?? [],
      }));
      setRecipientAttemptPagination((current) => ({
        ...current,
        [recipientId]:
          data.pagination ?? {
            offset: Math.max(offset, 0),
            limit,
            hasMore: false,
            total: data.attempts?.length ?? 0,
          },
      }));
    } catch (attemptError) {
      setError(attemptError instanceof Error ? attemptError.message : "Unable to load recipient attempts");
    } finally {
      setLoadingRecipientAttemptsId("");
    }
  }

  async function refreshAudience(campaignId: string) {
    try {
      const response = await fetch(`/api/admin/crm/campaigns/${campaignId}/recipients`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        recipientCount?: number;
        added?: number;
        skipped?: number;
        reactivated?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to refresh campaign audience");
      }

      setOperationMessage(
        `Audience refreshed. Added ${data.added ?? 0}, skipped ${data.skipped ?? 0}, reactivated ${data.reactivated ?? 0}.`,
      );
      await loadData();
      await loadRecipients(campaignId, undefined, recipientPagination.offset);
      setError("");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh campaign audience");
    }
  }

  async function processScheduledCampaigns() {
    try {
      const response = await fetch("/api/admin/crm/campaigns/process-scheduled", {
        method: "POST",
      });
      const data = (await response.json()) as {
        processedCampaigns?: number;
        processedRecipientRows?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to process scheduled campaigns");
      }

      setOperationMessage(
        `Processed ${data.processedCampaigns ?? 0} scheduled campaigns and ${data.processedRecipientRows ?? 0} recipient deliveries.`,
      );
      await loadData();
      if (expandedCampaignId) {
        await loadRecipients(expandedCampaignId, undefined, recipientPagination.offset);
      }
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : "Unable to process scheduled campaigns");
    }
  }

  async function exportRecipientsCsv(campaignId: string) {
    try {
      const response = await fetch(`/api/admin/crm/campaigns/${campaignId}/recipients/export`, {
        method: "GET",
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Unable to export campaign recipients");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `campaign-${campaignId}-recipients.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setOperationMessage("Recipient audit CSV downloaded.");
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Unable to export campaign recipients");
    }
  }

  async function dispatchPendingRecipients(campaignId: string) {
    try {
      const response = await fetch(`/api/admin/crm/campaigns/${campaignId}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispatchPending" }),
      });

      const data = (await response.json()) as {
        processed?: number;
        sent?: number;
        failed?: number;
        skipped?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to dispatch pending recipients");
      }

      setOperationMessage(
        `Dispatch finished. Processed ${data.processed ?? 0}: sent ${data.sent ?? 0}, failed ${data.failed ?? 0}, skipped ${data.skipped ?? 0}.`,
      );
      await loadData();
      await loadRecipients(campaignId, undefined, recipientPagination.offset);
    } catch (dispatchError) {
      setError(dispatchError instanceof Error ? dispatchError.message : "Unable to dispatch pending recipients");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">CRM Campaigns</h1>
          <p className="text-sm text-muted-foreground">Build segmented outreach drafts and schedule sends.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void processScheduledCampaigns()}>
            Process Scheduled Now
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/crm">Back to CRM</Link>
          </Button>
        </div>
      </div>

      {error ? <AdminErrorState message={error} action={{ label: "Retry", onAction: () => void loadData() }} /> : null}
      {operationMessage ? <p className="text-sm text-emerald-600">{operationMessage}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Create Campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            <Input placeholder="Campaign name" value={name} onChange={(event) => setName(event.target.value)} />
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={channel} onChange={(event) => setChannel(event.target.value as "email" | "sms") }>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={segmentId} onChange={(event) => setSegmentId(event.target.value)}>
              <option value="">All customers</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>{segment.name}</option>
              ))}
            </select>
          </div>
          <Input placeholder="Subject (optional)" value={subject} onChange={(event) => setSubject(event.target.value)} />
          <Textarea placeholder="Campaign message body" value={body} onChange={(event) => setBody(event.target.value)} rows={4} />
          <Input placeholder="Scheduled date (ISO, optional)" value={scheduledFor} onChange={(event) => setScheduledFor(event.target.value)} />
          <Button onClick={() => void createCampaign()}>Create Campaign</Button>
        </CardContent>
      </Card>

      {loading ? (
        <AdminLoadingState message="Loading campaigns..." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{campaign.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{campaign.channel}</Badge>
                    <Badge variant={campaign.status === "sent" ? "secondary" : "outline"}>{campaign.status}</Badge>
                  </div>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{campaign.subject ?? "No subject"}</p>
                <p className="mt-1 text-sm">{campaign.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Audience: {campaign.recipientCount} recipients
                  {campaign.segmentId
                    ? ` · Segment ${segmentNameById.get(campaign.segmentId) ?? campaign.segmentId}`
                    : " · All subscribed customers"}
                </p>
                {campaign.scheduledFor ? (
                  <p className="text-xs text-muted-foreground">
                    Scheduled: {new Date(campaign.scheduledFor).toLocaleString()}
                  </p>
                ) : null}
                {campaign.sentAt ? (
                  <p className="text-xs text-muted-foreground">
                    Sent: {new Date(campaign.sentAt).toLocaleString()}
                  </p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const next = expandedCampaignId === campaign.id ? "" : campaign.id;
                      setExpandedCampaignId(next);
                      setRecipientStatusFilter("all");
                      setRecipientPagination((current) => ({ ...current, offset: 0 }));
                      if (next) {
                        void loadRecipients(campaign.id, "all", 0);
                      }
                    }}
                  >
                    {expandedCampaignId === campaign.id ? "Hide Recipients" : "View Recipients"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void refreshAudience(campaign.id)}>
                    Refresh Audience
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void dispatchPendingRecipients(campaign.id)}>
                    Dispatch Pending
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void exportRecipientsCsv(campaign.id)}>
                    Export Recipients CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void updateStatus(campaign.id, "draft")}>Draft</Button>
                  <Button size="sm" variant="outline" onClick={() => void updateStatus(campaign.id, "scheduled")}>Schedule</Button>
                  <Button size="sm" variant="outline" onClick={() => void updateStatus(campaign.id, "sent")}>Mark Sent</Button>
                  <Button size="sm" variant="outline" onClick={() => void updateStatus(campaign.id, "cancelled")}>Cancel</Button>
                </div>
                {expandedCampaignId === campaign.id ? (
                  <div className="mt-3 rounded-md border p-2">
                    <div className="mb-2 flex flex-wrap items-center gap-1">
                      <Badge variant="outline">Total {recipientSummary?.total ?? 0}</Badge>
                      <Badge variant="outline">Pending {recipientSummary?.pending ?? 0}</Badge>
                      <Badge variant="outline">Sent {recipientSummary?.sent ?? 0}</Badge>
                      <Badge variant="outline">Failed {recipientSummary?.failed ?? 0}</Badge>
                      <Badge variant="outline">Skipped {recipientSummary?.skipped ?? 0}</Badge>
                    </div>
                    {(recipientSummary?.failed ?? 0) > 0 ? (
                      <div className="mb-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void retryFailedRecipients(campaign.id)}
                        >
                          Retry All Failed
                        </Button>
                      </div>
                    ) : null}
                    <div className="mb-2 flex flex-wrap gap-1">
                      {(["all", "pending", "sent", "failed", "skipped"] as const).map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={recipientStatusFilter === status ? "default" : "outline"}
                          onClick={() => {
                            setRecipientStatusFilter(status);
                            setRecipientPagination((current) => ({ ...current, offset: 0 }));
                            void loadRecipients(campaign.id, status, 0);
                          }}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2">
                      {recipients.map((recipient) => (
                        <div key={recipient.id} className="rounded border p-2 text-xs">
                          <p className="font-medium">
                            {recipient.customerName ?? recipient.customerEmail ?? recipient.userId}
                          </p>
                          <p className="text-muted-foreground">
                            {recipient.customerEmail ?? "No email"}
                            {recipient.customerPhone ? ` · ${recipient.customerPhone}` : ""}
                          </p>
                          <p className="text-muted-foreground">
                            Status: {recipient.status}
                            {recipient.sentAt ? ` · Sent ${new Date(recipient.sentAt).toLocaleString()}` : ""}
                          </p>
                          <p className="text-muted-foreground">
                            Attempts: {recipient.attemptCount}
                            {recipient.lastAttemptAt
                              ? ` · Last attempt ${new Date(recipient.lastAttemptAt).toLocaleString()}`
                              : ""}
                          </p>
                          {recipient.status === "failed" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-1 h-6 px-2 text-xs"
                              onClick={() => void retryFailedRecipients(campaign.id, [recipient.id])}
                            >
                              Retry
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-1 h-6 px-2 text-xs"
                            onClick={() => {
                              if (expandedRecipientId === recipient.id) {
                                setExpandedRecipientId("");
                                return;
                              }

                              setExpandedRecipientId(recipient.id);
                              void loadRecipientAttempts(campaign.id, recipient.id, 0);
                            }}
                          >
                            {expandedRecipientId === recipient.id ? "Hide Attempts" : "View Attempts"}
                          </Button>
                          {recipient.error ? <p className="text-destructive">{recipient.error}</p> : null}
                          {expandedRecipientId === recipient.id ? (
                            <div className="mt-2 rounded border bg-muted/30 p-2">
                              {loadingRecipientAttemptsId === recipient.id ? (
                                <p className="text-xs text-muted-foreground">Loading attempts...</p>
                              ) : (recipientAttempts[recipient.id] ?? []).length > 0 ? (
                                <div className="space-y-1">
                                  {(recipientAttempts[recipient.id] ?? []).map((attempt) => (
                                    <div key={attempt.id} className="rounded border bg-background p-1">
                                      <p className="font-medium">
                                        {attempt.status} · {new Date(attempt.attemptedAt).toLocaleString()}
                                      </p>
                                      <p className="text-muted-foreground">Channel: {attempt.channel}</p>
                                      {attempt.errorCode ? (
                                        <p className="text-muted-foreground">
                                          {attempt.errorCode}
                                          {attempt.errorDetail ? ` · ${attempt.errorDetail}` : ""}
                                        </p>
                                      ) : null}
                                    </div>
                                  ))}
                                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>
                                      Showing {(recipientAttempts[recipient.id] ?? []).length} of {recipientAttemptPagination[recipient.id]?.total ?? 0}
                                    </span>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-xs"
                                        disabled={(recipientAttemptPagination[recipient.id]?.offset ?? 0) <= 0}
                                        onClick={() => {
                                          const pagination = recipientAttemptPagination[recipient.id];
                                          const nextOffset = Math.max(
                                            (pagination?.offset ?? 0) - (pagination?.limit ?? 10),
                                            0,
                                          );
                                          void loadRecipientAttempts(campaign.id, recipient.id, nextOffset);
                                        }}
                                      >
                                        Previous
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 px-2 text-xs"
                                        disabled={!recipientAttemptPagination[recipient.id]?.hasMore}
                                        onClick={() => {
                                          const pagination = recipientAttemptPagination[recipient.id];
                                          const nextOffset = (pagination?.offset ?? 0) + (pagination?.limit ?? 10);
                                          void loadRecipientAttempts(campaign.id, recipient.id, nextOffset);
                                        }}
                                      >
                                        Next
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No attempts recorded yet.</p>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ))}
                      {recipients.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No recipients for this filter.</p>
                      ) : null}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Showing {recipients.length} of {recipientPagination.totalFiltered}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={recipientPagination.offset <= 0}
                          onClick={() => {
                            const previousOffset = Math.max(
                              recipientPagination.offset - recipientPagination.limit,
                              0,
                            );
                            void loadRecipients(campaign.id, undefined, previousOffset);
                          }}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={!recipientPagination.hasMore}
                          onClick={() => {
                            const nextOffset = recipientPagination.offset + recipientPagination.limit;
                            void loadRecipients(campaign.id, undefined, nextOffset);
                          }}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
            {campaigns.length === 0 ? <p className="text-sm text-muted-foreground">No campaigns yet.</p> : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
