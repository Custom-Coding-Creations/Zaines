"use client";

import { useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { safeJsonResponse } from "@/lib/safe-json-response";

type ConversationAttachment = {
  attachmentId: string;
  url: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  kind: "image" | "video";
};

type ConversationMessage = {
  messageId: string;
  senderType: "customer" | "staff";
  senderName: string;
  content: string;
  createdAt: string;
  attachments: ConversationAttachment[];
};

type ContactSubmissionProps = {
  submissionId: string;
  fullName: string;
  email: string;
  phone: string | null;
  message: string;
  createdAt: string;
  status: "open" | "resolved";
  conversation: ConversationMessage[];
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${Math.round(kilobytes * 10) / 10} KB`;
  }

  const megabytes = kilobytes / 1024;
  return `${Math.round(megabytes * 10) / 10} MB`;
}

export function ContactSubmissionCard(props: ContactSubmissionProps) {
  const [status, setStatus] = useState<"open" | "resolved">(props.status);
  const [updating, setUpdating] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>(props.conversation);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [replyError, setReplyError] = useState<string | null>(null);

  const handleMarkResolved = async () => {
    setUpdating(true);
    try {
      const response = await fetch(
        `/api/admin/contact-submissions/${props.submissionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: status === "open" ? "resolved" : "open",
          }),
        },
      );

      if (response.ok) {
        const data = await safeJsonResponse<{ status: "open" | "resolved" }>(response, {
          status,
        });
        setStatus(data.status);
      }
    } catch (error) {
      console.error("Failed to update submission status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) {
      return;
    }

    setReplyError(null);
    setSelectedFiles(Array.from(files));
  };

  const handleSendReply = async () => {
    if (!replyText.trim() && selectedFiles.length === 0) {
      return;
    }

    setSendingReply(true);
    setReplyError(null);

    const formData = new FormData();
    formData.append("content", replyText.trim());
    for (const file of selectedFiles) {
      formData.append("files", file);
    }

    try {
      const response = await fetch(
        `/api/admin/contact-submissions/${props.submissionId}/messages`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        const payload = await safeJsonResponse<{
          error?: string;
        }>(response, {});
        throw new Error(payload.error || "Failed to send reply");
      }

      const payload = await safeJsonResponse<{
        status: "open" | "resolved";
        conversation: ConversationMessage[];
      }>(response, { status, conversation: messages });

      setMessages(payload.conversation);
      setStatus(payload.status);
      setReplyText("");
      setSelectedFiles([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setReplyError(message);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{props.fullName}</h3>
          <p className="text-xs text-muted-foreground">
            {new Date(props.createdAt).toLocaleString()} • ID: {props.submissionId}
          </p>
        </div>
        <Badge variant={status === "open" ? "default" : "secondary"}>
          {status}
        </Badge>
      </div>

      <div className="space-y-2">
        <p className="text-sm">
          <span className="font-medium">Email:</span> {props.email}
        </p>
        <p className="text-sm">
          <span className="font-medium">Phone:</span> {props.phone || "—"}
        </p>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Conversation</p>
        <div className="space-y-3">
          {messages.map((entry) => {
            const isStaff = entry.senderType === "staff";

            return (
              <div
                key={entry.messageId}
                className={`rounded-md border p-3 ${
                  isStaff ? "bg-blue-50 border-blue-200" : "bg-muted/30"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {entry.senderName} • {entry.senderType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>

                {entry.content ? (
                  <p className="text-sm whitespace-pre-wrap text-foreground">
                    {entry.content}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Attachment only message</p>
                )}

                {entry.attachments.length > 0 && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {entry.attachments.map((attachment) => (
                      <a
                        key={attachment.attachmentId}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded border bg-background px-3 py-2 text-sm hover:bg-muted/40"
                      >
                        <p className="font-medium truncate">{attachment.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.kind} • {formatFileSize(attachment.sizeBytes)}
                        </p>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {replyError && (
        <p className="rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700">
          {replyError}
        </p>
      )}

      <div className="rounded-md border p-3 space-y-3 bg-muted/20">
        <p className="text-sm font-medium">Reply to user</p>
        <textarea
          value={replyText}
          onChange={(event) => setReplyText(event.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Type your reply to the user"
          className="w-full rounded border bg-background px-3 py-2 text-sm"
        />

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground" htmlFor={`attachments-${props.submissionId}`}>
            Attach images or videos (optional)
          </label>
          <input
            id={`attachments-${props.submissionId}`}
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileSelection}
            className="block w-full text-xs"
          />
          {selectedFiles.length > 0 && (
            <div className="rounded border bg-background px-3 py-2">
              <p className="text-xs font-medium mb-1">Selected files</p>
              <ul className="space-y-1">
                {selectedFiles.map((file) => (
                  <li key={`${file.name}-${file.size}`} className="text-xs text-muted-foreground">
                    {file.name} • {formatFileSize(file.size)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleSendReply}
            disabled={sendingReply || (!replyText.trim() && selectedFiles.length === 0)}
          >
            {sendingReply ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Reply"
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={handleMarkResolved}
          disabled={updating}
        >
          {updating ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Updating…
            </>
          ) : (
            status === "open"
              ? "Mark Resolved"
              : "Mark Open"
          )}
        </Button>
      </div>
    </div>
  );
}
