"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Paperclip,
  Send,
  Underline,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminEmailTemplate, EmailAttachmentMeta } from "@/types/admin";

type Props = {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultHtml?: string;
};

const DRAFT_KEY = "email_draft_compose";

export function EmailComposeModal({
  open,
  onClose,
  onSent,
  defaultTo = "",
  defaultSubject = "",
  defaultHtml,
}: Props) {
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachments, setAttachments] = useState<EmailAttachmentMeta[]>([]);
  const [templates, setTemplates] = useState<AdminEmailTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [draftRestored, setDraftRestored] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write your message…" }),
      TiptapUnderline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
    ],
    content: defaultHtml ?? "",
    editorProps: {
      attributes: {
        class: "min-h-[280px] p-3 prose prose-sm max-w-none focus:outline-none",
      },
    },
  });

  // Restore defaultHtml when prop changes (e.g. forwarding)
  useEffect(() => {
    if (editor && defaultHtml !== undefined) {
      editor.commands.setContent(defaultHtml);
    }
  }, [editor, defaultHtml]);

  // Sync defaultTo / defaultSubject
  useEffect(() => {
    setTo(defaultTo);
  }, [defaultTo]);
  useEffect(() => {
    setSubject(defaultSubject);
  }, [defaultSubject]);

  // Load templates
  useEffect(() => {
    fetch("/api/admin/email-inbox/templates")
      .then((r) => r.json())
      .then((d: { data?: AdminEmailTemplate[] }) => setTemplates(d.data ?? []))
      .catch(() => null);
  }, []);

  // Draft restore on open
  useEffect(() => {
    if (!open || draftRestored || defaultHtml) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as {
          to?: string; cc?: string; subject?: string; html?: string;
          attachments?: EmailAttachmentMeta[];
        };
        toast.info("Resume draft?", {
          action: {
            label: "Resume",
            onClick: () => {
              if (draft.to) setTo(draft.to);
              if (draft.cc) { setCc(draft.cc); setShowCc(true); }
              if (draft.subject) setSubject(draft.subject);
              if (draft.html && editor) editor.commands.setContent(draft.html);
              if (draft.attachments) setAttachments(draft.attachments);
            },
          },
        });
      }
    } catch { /* non-fatal */ }
    setDraftRestored(true);
  }, [open, draftRestored, defaultHtml, editor]);

  // Draft auto-save
  const saveDraft = useCallback(() => {
    if (!editor) return;
    const html = editor.getHTML();
    if (!to && !subject && html === "<p></p>") return;
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ to, cc, subject, html, attachments }),
    );
  }, [to, cc, subject, attachments, editor]);

  useEffect(() => {
    const timer = setTimeout(saveDraft, 2000);
    return () => clearTimeout(timer);
  }, [saveDraft]);

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
  }

  function reset() {
    setTo(defaultTo);
    setCc("");
    setShowCc(false);
    setSubject(defaultSubject);
    editor?.commands.clearContent();
    setAttachments([]);
    setActiveTab("edit");
    setDraftRestored(false);
    clearDraft();
  }

  function handleClose() {
    reset();
    onClose();
  }

  function applyTemplate(templateId: string) {
    const t = templates.find((x) => x.id === templateId);
    if (!t || !editor) return;
    editor.commands.setContent(t.html);
    if (!subject) setSubject(t.subject);
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
        setAttachments((prev) => [...prev, data]);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend() {
    if (!editor) return;
    setSending(true);
    const html = editor.getHTML();
    const ccList = cc.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      const resp = await fetch("/api/admin/email-inbox/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          cc: ccList.length ? ccList : undefined,
          subject,
          html,
          attachments: attachments.length ? attachments : undefined,
        }),
      });
      if (!resp.ok) {
        const d = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Failed to send email");
      }
      toast.success("Email sent");
      clearDraft();
      reset();
      onSent();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  const canSend = to.trim() !== "" && subject.trim() !== "" && !sending && !uploadingFile;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-3xl flex flex-col p-0 gap-0 overflow-hidden">
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle>New Email</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Fields */}
          <div className="px-6 py-4 space-y-3 border-b">
            <div className="flex items-center gap-2">
              <Label className="w-12 text-right shrink-0 text-sm">To</Label>
              <Input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground px-2"
                onClick={() => setShowCc((v) => !v)}
              >
                CC
              </Button>
            </div>
            {showCc && (
              <div className="flex items-center gap-2">
                <Label className="w-12 text-right shrink-0 text-sm">CC</Label>
                <Input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc1@example.com, cc2@example.com"
                  className="flex-1"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Label className="w-12 text-right shrink-0 text-sm">Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject…"
                className="flex-1"
                maxLength={200}
              />
            </div>
            {/* Template picker */}
            {templates.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="w-12 text-right shrink-0 text-sm text-muted-foreground">Template</Label>
                <Select onValueChange={applyTemplate}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Load a template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.filter((t) => t.isEnabled).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Editor area */}
          <div className="px-6 pt-3 pb-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")}>
              <div className="flex items-center justify-between mb-2">
                {/* Formatting toolbar */}
                <div className="flex items-center gap-0.5 flex-wrap">
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    active={editor?.isActive("bold")}
                    title="Bold"
                  ><Bold className="h-3.5 w-3.5" /></ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    active={editor?.isActive("italic")}
                    title="Italic"
                  ><Italic className="h-3.5 w-3.5" /></ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleUnderline().run()}
                    active={editor?.isActive("underline")}
                    title="Underline"
                  ><Underline className="h-3.5 w-3.5" /></ToolbarButton>
                  <Separator orientation="vertical" className="h-5 mx-1" />
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    active={editor?.isActive("bulletList")}
                    title="Bullet list"
                  ><List className="h-3.5 w-3.5" /></ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    active={editor?.isActive("orderedList")}
                    title="Ordered list"
                  ><ListOrdered className="h-3.5 w-3.5" /></ToolbarButton>
                  <Separator orientation="vertical" className="h-5 mx-1" />
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().setTextAlign("left").run()}
                    active={editor?.isActive({ textAlign: "left" })}
                    title="Align left"
                  ><AlignLeft className="h-3.5 w-3.5" /></ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().setTextAlign("center").run()}
                    active={editor?.isActive({ textAlign: "center" })}
                    title="Align center"
                  ><AlignCenter className="h-3.5 w-3.5" /></ToolbarButton>
                  <ToolbarButton
                    onClick={() => editor?.chain().focus().setTextAlign("right").run()}
                    active={editor?.isActive({ textAlign: "right" })}
                    title="Align right"
                  ><AlignRight className="h-3.5 w-3.5" /></ToolbarButton>
                  <Separator orientation="vertical" className="h-5 mx-1" />
                  <ToolbarButton
                    onClick={() => {
                      const url = window.prompt("Enter URL");
                      if (url) editor?.chain().focus().setLink({ href: url }).run();
                    }}
                    active={editor?.isActive("link")}
                    title="Insert link"
                  ><Link2 className="h-3.5 w-3.5" /></ToolbarButton>
                </div>
                <TabsList className="h-7">
                  <TabsTrigger value="edit" className="text-xs h-6 px-2">Edit</TabsTrigger>
                  <TabsTrigger value="preview" className="text-xs h-6 px-2">Preview</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="edit" className="mt-0">
                <div className="border rounded-md overflow-hidden">
                  <EditorContent editor={editor} />
                </div>
              </TabsContent>
              <TabsContent value="preview" className="mt-0">
                <div className="border rounded-md overflow-hidden h-72">
                  <iframe
                    srcDoc={editor?.getHTML() ?? ""}
                    sandbox="allow-same-origin"
                    className="w-full h-full"
                    title="Email preview"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Attachments */}
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
              >
                {uploadingFile ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                )}
                Attach file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => void handleFileChange(e)}
              />
              {attachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 bg-muted text-xs px-2.5 py-1 rounded-full"
                >
                  <Paperclip className="h-3 w-3 text-muted-foreground" />
                  <span className="max-w-[140px] truncate">{att.filename}</span>
                  <span className="text-muted-foreground">({formatFileSize(att.size)})</span>
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive ml-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-2 shrink-0 bg-background">
          <Button variant="outline" onClick={handleClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={() => void handleSend()} disabled={!canSend}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Send className="h-4 w-4 mr-1.5" />
            )}
            Send
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded hover:bg-muted transition-colors ${active ? "bg-muted text-foreground" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
