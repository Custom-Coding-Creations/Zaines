"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Archive,
  ArchiveX,
  Bold,
  Download,
  Forward,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Paperclip,
  Reply,
  Send,
  Star,
  StarOff,
  Underline,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TiptapUnderline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AdminLoadingState } from "@/components/admin/AdminAsyncState";
import type { AdminEmailLog, EmailAttachmentMeta } from "@/types/admin";

type Props = {
  emailId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: (id: string, changes: Partial<AdminEmailLog>) => void;
  onForward?: (to: string, subject: string, html: string) => void;
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
  vaccine_expiry_reminder: "Vaccine Reminder",
  compose: "Composed",
  unknown: "Unknown",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function EmailDetailSheet({ emailId, open, onClose, onUpdated, onForward }: Props) {
  const [email, setEmail] = useState<AdminEmailLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replying, setReplying] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState<EmailAttachmentMeta[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const replyEditor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Placeholder.configure({ placeholder: "Write your reply…" }),
      TiptapUnderline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
    ],
    editorProps: {
      attributes: {
        class: "min-h-[140px] p-3 prose prose-sm max-w-none focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!emailId || !open) {
      setEmail(null);
      setReplyOpen(false);
      replyEditor?.commands.clearContent();
      setReplyAttachments([]);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/email-inbox/${emailId}`)
      .then((r) => r.json())
      .then((d: { success?: boolean; data?: AdminEmailLog }) => {
        if (d.data) {
          setEmail(d.data);
          onUpdated(emailId, { isRead: true });
        }
      })
      .catch(() => toast.error("Failed to load email"))
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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadingFile(true);
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const resp = await fetch("/api/admin/email-inbox/attachments", { method: "POST", body: fd });
        if (!resp.ok) throw new Error("Upload failed");
        const data = (await resp.json()) as EmailAttachmentMeta;
        setReplyAttachments((prev) => [...prev, data]);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleReply() {
    if (!emailId || !replyEditor) return;
    const html = replyEditor.getHTML();
    if (html === "<p></p>" || !html.trim()) {
      toast.error("Reply cannot be empty");
      return;
    }
    setReplying(true);
    try {
      const resp = await fetch(`/api/admin/email-inbox/${emailId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          html,
          attachments: replyAttachments.length ? replyAttachments : undefined,
        }),
      });
      if (!resp.ok) {
        const d = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Failed to send reply");
      }
      toast.success("Reply sent");
      setReplyOpen(false);
      replyEditor.commands.clearContent();
      setReplyAttachments([]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setReplying(false);
    }
  }

  function handleForwardClick() {
    if (!email || !onForward) return;
    const forwardHtml = `
      <br/>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
      <p style="color:#64748b;font-size:13px;">
        ---- Forwarded message ----<br/>
        From: ${email.fromAddress}<br/>
        To: ${email.toAddress}<br/>
        Subject: ${email.subject}<br/>
        Date: ${new Date(email.sentAt).toLocaleString()}
      </p>
      ${email.html ?? ""}
    `;
    onForward(email.toAddress, email.subject, forwardHtml);
  }

  const attachments = email?.attachments as EmailAttachmentMeta[] | null | undefined;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle className="text-base font-semibold leading-snug line-clamp-2 flex-1">
              {loading ? "Loading…" : (email?.subject ?? "Email")}
            </SheetTitle>
            <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          {email && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
              <span><span className="font-medium text-foreground">To:</span> {email.toAddress}</span>
              <span><span className="font-medium text-foreground">From:</span> {email.fromAddress}</span>
              {email.cc && (
                <span><span className="font-medium text-foreground">CC:</span> {email.cc}</span>
              )}
              <Badge variant="outline" className="text-xs">
                {EMAIL_TYPE_LABELS[email.type] ?? email.type}
              </Badge>
              <span>{new Date(email.sentAt).toLocaleString()}</span>
              {email.status !== "sent" && (
                <Badge variant="destructive" className="text-xs">{email.status}</Badge>
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
              <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => void patch({ isStarred: !email.isStarred })} className="h-8">
                  {email.isStarred ? <><StarOff className="h-3.5 w-3.5 mr-1.5" />Unstar</> : <><Star className="h-3.5 w-3.5 mr-1.5" />Star</>}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await patch({ isArchived: !email.isArchived });
                    if (!email.isArchived) { toast.success("Email archived"); onClose(); }
                  }}
                  className="h-8"
                >
                  {email.isArchived ? <><ArchiveX className="h-3.5 w-3.5 mr-1.5" />Unarchive</> : <><Archive className="h-3.5 w-3.5 mr-1.5" />Archive</>}
                </Button>
                <Button size="sm" onClick={() => setReplyOpen((v) => !v)} className="h-8">
                  <Reply className="h-3.5 w-3.5 mr-1.5" />Reply
                </Button>
                {onForward && (
                  <Button variant="outline" size="sm" onClick={handleForwardClick} className="h-8">
                    <Forward className="h-3.5 w-3.5 mr-1.5" />Forward
                  </Button>
                )}
              </div>

              {/* Attachments list */}
              {attachments && attachments.length > 0 && (
                <div className="px-6 py-3 border-b flex flex-wrap gap-2">
                  {attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-muted text-xs px-2.5 py-1.5 rounded-full hover:bg-muted/80 transition-colors"
                    >
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                      <span className="max-w-[160px] truncate">{att.filename}</span>
                      <span className="text-muted-foreground">({formatFileSize(att.size)})</span>
                      <Download className="h-3 w-3 text-muted-foreground ml-0.5" />
                    </a>
                  ))}
                </div>
              )}

              {/* Inline Tiptap reply composer */}
              {replyOpen && (
                <div className="px-6 py-4 border-b bg-muted/20 space-y-3">
                  {/* Mini toolbar */}
                  <div className="flex items-center gap-0.5 pb-1">
                    {[
                      { icon: <Bold className="h-3.5 w-3.5" />, action: () => replyEditor?.chain().focus().toggleBold().run(), active: replyEditor?.isActive("bold"), title: "Bold" },
                      { icon: <Italic className="h-3.5 w-3.5" />, action: () => replyEditor?.chain().focus().toggleItalic().run(), active: replyEditor?.isActive("italic"), title: "Italic" },
                      { icon: <Underline className="h-3.5 w-3.5" />, action: () => replyEditor?.chain().focus().toggleUnderline().run(), active: replyEditor?.isActive("underline"), title: "Underline" },
                      null,
                      { icon: <List className="h-3.5 w-3.5" />, action: () => replyEditor?.chain().focus().toggleBulletList().run(), active: replyEditor?.isActive("bulletList"), title: "Bullet list" },
                      { icon: <ListOrdered className="h-3.5 w-3.5" />, action: () => replyEditor?.chain().focus().toggleOrderedList().run(), active: replyEditor?.isActive("orderedList"), title: "Ordered list" },
                      null,
                      { icon: <AlignLeft className="h-3.5 w-3.5" />, action: () => replyEditor?.chain().focus().setTextAlign("left").run(), active: replyEditor?.isActive({ textAlign: "left" }), title: "Align left" },
                      { icon: <AlignCenter className="h-3.5 w-3.5" />, action: () => replyEditor?.chain().focus().setTextAlign("center").run(), active: replyEditor?.isActive({ textAlign: "center" }), title: "Align center" },
                      { icon: <AlignRight className="h-3.5 w-3.5" />, action: () => replyEditor?.chain().focus().setTextAlign("right").run(), active: replyEditor?.isActive({ textAlign: "right" }), title: "Align right" },
                    ].map((btn, i) =>
                      btn === null ? (
                        <Separator key={`sep-${i}`} orientation="vertical" className="h-5 mx-0.5" />
                      ) : (
                        <button
                          key={btn.title}
                          type="button"
                          title={btn.title}
                          onClick={btn.action}
                          className={`p-1.5 rounded hover:bg-muted transition-colors ${btn.active ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                        >
                          {btn.icon}
                        </button>
                      )
                    )}
                  </div>
                  <div className="border rounded-md overflow-hidden">
                    <EditorContent editor={replyEditor} />
                  </div>
                  {/* Reply attachments */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                    >
                      {uploadingFile ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Paperclip className="h-3 w-3 mr-1" />}
                      Attach
                    </Button>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => void handleFileChange(e)} />
                    {replyAttachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-1 bg-muted text-xs px-2 py-0.5 rounded-full">
                        <span className="max-w-[100px] truncate">{att.filename}</span>
                        <button onClick={() => setReplyAttachments((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyOpen(false);
                        replyEditor?.commands.clearContent();
                        setReplyAttachments([]);
                      }}
                      disabled={replying}
                    >
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => void handleReply()} disabled={replying}>
                      {replying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                      Send Reply
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              {/* Email HTML */}
              <div className="px-4 py-4">
                <iframe
                  srcDoc={email.html ?? ""}
                  sandbox="allow-same-origin"
                  className="w-full min-h-[500px] border-none rounded-lg bg-white"
                  title="Email content"
                  onLoad={(e) => {
                    const iframe = e.currentTarget;
                    const body = iframe.contentDocument?.body;
                    if (body) iframe.style.height = `${body.scrollHeight + 32}px`;
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
