"use client";

import { useEffect, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eye,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Save,
  Underline,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { AdminEmailTemplate } from "@/types/admin";

const MOCK_VARS: Record<string, string> = {
  firstName: "Sarah",
  customerName: "Sarah Johnson",
  petName: "Buddy",
  petNames: "Buddy, Max",
  bookingNumber: "PB-20260622-0001",
  checkInDate: "June 25, 2026",
  checkOutDate: "June 28, 2026",
  suiteType: "Deluxe Suite",
  total: "$255.00",
  resetUrl: "https://zainesstayandplay.com/reset-password",
  claimUrl: "https://zainesstayandplay.com/claim",
  dashboardUrl: "https://zainesstayandplay.com/dashboard",
  date: "June 22, 2026",
  expiryMinutes: "60",
  expiryHours: "48",
};

function applyMockVars(html: string): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key: string) => MOCK_VARS[key] ?? `{{${key}}}`);
}

type Props = {
  template: AdminEmailTemplate | null | undefined; // null = new, undefined = closed
  open: boolean;
  onClose: () => void;
  onSaved: (t: AdminEmailTemplate) => void;
};

export function EmailTemplateEditor({ template, open, onClose, onSaved }: Props) {
  const isNew = template === null;
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [subject, setSubject] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      TiptapLink.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write your email template…" }),
      TiptapUnderline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
    ],
    editorProps: {
      attributes: {
        class: "min-h-[400px] p-3 prose prose-sm max-w-none focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!open) return;
    if (template) {
      setName(template.name);
      setType(template.type);
      setSubject(template.subject);
      editor?.commands.setContent(template.html);
    } else if (isNew) {
      setName("");
      setType("");
      setSubject("");
      editor?.commands.clearContent();
    }
  }, [open, template, isNew, editor]);

  async function handleSave() {
    if (!editor) return;
    const html = editor.getHTML();
    if (!name.trim() || !subject.trim()) {
      toast.error("Name and subject are required");
      return;
    }
    setSaving(true);
    try {
      let resp: Response;
      if (isNew) {
        if (!type.trim()) { toast.error("Type is required for new templates"); setSaving(false); return; }
        resp = await fetch("/api/admin/email-inbox/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, name, subject, html }),
        });
      } else {
        resp = await fetch(`/api/admin/email-inbox/templates/${template!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, subject, html }),
        });
      }
      if (!resp.ok) {
        const d = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Failed to save");
      }
      const saved = (await resp.json()) as { data: AdminEmailTemplate };
      toast.success(isNew ? "Template created" : "Template saved");
      onSaved(saved.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  const varChips = Object.keys(MOCK_VARS);

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-3xl flex flex-col p-0 gap-0 overflow-hidden">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle>{isNew ? "New Template" : `Edit: ${template?.name ?? ""}`}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto">
            {/* Meta fields */}
            <div className="px-6 py-4 space-y-3 border-b">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Template Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Booking Confirmation" />
                </div>
                <div className="space-y-1.5">
                  <Label>Type Key</Label>
                  <Input
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="e.g. booking_confirmation"
                    disabled={!isNew && template?.isSystem}
                    title={!isNew && template?.isSystem ? "System template types cannot be changed" : undefined}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Booking {{bookingNumber}} confirmed" />
              </div>
              {/* Variable chips */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Insert Variable</Label>
                <div className="flex flex-wrap gap-1.5">
                  {varChips.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="text-xs px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      onClick={() => editor?.chain().focus().insertContent(`{{${v}}}`).run()}
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Editor */}
            <div className="px-6 py-4">
              {/* Toolbar */}
              <div className="flex items-center gap-0.5 flex-wrap mb-2 pb-2 border-b">
                {[
                  { icon: <Bold className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive("bold"), title: "Bold" },
                  { icon: <Italic className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().toggleItalic().run(), active: editor?.isActive("italic"), title: "Italic" },
                  { icon: <Underline className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().toggleUnderline().run(), active: editor?.isActive("underline"), title: "Underline" },
                  null,
                  { icon: <List className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive("bulletList"), title: "Bullet list" },
                  { icon: <ListOrdered className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive("orderedList"), title: "Ordered list" },
                  null,
                  { icon: <AlignLeft className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().setTextAlign("left").run(), active: editor?.isActive({ textAlign: "left" }), title: "Align left" },
                  { icon: <AlignCenter className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().setTextAlign("center").run(), active: editor?.isActive({ textAlign: "center" }), title: "Center" },
                  { icon: <AlignRight className="h-3.5 w-3.5" />, action: () => editor?.chain().focus().setTextAlign("right").run(), active: editor?.isActive({ textAlign: "right" }), title: "Align right" },
                  null,
                  { icon: <Link2 className="h-3.5 w-3.5" />, action: () => { const url = window.prompt("Enter URL"); if (url) editor?.chain().focus().setLink({ href: url }).run(); }, active: editor?.isActive("link"), title: "Link" },
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
                <div className="ml-auto">
                  <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowPreview(true)}>
                    <Eye className="h-3.5 w-3.5 mr-1.5" />Preview
                  </Button>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <EditorContent editor={editor} />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex items-center justify-end gap-2 shrink-0 bg-background">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              {isNew ? "Create Template" : "Save Changes"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Preview dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Preview — {name || "Template"}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Variables are substituted with sample data for preview.
          </p>
          <div className="flex-1 border rounded-md overflow-hidden">
            <iframe
              srcDoc={applyMockVars(editor?.getHTML() ?? "")}
              sandbox="allow-same-origin"
              className="w-full h-full"
              title="Template preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
