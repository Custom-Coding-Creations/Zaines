"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Tag = {
  id: string;
  name: string;
  color: string;
  description: string | null;
};

type Segment = {
  id: string;
  name: string;
  description: string | null;
  criteriaJson: Record<string, unknown>;
  isActive: boolean;
};

export function CrmAudienceBuilder() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [error, setError] = useState("");

  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("slate");

  const [segmentName, setSegmentName] = useState("");
  const [segmentDescription, setSegmentDescription] = useState("");
  const [segmentCriteria, setSegmentCriteria] = useState('{\n  "loyaltyTier": "vip",\n  "requiresActiveBookings": false,\n  "includeTagIds": [],\n  "excludeTagIds": []\n}');
  const [previewChannel, setPreviewChannel] = useState<"email" | "sms">("email");
  const [estimatedRecipients, setEstimatedRecipients] = useState<number | null>(null);

  function applyTemplate(template: "vip" | "active" | "tagged") {
    if (template === "vip") {
      setSegmentCriteria('{\n  "loyaltyTier": "vip",\n  "requiresActiveBookings": false,\n  "includeTagIds": [],\n  "excludeTagIds": []\n}');
      return;
    }

    if (template === "active") {
      setSegmentCriteria('{\n  "requiresActiveBookings": true,\n  "includeTagIds": [],\n  "excludeTagIds": []\n}');
      return;
    }

    const firstTagId = tags[0]?.id ?? "<tag-id>";
    setSegmentCriteria(`{\n  "includeTagIds": ["${firstTagId}"],\n  "excludeTagIds": [],\n  "requiresActiveBookings": false\n}`);
  }

  async function loadData() {
    setError("");

    try {
      const [tagsRes, segmentsRes] = await Promise.all([
        fetch("/api/admin/crm/tags", { cache: "no-store" }),
        fetch("/api/admin/crm/segments", { cache: "no-store" }),
      ]);

      const tagsData = (await tagsRes.json()) as { tags?: Tag[]; error?: string };
      const segmentsData = (await segmentsRes.json()) as { segments?: Segment[]; error?: string };

      if (!tagsRes.ok) {
        throw new Error(tagsData.error ?? "Unable to load tags");
      }

      if (!segmentsRes.ok) {
        throw new Error(segmentsData.error ?? "Unable to load segments");
      }

      setTags(tagsData.tags ?? []);
      setSegments(segmentsData.segments ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load audience data");
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function createTag() {
    if (!tagName.trim()) {
      setError("Tag name is required");
      return;
    }

    try {
      const response = await fetch("/api/admin/crm/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tagName.trim(), color: tagColor }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create tag");
      }

      setTagName("");
      setTagColor("slate");
      await loadData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create tag");
    }
  }

  async function createSegment() {
    if (!segmentName.trim()) {
      setError("Segment name is required");
      return;
    }

    try {
      const criteriaJson = JSON.parse(segmentCriteria) as Record<string, unknown>;

      const response = await fetch("/api/admin/crm/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: segmentName.trim(),
          description: segmentDescription.trim() || undefined,
          criteriaJson,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to create segment");
      }

      setSegmentName("");
      setSegmentDescription("");
      setEstimatedRecipients(null);
      await loadData();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create segment");
    }
  }

  async function previewAudience() {
    setError("");

    try {
      const parsedCriteria = JSON.parse(segmentCriteria) as Record<string, unknown>;

      const response = await fetch("/api/admin/crm/segments/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criteriaJson: parsedCriteria,
          channel: previewChannel,
        }),
      });

      const data = (await response.json()) as { estimatedRecipients?: number; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to preview segment audience");
      }

      setEstimatedRecipients(data.estimatedRecipients ?? 0);
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Unable to preview segment audience");
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Tag name" value={tagName} onChange={(event) => setTagName(event.target.value)} />
            <Input placeholder="Color" value={tagColor} onChange={(event) => setTagColor(event.target.value)} />
          </div>
          <Button onClick={() => void createTag()}>Create Tag</Button>
          <div className="space-y-2">
            {tags.map((tag) => (
              <div key={tag.id} className="rounded-md border p-2 text-sm">
                <span className="font-medium">{tag.name}</span>
                <span className="ml-2 text-muted-foreground">{tag.color}</span>
              </div>
            ))}
            {tags.length === 0 ? <p className="text-sm text-muted-foreground">No tags yet.</p> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => applyTemplate("vip")}>VIP Template</Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate("active")}>Active Booking Template</Button>
            <Button variant="outline" size="sm" onClick={() => applyTemplate("tagged")}>Tagged Template</Button>
          </div>
          <Input
            placeholder="Segment name"
            value={segmentName}
            onChange={(event) => setSegmentName(event.target.value)}
          />
          <Input
            placeholder="Description (optional)"
            value={segmentDescription}
            onChange={(event) => setSegmentDescription(event.target.value)}
          />
          <Textarea
            value={segmentCriteria}
            onChange={(event) => setSegmentCriteria(event.target.value)}
            rows={5}
          />
          <p className="text-xs text-muted-foreground">
            Supported keys: loyaltyTier (string), requiresActiveBookings (boolean), includeTagIds (string[]), excludeTagIds (string[]).
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant={previewChannel === "email" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewChannel("email")}
            >
              Preview Email Audience
            </Button>
            <Button
              type="button"
              variant={previewChannel === "sms" ? "default" : "outline"}
              size="sm"
              onClick={() => setPreviewChannel("sms")}
            >
              Preview SMS Audience
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => void previewAudience()}>
              Run Preview
            </Button>
            {estimatedRecipients !== null ? (
              <span className="text-sm text-muted-foreground">Estimated recipients: {estimatedRecipients}</span>
            ) : null}
          </div>
          <Button onClick={() => void createSegment()}>Create Segment</Button>
          <div className="space-y-2">
            {segments.map((segment) => (
              <div key={segment.id} className="rounded-md border p-2 text-sm">
                <span className="font-medium">{segment.name}</span>
                <p className="text-xs text-muted-foreground">{segment.description ?? "No description"}</p>
              </div>
            ))}
            {segments.length === 0 ? <p className="text-sm text-muted-foreground">No segments yet.</p> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
