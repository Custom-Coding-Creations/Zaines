'use client';

import { useEffect } from 'react';
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
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import {
  blackoutDatesSettingsSchema,
  type BlackoutDatesSettingsFormValues,
} from '@/lib/validations/admin-settings';
import { blackoutDatesSettingsDefaults } from '@/lib/config/admin-settings-defaults';
import { BlackoutDatesCard } from '@/components/admin/BlackoutDatesCard';

type BlackoutDatesTabProps = {
  onDirtyChange?: (isDirty: boolean) => void;
};

export function BlackoutDatesTab({ onDirtyChange }: BlackoutDatesTabProps) {
  const sectionKeys: (keyof import('@/types/admin').AdminSettings)[] = ['blackoutDates'];

  const { form, isLoading, isSaving, isDirty, error, onSubmit, onReset } =
    useSettingsSectionForm({
      schema: blackoutDatesSettingsSchema,
      sectionKeys,
      defaults: blackoutDatesSettingsDefaults,
    });

  // Enable keyboard shortcuts (Ctrl+S to save, Esc to discard)
  useKeyboardShortcuts({
    onSave: () => {
      if (!isSaving && isDirty && form.formState.isValid) {
        onSubmit(form.getValues());
      }
    },
    onDiscard: () => {
      if (isDirty && !isSaving) {
        onReset();
      }
    },
    enabled: !isLoading,
  });

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Loading blackout dates...</span>
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
        {/* Blackout Dates Card (existing component) */}
        <BlackoutDatesCard />

        {/* Save/Discard Buttons */}
        <div className="flex gap-3 sticky bottom-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg border border-border shadow-sm">
          <Button type="submit" disabled={!isDirty || isSaving || !form.formState.isValid}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Blackout Dates
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            disabled={!isDirty || isSaving || !form.formState.isValid}
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
