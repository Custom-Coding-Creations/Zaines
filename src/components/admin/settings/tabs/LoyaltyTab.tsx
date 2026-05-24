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
import { Loader2, Save, Trophy } from 'lucide-react';
import type { LoyaltyProgramSettings } from '@/types/admin';

type LoyaltyTabProps = {
  onDirtyChange?: (isDirty: boolean) => void;
};

const DEFAULT_SETTINGS: LoyaltyProgramSettings = {
  enabled: false,
  pointsPerNight: 10,
  pointsPerAddon: 5,
  pointsPerReferral: 50,
  pointsPerReview: 25,
  tierThresholds: { goodDog: 500, topDog: 1500, vip: 3000 },
  redemptionRate: 100,
  minRedemptionPoints: 100,
  maxRedemptionPercent: 50,
  pointExpiryDays: 365,
};

export function LoyaltyTab({ onDirtyChange }: LoyaltyTabProps) {
  const [settings, setSettings] = useState<LoyaltyProgramSettings>(DEFAULT_SETTINGS);
  const [original, setOriginal] = useState<LoyaltyProgramSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/settings/loyalty');
        if (res.ok) {
          const json = (await res.json()) as { success: boolean; data: LoyaltyProgramSettings };
          const data = { ...DEFAULT_SETTINGS, ...json.data };
          setSettings(data);
          setOriginal(data);
        }
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(original);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const setField = <K extends keyof LoyaltyProgramSettings>(
    key: K,
    value: LoyaltyProgramSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaveError(null);
    setSaveSuccess(false);
  };

  const setThreshold = (key: keyof LoyaltyProgramSettings['tierThresholds'], value: number) => {
    setSettings((prev) => ({
      ...prev,
      tierThresholds: { ...prev.tierThresholds, [key]: value },
    }));
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/admin/settings/loyalty', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        setSaveError('Failed to save loyalty settings.');
      } else {
        setOriginal(settings);
        setSaveSuccess(true);
      }
    } catch {
      setSaveError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Loyalty Program</h2>
          <p className="text-sm text-muted-foreground">
            Configure Paw Points — your customer loyalty rewards program.
          </p>
        </div>
      </div>

      {/* Enable / Disable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Program Status</CardTitle>
          <CardDescription>
            Enable or disable the Paw Points loyalty program for all customers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="loyalty-enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => setField('enabled', checked)}
            />
            <Label htmlFor="loyalty-enabled">
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Points Earning */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Points Earning Rules</CardTitle>
          <CardDescription>Define how customers earn Paw Points.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="pointsPerNight">Points per night</Label>
            <Input
              id="pointsPerNight"
              type="number"
              min={0}
              value={settings.pointsPerNight}
              onChange={(e) => setField('pointsPerNight', Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pointsPerAddon">Points per add-on</Label>
            <Input
              id="pointsPerAddon"
              type="number"
              min={0}
              value={settings.pointsPerAddon}
              onChange={(e) => setField('pointsPerAddon', Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pointsPerReferral">Points per referral</Label>
            <Input
              id="pointsPerReferral"
              type="number"
              min={0}
              value={settings.pointsPerReferral}
              onChange={(e) => setField('pointsPerReferral', Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pointsPerReview">Points per review</Label>
            <Input
              id="pointsPerReview"
              type="number"
              min={0}
              value={settings.pointsPerReview}
              onChange={(e) => setField('pointsPerReview', Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tier Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tier Thresholds</CardTitle>
          <CardDescription>
            Lifetime points required to reach each tier (Pup → Good Dog → Top Dog → VIP).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="goodDog">Good Dog (pts)</Label>
            <Input
              id="goodDog"
              type="number"
              min={0}
              value={settings.tierThresholds.goodDog}
              onChange={(e) => setThreshold('goodDog', Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="topDog">Top Dog (pts)</Label>
            <Input
              id="topDog"
              type="number"
              min={0}
              value={settings.tierThresholds.topDog}
              onChange={(e) => setThreshold('topDog', Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="vip">VIP (pts)</Label>
            <Input
              id="vip"
              type="number"
              min={0}
              value={settings.tierThresholds.vip}
              onChange={(e) => setThreshold('vip', Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Redemption */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Redemption Settings</CardTitle>
          <CardDescription>Control how customers can redeem their Paw Points.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="redemptionRate">Points per $1 discount</Label>
            <Input
              id="redemptionRate"
              type="number"
              min={1}
              value={settings.redemptionRate}
              onChange={(e) => setField('redemptionRate', Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="minRedemptionPoints">Minimum points to redeem</Label>
            <Input
              id="minRedemptionPoints"
              type="number"
              min={0}
              value={settings.minRedemptionPoints}
              onChange={(e) => setField('minRedemptionPoints', Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="maxRedemptionPercent">Max % of booking total</Label>
            <Input
              id="maxRedemptionPercent"
              type="number"
              min={0}
              max={100}
              value={settings.maxRedemptionPercent}
              onChange={(e) => setField('maxRedemptionPercent', Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pointExpiryDays">Point expiry days (0 = never)</Label>
            <Input
              id="pointExpiryDays"
              type="number"
              min={0}
              value={settings.pointExpiryDays}
              onChange={(e) => setField('pointExpiryDays', Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving || !isDirty}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save changes
            </>
          )}
        </Button>
        {saveSuccess && (
          <span className="text-sm text-green-600">Settings saved successfully.</span>
        )}
        {saveError && (
          <span className="text-sm text-destructive">{saveError}</span>
        )}
      </div>
    </div>
  );
}
