"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  defaultTo?: string;
  defaultSubject?: string;
};

export function EmailComposeModal({
  open,
  onClose,
  onSent,
  defaultTo = "",
  defaultSubject = "",
}: Props) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTo(defaultTo);
    setSubject(defaultSubject);
    setBody("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSend() {
    setSending(true);
    setError(null);
    const html = `<div style="font-family:Georgia,serif;color:#18212a;line-height:1.6;max-width:620px;">${body
      .split("\n")
      .map((line) => (line === "" ? "<br/>" : `<p style="margin:0 0 12px;">${escapeHtml(line)}</p>`))
      .join("")}</div>`;

    try {
      const resp = await fetch("/api/admin/email-inbox/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, html }),
      });
      if (!resp.ok) {
        const d = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Failed to send email");
      }
      toast.success("Email sent successfully");
      reset();
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  const canSend = to.trim() !== "" && subject.trim() !== "" && body.trim() !== "" && !sending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Email</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="compose-to">To</Label>
            <Input
              id="compose-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compose-subject">Subject</Label>
            <Input
              id="compose-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject…"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="compose-body">Message</Label>
            <Textarea
              id="compose-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message…"
              rows={8}
              maxLength={10_000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {body.length} / 10,000
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!canSend}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Send className="h-4 w-4 mr-1.5" />
            )}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
