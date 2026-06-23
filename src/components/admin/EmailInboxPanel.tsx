"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCheck,
  Inbox,
  PenSquare,
  RefreshCw,
  Search,
  Send,
  Settings,
  Star,
  StarOff,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { AdminEmailLog, EmailInboxPageResponse } from "@/types/admin";

type Folder = "inbox" | "sent" | "starred" | "archived";

const LIMIT = 50;

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
  vaccine_expiry_reminder: "Vaccine Reminder",
  compose: "Composed",
  inbound: "Inbound",
};

const EMAIL_TYPES = Object.entries(EMAIL_TYPE_LABELS).map(([value, label]) => ({ value, label }));

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface ComposeForwardProps {
  to: string;
  subject: string;
  html: string;
}

export function EmailInboxPanel() {
  const [emails, setEmails] = useState<AdminEmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder>("sent");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [forwardProps, setForwardProps] = useState<ComposeForwardProps | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
  }, [search]);

  const load = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ folder, page: String(p), limit: String(LIMIT) });
      if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const resp = await fetch(`/api/admin/email-inbox?${params.toString()}`);
      if (!resp.ok) throw new Error("Failed to load inbox");
      const data = (await resp.json()) as EmailInboxPageResponse;
      setEmails(data.data ?? []);
      setTotal(data.total ?? 0);
      setUnreadCount(data.unreadCount ?? 0);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [folder, typeFilter, debouncedSearch, dateFrom, dateTo, page]);

  useEffect(() => {
    setPage(1);
  }, [folder, typeFilter, debouncedSearch, dateFrom, dateTo]);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  function handleEmailUpdated(id: string, changes: Partial<AdminEmailLog>) {
    setEmails((prev) => prev.map((e) => (e.id === id ? { ...e, ...changes } : e)));
    if (changes.isRead === true) setUnreadCount((c) => Math.max(0, c - 1));
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

  function toggleSelect(e: React.MouseEvent | React.ChangeEvent, id: string) {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map((e) => e.id)));
    }
  }

  async function bulkAction(action: string) {
    if (selectedIds.size === 0) return;
    try {
      const resp = await fetch("/api/admin/email-inbox/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds], action }),
      });
      if (!resp.ok) throw new Error("Bulk action failed");
      const data = (await resp.json()) as { updated: number };
      toast.success(`Updated ${data.updated} email${data.updated !== 1 ? "s" : ""}`);
      void load(page);
    } catch {
      toast.error("Bulk action failed");
    }
  }

  function handleForward(to: string, subject: string, html: string) {
    setForwardProps({ to, subject, html });
    setShowCompose(true);
  }

  const folderLabel = FOLDER_OPTIONS.find((f) => f.value === folder)?.label ?? folder;
  const totalPages = Math.ceil(total / LIMIT);
  const startRow = (page - 1) * LIMIT + 1;
  const endRow = Math.min(page * LIMIT, total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Email Inbox</h1>
          <p className="text-sm text-muted-foreground">
            Inbox shows emails received from customers. Sent shows full outbound history.
            {unreadCount > 0 && (
              <span className="ml-2 font-medium text-foreground">{unreadCount} unread</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/inbox/settings">
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </Link>
          </Button>
          <Button onClick={() => { setForwardProps(null); setShowCompose(true); }}>
            <PenSquare className="h-4 w-4 mr-1.5" />
            Compose
          </Button>
        </div>
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
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {EMAIL_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-36"
          title="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-36"
          title="To date"
        />
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="icon" onClick={() => { setDateFrom(""); setDateTo(""); }}>
            <X className="h-4 w-4" />
          </Button>
        )}
        <Button variant="outline" size="icon" onClick={() => load(page)} title="Refresh">
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">Refresh</span>
        </Button>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex gap-2 ml-2">
            <Button size="sm" variant="outline" onClick={() => void bulkAction("archive")}>
              <Archive className="h-3.5 w-3.5 mr-1.5" />Archive
            </Button>
            <Button size="sm" variant="outline" onClick={() => void bulkAction("mark_read")}>
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />Mark Read
            </Button>
            <Button size="sm" variant="outline" onClick={() => void bulkAction("star")}>
              <Star className="h-3.5 w-3.5 mr-1.5" />Star
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelectedIds(new Set())}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Async states */}
      {loading && <AdminLoadingState message="Loading emails…" />}
      {!loading && error && (
        <AdminErrorState
          title="Unable to load inbox"
          message={error}
          action={{ label: "Retry", onAction: () => load(page) }}
        />
      )}
      {!loading && !error && emails.length === 0 && (
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
              ? "No inbound emails — customer replies and inquiries will appear here."
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
      {!loading && !error && emails.length > 0 && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">
              {folderLabel}{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({total} total)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8 pl-4">
                    <Checkbox
                      checked={selectedIds.size === emails.length && emails.length > 0}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="w-8" />
                  <TableHead>{folder === "inbox" ? "From" : "To"}</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Sent</TableHead>
                  <TableHead className="w-16 text-right pr-4">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <TableRow
                    key={email.id}
                    className={
                      !email.isRead
                        ? "font-medium bg-primary/5 hover:bg-primary/10 cursor-pointer"
                        : "cursor-pointer"
                    }
                    onClick={() => setSelectedEmailId(email.id)}
                  >
                    {/* Checkbox */}
                    <TableCell className="pl-4 pr-0" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(email.id)}
                        onCheckedChange={(e) => toggleSelect(e as unknown as React.MouseEvent, email.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Select email"
                      />
                    </TableCell>

                    {/* Star */}
                    <TableCell className="pl-1 pr-0">
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

                    {/* From / To — direction-aware */}
                    <TableCell className="text-sm max-w-[140px] truncate">
                      {email.direction === "inbound" ? email.fromAddress : email.toAddress}
                    </TableCell>

                    {/* Subject */}
                    <TableCell className="max-w-[200px] md:max-w-xs text-sm truncate">
                      {email.subject}
                      {email.attachments && (email.attachments as unknown[]).length > 0 && (
                        <span className="ml-1.5 text-muted-foreground text-xs">📎</span>
                      )}
                    </TableCell>

                    {/* Type + direction icon */}
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        {email.direction === "inbound" ? (
                          <ArrowDownLeft className="h-3 w-3 text-blue-500 shrink-0" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        )}
                        <Badge variant="outline" className="text-xs whitespace-nowrap">
                          {EMAIL_TYPE_LABELS[email.type] ?? email.type}
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant={
                          email.status === "sent" || email.status === "received"
                            ? "secondary"
                            : "destructive"
                        }
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

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {startRow}–{endRow} of {total}</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="flex items-center px-2 text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Email detail sheet */}
      <EmailDetailSheet
        emailId={selectedEmailId}
        open={selectedEmailId !== null}
        onClose={() => setSelectedEmailId(null)}
        onUpdated={handleEmailUpdated}
        onForward={handleForward}
      />

      {/* Compose / forward modal */}
      <EmailComposeModal
        open={showCompose}
        onClose={() => { setShowCompose(false); setForwardProps(null); }}
        onSent={() => load(page)}
        defaultHtml={forwardProps?.html}
        defaultSubject={forwardProps?.subject ? `Fwd: ${forwardProps.subject}` : undefined}
      />
    </div>
  );
}
