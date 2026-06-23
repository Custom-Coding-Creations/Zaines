"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit, Lock, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminLoadingState, AdminErrorState } from "@/components/admin/AdminAsyncState";
import { EmailTemplateEditor } from "./EmailTemplateEditor";
import type { AdminEmailTemplate } from "@/types/admin";

export function EmailTemplatesTab() {
  const [templates, setTemplates] = useState<AdminEmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminEmailTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminEmailTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/admin/email-inbox/templates");
      if (!resp.ok) throw new Error("Failed to load templates");
      const data = (await resp.json()) as { data?: AdminEmailTemplate[] };
      setTemplates(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function toggleEnabled(template: AdminEmailTemplate) {
    try {
      const resp = await fetch(`/api/admin/email-inbox/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: !template.isEnabled }),
      });
      if (!resp.ok) throw new Error("Update failed");
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, isEnabled: !t.isEnabled } : t)),
      );
    } catch {
      toast.error("Could not update template");
    }
  }

  async function handleDelete(template: AdminEmailTemplate) {
    try {
      const resp = await fetch(`/api/admin/email-inbox/templates/${template.id}`, { method: "DELETE" });
      if (!resp.ok) throw new Error("Delete failed");
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      toast.success("Template deleted");
    } catch {
      toast.error("Could not delete template");
    } finally {
      setDeleteTarget(null);
    }
  }

  function handleSaved(updated: AdminEmailTemplate) {
    setTemplates((prev) => {
      const exists = prev.find((t) => t.id === updated.id);
      if (exists) return prev.map((t) => (t.id === updated.id ? updated : t));
      return [...prev, updated];
    });
    setEditing(null);
    setCreating(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>
              System templates are pre-built and reset-able. Custom templates can be created and deleted freely.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />New Template
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading && <div className="p-6"><AdminLoadingState message="Loading templates…" /></div>}
          {!loading && error && (
            <div className="p-6">
              <AdminErrorState title="Failed to load" message={error} action={{ label: "Retry", onAction: load }} />
            </div>
          )}
          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Subject</TableHead>
                  <TableHead className="text-center">Enabled</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-2">
                        {t.isSystem && <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-label="System template" />}
                        <span className="font-medium text-sm">{t.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="text-xs">{t.type}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-xs truncate">
                      {t.subject}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={t.isEnabled}
                        onCheckedChange={() => void toggleEnabled(t)}
                        aria-label={`${t.isEnabled ? "Disable" : "Enable"} ${t.name}`}
                      />
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end gap-1">
                        {t.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            title="Reset to default"
                            onClick={async () => {
                              try {
                                const resp = await fetch(`/api/admin/email-inbox/templates/${t.id}/reset`, { method: "POST" });
                                if (!resp.ok) throw new Error("Reset failed");
                                const d = (await resp.json()) as { data?: AdminEmailTemplate };
                                if (d.data) handleSaved(d.data);
                                toast.success("Template reset to default");
                              } catch {
                                toast.error("Reset failed");
                              }
                            }}
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => setEditing(t)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        {!t.isSystem && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(t)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Template editor sheet */}
      <EmailTemplateEditor
        template={editing ?? (creating ? null : undefined)}
        open={editing !== null || creating}
        onClose={() => { setEditing(null); setCreating(false); }}
        onSaved={handleSaved}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete template?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && void handleDelete(deleteTarget)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
