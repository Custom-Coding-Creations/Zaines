import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { toast } from 'sonner';
import { useInvalidateSettings } from '@/providers/settings-provider';
import type { AdminSettings } from '@/types/admin';

type UseSettingsSectionFormOptions = {
  schema: z.ZodType<any>;
  sectionKeys: (keyof AdminSettings)[];
  defaults: any;
};

/**
 * Generic hook for managing a settings section form
 * - Fetches settings subset from API
 * - Manages form state with Zod validation
 * - Handles per-section save (PUT only this section's fields)
 * - Provides dirty tracking, loading, and error states
 */
export function useSettingsSectionForm({
  schema,
  sectionKeys,
  defaults,
}: UseSettingsSectionFormOptions) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { invalidate } = useInvalidateSettings();

  const form = useForm({
    resolver: zodResolver(schema as any),
    defaultValues: defaults,
    mode: 'onChange', // Real-time validation
  }) as any;

  const isDirty = form.formState.isDirty;

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/admin/settings');
        if (!res.ok) {
          throw new Error(
            `Failed to load settings: ${res.status} ${res.statusText}`,
          );
        }

        const data = (await res.json()) as {
          success?: boolean;
          data?: AdminSettings;
        };

        if (data.data) {
          // Extract only the keys relevant to this section
          const sectionData: Record<string, unknown> = {};
          for (const key of sectionKeys) {
            if (key in data.data) {
              sectionData[key] = data.data[key];
            }
          }

          // Reset form with section-specific data
          form.reset(sectionData as any);
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load settings';
        setError(errorMessage);
        console.error('Error loading settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Submit handler - saves only this section's fields
  const onSubmit = async (values: any) => {
    setIsSaving(true);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const data = (await res.json()) as {
        success?: boolean;
        data?: AdminSettings;
        error?: string;
      };

      if (!res.ok) {
        toast.error(data.error || 'Failed to save settings');
        return;
      }

      // Invalidate settings cache so all components update
      await invalidate();

      toast.success('Settings saved successfully!');
      
      // Reset form with new values to clear dirty state
      form.reset(values);
    } catch (err) {
      console.error('Settings save error:', err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to last saved values
  const onReset = () => {
    form.reset();
    toast.info('Changes discarded');
  };

  return {
    form,
    isLoading,
    isSaving,
    isDirty,
    error,
    onSubmit: form.handleSubmit(onSubmit),
    onReset,
  };
}
