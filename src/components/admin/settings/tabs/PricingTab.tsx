'use client';

import {
  Form,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2, Save, X } from 'lucide-react';
import { useSettingsSectionForm } from '@/hooks/use-settings-section-form';
import {
  pricingSettingsSchema,
  type PricingSettingsFormValues,
} from '@/lib/validations/admin-settings';
import { pricingSettingsDefaults } from '@/lib/config/admin-settings-defaults';
import { PricingSettingsCard } from '@/components/admin/PricingSettingsCard';
import { SeasonalPricingCard } from '@/components/admin/SeasonalPricingCard';
import { CancellationPolicySettingsCard } from '@/components/admin/CancellationPolicySettingsCard';

type PricingTabProps = {
  onDirtyChange?: (isDirty: boolean) => void;
};

export function PricingTab({ onDirtyChange }: PricingTabProps) {
  const sectionKeys: (keyof import('@/types/admin').AdminSettings)[] = [
    'pricingSettings',
    'seasonalPricingRules',
    'cancellationPolicySettings',
  ];

  const { form, isLoading, isSaving, isDirty, error, onSubmit, onReset } =
    useSettingsSectionForm({
      schema: pricingSettingsSchema,
      sectionKeys,
      defaults: pricingSettingsDefaults,
    });

  // Notify parent of dirty state changes
  if (onDirtyChange) {
    onDirtyChange(isDirty);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Loading pricing settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Settings</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        {/* Pricing Settings Card (existing component) */}
        <PricingSettingsCard />

        {/* Seasonal Pricing Card (existing component) */}
        <SeasonalPricingCard />

        {/* Cancellation Policy Card (existing component) */}
        <CancellationPolicySettingsCard />

        {/* Save/Discard Buttons */}
        <div className="flex gap-3 sticky bottom-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg border border-border shadow-sm">
          <Button type="submit" disabled={!isDirty || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Pricing Settings
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            disabled={!isDirty || isSaving}
          >
            <X className="mr-2 h-4 w-4" />
            Discard Changes
          </Button>
          {isDirty && (
            <span className="text-sm text-muted-foreground self-center ml-2">
              You have unsaved changes
            </span>
          )}
        </div>
      </form>
    </Form>
  );
}
