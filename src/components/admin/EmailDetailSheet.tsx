"use client";

import { useEffect, useState } from "react";
import {
  Archive,
  ArchiveX,
  Loader2,
  Reply,
  Send,
  Star,
  StarOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { AdminLoadingState } from "@/components/admin/AdminAsyncState";
import type { AdminEmailLog } from "@/types/admin";

type Props = {
  emailId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (id: string, changes: Partial<AdminEmailLog>) => void;
};

const EMAIL_TYPE_LABELS: Record<string, string> = {
  booking_confirmation: "Booking Confirmation",
  owner_booking_notification: "Owner Notification",
  payment_notification: "Payment",
  contact_submission_notification: "Contact Form",
  password_reset_notification: "Password Reset",
  booking_claim_notification: "Booking Claim",
  welcome_email: "Welcome",
  photo_digest: "Photo Digest",
  report_card_notification: "Report Card",
  incident_notification: "Incident",
  automated_reminder: "Reminder",
  compose: "Composed",
  unknown: "Unknown",
};

export function EmailDetailSheet({ emailId, open, onClose, onUpdated }: Props) {
  const [email, setEmail] = useState<AdminEmailLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  useEffect(() => {
    if (!emailId || !open) {
      setEmail(null);
      setReplyOpen(false);
      setReplyContent("");
      return;
    }
    setLoading(true);
    fetch(`/api/admin/email-inbox/${emailId}`)
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: AdminEmailLog }) => {
        if (d.data) {
          setEmail(d.data);
          // Mark as read locally so parent list updates immediately
          onUpdated(emailId, { isRead: true });
        }
      })
      .catch(() => {
        toast.error("Failed to load email");
      })
      .finally(() => setLoading(false));
  }, [emailId, open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patch(changes: { isRead?: boolean; isStarred?: boolean; isArchived?: boolean }) {
    if (!emailId) return;
    try {
      const resp = await fetch(`/api/admin/email-inbox/${emailId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      if (!resp.ok) throw new Error("Update failed");
      setEmail((prev) => (prev ? { ...prev, ...changes } : prev));
      onUpdated(emailId, changes);
    } catch {
      toast.error("Could not update email");
    }
  }

  async function handleToggleStar() {
    if (!email) return;
    await patch({ isStarred: !email.isStarred });
  }

  async function handleArchive() {
    if (!email) return;
    await patch({ isArchived: !email.isArchived });
    if (!email.isArchived) {
      toast.success("Email archived");
      onClose();
    }
  }

  async function handleReply() {
    if (!emailId || !replyContent.trim()) return;
    setReplying(true);
    setReplyError(null);
    try {
      const resp = await fetch(`/api/admin/email-inbox/${emailId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent }),
      });
      if (!resp.ok) {
        const d = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Failed to send reply");
      }
      toast.success("Reply sent");
      setReplyOpen(false);
      setReplyContent("");
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setReplying(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col p-0 gap-0"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-base font-semibold leading-snug line-clamp-2 flex-1">
              {loading ? "Loading…" : (email?.subject ?? "Email")}
            </SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-7 w-7"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          {email && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
              <span>
                <span className="font-medium text-foreground">To:</span>{" "}
                {email.toAddress}
              </span>
              <span>
                <span className="font-medium text-foreground">From:</span>{" "}
                {email.fromAddress}
              </span>
              <Badge variant="outline" className="text-xs">
                {EMAIL_TYPE_LABELS[email.type] ?? email.type}
              </Badge>
              <span>{new Date(email.sentAt).toLocaleString()}</span>
              {email.status !== "sent" && (
                <Badge variant="destructive" className="text-xs">
                  {email.status}
                </Badge>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-6">
              <AdminLoadingState message="Loading email…" />
            </div>
          )}

          {!loading && email && (
            <div className="flex flex-col gap-0">
              {/* Action toolbar */}
              <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleStar}
                  className="h-8"
                >
                  {email.isStarred ? (
                    <>
                      <StarOff className="h-3.5 w-3.5 mr-1.5" />
                      Unstar
                    </>
                  ) : (
                    <>
                      <Star className="h-3.5 w-3.5 mr-1.5" />
                      Star
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleArchive}
                  className="h-8"
                >
                  {email.isArchived ? (
                    <>
                      <ArchiveX className="h-3.5 w-3.5 mr-1.5" />
                      Unarchive
                    </>
                  ) : (
                    <>
                      <Archive className="h-3.5 w-3.5 mr-1.5" />
                      Archive
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setReplyOpen((v) => !v)}
                  className="h-8"
                >
                  <Reply className="h-3.5 w-3.5 mr-1.5" />
                  Reply
                </Button>
              </div>

              {/* Inline reply composer */}
              {replyOpen && (
                <div className="px-6 py-4 border-b bg-muted/20 space-y-3">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write your reply…"
                    rows={5}
                    maxLength={10_000}
                    autoFocus
                  />
                  {replyError && (
                    <p className="text-sm text-destructive">{replyError}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {replyContent.length} / 10,000
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setReplyOpen(false);
                          setReplyContent("");
                          setReplyError(null);
                        }}
                        disabled={replying}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleReply}
                        disabled={replying || !replyContent.trim()}
                      >
                        {replying ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Send Reply
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Email HTML rendered in sandboxed iframe */}
              <div className="px-4 py-4">
                <iframe
                  srcDoc={email.html ?? ""}
                  sandbox="allow-same-origin"
                  className="w-full min-h-[500px] border-none rounded-lg bg-white"
                  title="Email content"
                  onLoad={(e) => {
                    const iframe = e.currentTarget;
                    const body = iframe.contentDocument?.body;
                    if (body) {
                      iframe.style.height = `${body.scrollHeight + 32}px`;
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
