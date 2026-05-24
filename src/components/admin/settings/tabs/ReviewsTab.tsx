'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Star, TestTube } from 'lucide-react';
import { toast } from 'sonner';
import type { GoogleReviewsSettings } from '@/types/admin';
import { googleReviewsSettingsDefaults } from '@/lib/config/admin-settings-defaults';

type ReviewsTabProps = {
  onDirtyChange?: (isDirty: boolean) => void;
};

const defaults = googleReviewsSettingsDefaults.googleReviewsSettings;

export function ReviewsTab({ onDirtyChange }: ReviewsTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saved, setSaved] = useState<GoogleReviewsSettings>(defaults);
  const [form, setForm] = useState<GoogleReviewsSettings>(defaults);

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/google-reviews-settings');
        if (res.ok) {
          const data = (await res.json()) as { success: boolean; data: GoogleReviewsSettings };
          if (data.success && data.data) {
            setSaved(data.data);
            setForm(data.data);
          }
        }
      } catch {
        // keep defaults
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const handleChange = <K extends keyof GoogleReviewsSettings>(
    key: K,
    value: GoogleReviewsSettings[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/google-reviews-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaved(form);
      toast.success('Google Reviews settings saved!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setForm(saved);
    toast.info('Changes discarded');
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/google-reviews');
      const data = (await res.json()) as { source?: string; rating?: number; totalReviews?: number };
      if (res.ok && data.source === 'google') {
        toast.success(`Connected! ⭐ ${data.rating ?? '—'} · ${data.totalReviews ?? 0} reviews`);
      } else if (res.ok) {
        toast.warning('No live data — showing fallback. Check Place ID and API key.');
      } else {
        toast.error('Connection failed');
      }
    } catch {
      toast.error('Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enable Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Google Reviews Integration
          </CardTitle>
          <CardDescription>
            Display live Google reviews on your homepage. Requires a Google Places API key.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="enabled"
              checked={form.enabled}
              onCheckedChange={(v) => handleChange('enabled', v)}
            />
            <Label htmlFor="enabled">
              {form.enabled ? 'Live Google Reviews enabled' : 'Using static fallback reviews'}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Your Google Place ID and Places API key.{' '}
            <a
              href="https://developers.google.com/maps/documentation/places/web-service/place-id"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Find your Place ID
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="placeId">Google Place ID</Label>
            <Input
              id="placeId"
              value={form.placeId}
              onChange={(e) => handleChange('placeId', e.target.value)}
              placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">Google Places API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={form.apiKey}
              onChange={(e) => handleChange('apiKey', e.target.value)}
              placeholder="AIza…"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use <code>GOOGLE_PLACES_API_KEY</code> environment variable.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TestTube className="mr-2 h-4 w-4" />
            )}
            Test Connection
          </Button>
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxReviewsToShow">Max Reviews to Show</Label>
              <Input
                id="maxReviewsToShow"
                type="number"
                min={1}
                max={20}
                value={form.maxReviewsToShow}
                onChange={(e) => handleChange('maxReviewsToShow', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minRatingToShow">Minimum Rating to Show (1–5)</Label>
              <Input
                id="minRatingToShow"
                type="number"
                min={1}
                max={5}
                value={form.minRatingToShow}
                onChange={(e) => handleChange('minRatingToShow', Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fallback Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Fallback Values</CardTitle>
          <CardDescription>
            Displayed when Google Reviews is disabled or the API is unavailable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fallbackRating">Fallback Rating</Label>
              <Input
                id="fallbackRating"
                type="number"
                min={1}
                max={5}
                step={0.1}
                value={form.fallbackRating}
                onChange={(e) => handleChange('fallbackRating', Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fallbackReviewCount">Fallback Review Count</Label>
              <Input
                id="fallbackReviewCount"
                type="number"
                min={0}
                value={form.fallbackReviewCount}
                onChange={(e) => handleChange('fallbackReviewCount', Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving || !isDirty}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
        {isDirty && (
          <Button variant="outline" onClick={handleReset} disabled={isSaving}>
            Discard
          </Button>
        )}
      </div>
    </div>
  );
}
