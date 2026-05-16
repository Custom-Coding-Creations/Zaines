'use client';

import {
  Form,
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
  websiteSettingsSchema,
  type WebsiteSettingsFormValues,
} from '@/lib/validations/admin-settings';
import { websiteSettingsDefaults } from '@/lib/config/admin-settings-defaults';
import { WebsiteProfileSettingsCard } from '@/components/admin/WebsiteProfileSettingsCard';
import { TrustCopySettingsCard } from '@/components/admin/TrustCopySettingsCard';

type WebsiteTabProps = {
  onDirtyChange?: (isDirty: boolean) => void;
};

export function WebsiteTab({ onDirtyChange }: WebsiteTabProps) {
  const sectionKeys: (keyof import('@/types/admin').AdminSettings)[] = [
    'websiteProfileSettings',
    'trustCopySettings',
  ];

  const { form, isLoading, isSaving, isDirty, error, onSubmit, onReset } =
    useSettingsSectionForm({
      schema: websiteSettingsSchema,
      sectionKeys,
      defaults: websiteSettingsDefaults,
    });

  // Notify parent of dirty state changes
  if (onDirtyChange) {
    onDirtyChange(isDirty);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Loading website settings...</span>
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
        {/* Website Profile Card (existing component) */}
        <WebsiteProfileSettingsCard />

        {/* Trust Copy Card (existing component) */}
        <TrustCopySettingsCard />

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
                Save Website Settings
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
