"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmailSettings } from "@/types/admin";

const DEFAULTS: EmailSettings = {
  fromName: "Zaine's Stay & Play",
  fromAddress: "info@zainesstayandplay.com",
  replyTo: "info@zainesstayandplay.com",
  signatureHtml: "",
};

export function EmailSenderTab() {
  const [settings, setSettings] = useState<EmailSettings>(DEFAULTS);
  const [saved, setSaved] = useState<EmailSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/email-inbox/settings")
      .then((r) => r.json())
      .then((d: { data?: EmailSettings }) => {
        if (d.data) { setSettings(d.data); setSaved(d.data); }
      })
      .catch(() => toast.error("Failed to load email settings"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const resp = await fetch("/api/admin/email-inbox/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!resp.ok) {
        const d = (await resp.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Failed to save");
      }
      setSaved(settings);
      toast.success("Sender settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const isDirty = JSON.stringify(settings) !== JSON.stringify(saved);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-4">
        <Loader2 className="h-4 w-4 animate-spin" />Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sender Identity</CardTitle>
          <CardDescription>
            The name and address customers see when they receive emails from you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="from-name">From Name</Label>
            <Input
              id="from-name"
              value={settings.fromName}
              onChange={(e) => setSettings((s) => ({ ...s, fromName: e.target.value }))}
              placeholder="Zaine's Stay & Play"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="from-address">From Address</Label>
            <Input
              id="from-address"
              type="email"
              value={settings.fromAddress}
              onChange={(e) => setSettings((s) => ({ ...s, fromAddress: e.target.value }))}
              placeholder="info@zainesstayandplay.com"
            />
            <p className="text-xs text-muted-foreground">
              This address must be verified in your Resend account.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reply-to">Reply-To Address</Label>
            <Input
              id="reply-to"
              type="email"
              value={settings.replyTo}
              onChange={(e) => setSettings((s) => ({ ...s, replyTo: e.target.value }))}
              placeholder="info@zainesstayandplay.com"
            />
            <p className="text-xs text-muted-foreground">
              Where customer replies will be directed. Can be the same as From Address.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sticky footer */}
      {isDirty && (
        <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
          <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setSettings(saved)} disabled={saving}>
              Discard
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
