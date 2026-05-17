'use client';

import { startTransition, useState, useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AdminSettings } from '@/types/admin';
import { useInvalidateSettings } from '@/providers/settings-provider';

function createClientId(prefix: string): string {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
  return `${prefix}-${randomPart}`;
}

const serviceUpdateSchema = z.object({
  serviceTiers: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1, 'Service type is required'),
      description: z.string().min(1, 'Description is required'),
      baseNightlyRate: z.number().min(0, 'Price must be positive'),
      capacity: z.number().int().min(1, 'Capacity must be at least 1').max(100),
      imageUrl: z.string().min(1, 'Image URL is required'),
      isActive: z.boolean(),
      displayOrder: z.number().int().min(0),
    }),
  ).min(1, 'At least one service type is required'),
});

type ServiceUpdateFormValues = z.infer<typeof serviceUpdateSchema>;

interface ServiceManagementCardProps {
  onSave?: () => void;
}

export function ServiceManagementCard({
  onSave,
}: ServiceManagementCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { invalidate } = useInvalidateSettings();

  const form = useForm<ServiceUpdateFormValues>({
    resolver: zodResolver(serviceUpdateSchema),
    defaultValues: {
      serviceTiers: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'serviceTiers',
  });

  // Load service settings on mount
  useEffect(() => {
    const loadServiceSettings = async () => {
      try {
        setFetchError(null);
        const res = await fetch('/api/admin/settings');
        const data = (await res.json()) as {
          success?: boolean;
          data?: AdminSettings;
          error?: string;
        };

        if (!res.ok) {
          setFetchError(data.error || 'Failed to load service settings');
          setIsLoading(false);
          return;
        }

        if (data.data?.serviceSettings?.serviceTiers) {
          form.reset({
            serviceTiers: data.data.serviceSettings.serviceTiers,
          });
        }
      } catch (error) {
        console.error('Error loading service settings:', error);
        setFetchError('Failed to load service settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadServiceSettings();
  }, [form]);

  async function onSubmit(values: ServiceUpdateFormValues) {
    setIsSaving(true);
    setFetchError(null);

    try {
      const normalizedTiers = values.serviceTiers.map((tier, index) => ({
        ...tier,
        displayOrder: index,
      }));

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceSettings: {
            serviceTiers: normalizedTiers,
          },
        }),
      });

      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!res.ok) {
        toast.error(data.error || 'Failed to save service settings');
        return;
      }

      await invalidate();
      toast.success('Services & pricing updated successfully!');
      onSave?.();
    } catch (error) {
      console.error('Service settings save error:', error);
      toast.error('Failed to save service settings');
    } finally {
      setIsSaving(false);
    }
  }

  function addServiceType() {
    append({
      id: createClientId('tier'),
      name: '',
      description: '',
      baseNightlyRate: 0,
      capacity: 1,
      imageUrl: '/images/suites/standard-placeholder.svg',
      isActive: true,
      displayOrder: fields.length,
    });
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Services & Pricing</CardTitle>
          <CardDescription>
            Manage service types, pricing, and availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Services & Pricing</CardTitle>
        <CardDescription>
          Manage service types, pricing, and availability
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          <a href="/#suites-heading" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Inspect suites section</a>
        </div>
      </CardHeader>
      <CardContent>
        {fetchError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{fetchError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Service Type {index + 1}</p>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/#suite-${form.watch(`serviceTiers.${index}.id`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline underline-offset-2"
                      >
                        Inspect on site
                      </a>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`serviceTiers.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Type</FormLabel>
                          <FormControl>
                            <Input placeholder="Deluxe Suite" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`serviceTiers.${index}.baseNightlyRate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nightly Price</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={field.value ?? 0}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`serviceTiers.${index}.capacity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              value={field.value ?? 1}
                              onChange={(e) => field.onChange(Number(e.target.value || 1))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`serviceTiers.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Premium suite with enhanced comfort" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`serviceTiers.${index}.imageUrl`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="/images/suites/deluxe-placeholder.svg" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`serviceTiers.${index}.isActive`}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              startTransition(() => field.onChange(Boolean(checked)));
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          Available for booking
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" onClick={addServiceType} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Service Type
            </Button>

            <Button type="submit" disabled={isSaving} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Services & Pricing
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
