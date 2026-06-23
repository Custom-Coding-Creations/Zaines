"use client";

import { useEffect, useState } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { EmailSettings } from "@/types/admin";

export function EmailSignatureTab() {
  const [savedHtml, setSavedHtml] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Write your email signature…" }),
      TiptapUnderline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
    ],
    editorProps: {
      attributes: {
        class: "min-h-[160px] p-3 prose prose-sm max-w-none focus:outline-none",
      },
    },
  });

  useEffect(() => {
    fetch("/api/admin/email-inbox/settings")
      .then((r) => r.json())
      .then((d: { data?: EmailSettings }) => {
        if (d.data?.signatureHtml) {
          setSavedHtml(d.data.signatureHtml);
          editor?.commands.setContent(d.data.signatureHtml);
        }
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, [editor]);

  async function handleSave() {
    if (!editor) return;
    const html = editor.getHTML();
    setSaving(true);
    try {
      // Fetch current settings to merge
      const current = await fetch("/api/admin/email-inbox/settings").then((r) => r.json()) as { data?: EmailSettings };
      const resp = await fetch("/api/admin/email-inbox/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(current.data ?? {}), signatureHtml: html }),
      });
      if (!resp.ok) throw new Error("Failed to save");
      setSavedHtml(html);
      toast.success("Signature saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save signature");
    } finally {
      setSaving(false);
    }
  }

  const currentHtml = editor?.getHTML() ?? "";
  const isDirty = currentHtml !== savedHtml;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-4">
        <Loader2 className="h-4 w-4 animate-spin" />Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Signature</CardTitle>
          <CardDescription>
            Appended to the bottom of all composed and reply emails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Toolbar */}
          <div className="flex items-center gap-0.5 flex-wrap border-b pb-2">
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
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? "Hide Preview" : "Preview"}
              </Button>
            </div>
          </div>

          <div className="border rounded-md overflow-hidden">
            <EditorContent editor={editor} />
          </div>

          {showPreview && (
            <div className="border rounded-md p-3 bg-white text-sm min-h-[80px]">
              <iframe
                srcDoc={currentHtml}
                sandbox="allow-same-origin"
                className="w-full border-none min-h-[80px]"
                title="Signature preview"
                onLoad={(e) => {
                  const body = e.currentTarget.contentDocument?.body;
                  if (body) e.currentTarget.style.height = `${body.scrollHeight + 16}px`;
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {isDirty && (
        <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
          <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => editor?.commands.setContent(savedHtml)} disabled={saving}>
              Discard
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save Signature
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
