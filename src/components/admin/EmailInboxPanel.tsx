"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Inbox,
  PenSquare,
  RefreshCw,
  Search,
  Send,
  Star,
  StarOff,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdminLoadingState,
  AdminErrorState,
  AdminEmptyState,
} from "@/components/admin/AdminAsyncState";
import { EmailDetailSheet } from "@/components/admin/EmailDetailSheet";
import { EmailComposeModal } from "@/components/admin/EmailComposeModal";
import type { AdminEmailLog } from "@/types/admin";

type Folder = "inbox" | "sent" | "starred" | "archived";

const FOLDER_OPTIONS: { value: Folder; label: string; icon: React.ReactNode }[] = [
  { value: "inbox", label: "Inbox", icon: <Inbox className="h-3.5 w-3.5" /> },
  { value: "sent", label: "Sent", icon: <Send className="h-3.5 w-3.5" /> },
  { value: "starred", label: "Starred", icon: <Star className="h-3.5 w-3.5" /> },
  { value: "archived", label: "Archived", icon: <Archive className="h-3.5 w-3.5" /> },
];

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
};

const EMAIL_TYPES = Object.entries(EMAIL_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function EmailInboxPanel() {
  const [emails, setEmails] = useState<AdminEmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder>("sent");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ folder, limit: "200" });
      if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);
      const resp = await fetch(`/api/admin/email-inbox?${params.toString()}`);
      if (!resp.ok) throw new Error("Failed to load inbox");
      const data = (await resp.json()) as {
        success?: boolean;
        data?: AdminEmailLog[];
        unreadCount?: number;
      };
      setEmails(data.data ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [folder, typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return emails;
    const q = search.trim().toLowerCase();
    return emails.filter(
      (e) =>
        e.toAddress.toLowerCase().includes(q) ||
        e.fromAddress.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q),
    );
  }, [emails, search]);

  function handleEmailUpdated(id: string, changes: Partial<AdminEmailLog>) {
    setEmails((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...changes } : e)),
    );
    if (changes.isRead === true) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  }

  async function toggleStar(e: React.MouseEvent, email: AdminEmailLog) {
    e.stopPropagation();
    try {
      const resp = await fetch(`/api/admin/email-inbox/${email.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred: !email.isStarred }),
      });
      if (!resp.ok) throw new Error("Update failed");
      handleEmailUpdated(email.id, { isStarred: !email.isStarred });
    } catch {
      toast.error("Could not update email");
    }
  }

  const folderLabel = FOLDER_OPTIONS.find((f) => f.value === folder)?.label ?? folder;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Email Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Inbox shows unread emails. Sent shows full history.
            {unreadCount > 0 && (
              <span className="ml-2 font-medium text-foreground">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => setShowCompose(true)}>
          <PenSquare className="h-4 w-4 mr-1.5" />
          Compose
        </Button>
      </div>

      {/* Folder selector */}
      <div className="flex flex-wrap gap-2">
        {FOLDER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={folder === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFolder(opt.value)}
            className="gap-1.5"
          >
            {opt.icon}
            {opt.label}
            {opt.value === "inbox" && unreadCount > 0 && (
              <Badge
                variant={folder === "inbox" ? "secondary" : "default"}
                className="ml-1 h-4 px-1.5 text-xs"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by address or subject…"
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {EMAIL_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={load} title="Refresh">
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      {/* Async states */}
      {loading && <AdminLoadingState message="Loading emails…" />}
      {!loading && error && (
        <AdminErrorState
          title="Unable to load inbox"
          message={error}
          action={{ label: "Retry", onAction: load }}
        />
      )}
      {!loading && !error && filtered.length === 0 && (
        <AdminEmptyState
          title={
            folder === "inbox" && typeFilter === "all"
              ? "All caught up"
              : `No emails in ${folderLabel.toLowerCase()}`
          }
          message={
            typeFilter !== "all"
              ? "Try removing the type filter or switching folders."
              : folder === "inbox"
              ? "No unread emails — open the Sent folder to view full history."
              : "Emails will appear here once the system sends them."
          }
          action={
            typeFilter !== "all"
              ? { label: "Clear filter", onAction: () => setTypeFilter("all") }
              : folder === "inbox"
              ? { label: "View Sent", onAction: () => setFolder("sent") }
              : undefined
          }
        />
      )}

      {/* Email table */}
      {!loading && !error && filtered.length > 0 && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">
              {folderLabel}{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({filtered.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 pl-4" />
                  <TableHead>To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Sent</TableHead>
                  <TableHead className="w-16 text-right pr-4">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((email) => (
                  <TableRow
                    key={email.id}
                    className={
                      !email.isRead
                        ? "font-medium bg-primary/5 hover:bg-primary/10 cursor-pointer"
                        : "cursor-pointer"
                    }
                    onClick={() => setSelectedEmailId(email.id)}
                  >
                    {/* Star */}
                    <TableCell className="pl-4 pr-0">
                      <button
                        onClick={(e) => void toggleStar(e, email)}
                        className="text-muted-foreground hover:text-yellow-500 transition-colors"
                        aria-label={email.isStarred ? "Unstar" : "Star"}
                      >
                        {email.isStarred ? (
                          <StarOff className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />
                        ) : (
                          <Star className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </TableCell>

                    {/* To */}
                    <TableCell className="text-sm max-w-[140px] truncate">
                      {email.toAddress}
                    </TableCell>

                    {/* Subject */}
                    <TableCell className="max-w-[200px] md:max-w-xs text-sm truncate">
                      {email.subject}
                    </TableCell>

                    {/* Type */}
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {EMAIL_TYPE_LABELS[email.type] ?? email.type}
                      </Badge>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant={email.status === "sent" ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {email.status}
                      </Badge>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(email.sentAt)}
                    </TableCell>

                    {/* View */}
                    <TableCell className="text-right pr-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmailId(email.id);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Email detail sheet */}
      <EmailDetailSheet
        emailId={selectedEmailId}
        open={selectedEmailId !== null}
        onClose={() => setSelectedEmailId(null)}
        onUpdated={handleEmailUpdated}
      />

      {/* Compose modal */}
      <EmailComposeModal
        open={showCompose}
        onClose={() => setShowCompose(false)}
        onSent={load}
      />
    </div>
  );
}
