'use client';

import { useEffect, useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Save, Trash2, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useSettingsSectionForm } from '@/hooks/use-settings-section-form';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { testimonialsSettingsSchema } from '@/lib/validations/admin-settings';
import { testimonialsSettingsDefaults } from '@/lib/config/admin-settings-defaults';

type TestimonialsTabProps = {
  onDirtyChange?: (isDirty: boolean) => void;
};

const sectionKeys: (keyof import('@/types/admin').AdminSettings)[] = ['testimonialsSettings'];

export function TestimonialsTab({ onDirtyChange }: TestimonialsTabProps) {
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  
  const { form, isLoading, isSaving, isDirty, error, onSubmit, onReset } =
    useSettingsSectionForm({
      schema: testimonialsSettingsSchema,
      sectionKeys,
      defaults: testimonialsSettingsDefaults,
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

  const { fields, append, remove } = useFieldArray({
    control: form.control as any,
    name: 'testimonialsSettings.testimonials',
  });

  // Load service options for dropdown
  useEffect(() => {
    const loadServiceOptions = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const data = await res.json();
        if (data.data?.serviceSettings?.serviceTiers) {
          const options = data.data.serviceSettings.serviceTiers
            .filter((tier: any) => tier.isActive)
            .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
            .map((tier: any) => tier.name);
          setServiceOptions(options);
        }
      } catch (error) {
        console.error('Error loading service options:', error);
      }
    };

    loadServiceOptions();
  }, []);

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  function addTestimonial() {
    append({
      id: `testimonial-${Date.now()}`,
      author: '',
      petName: '',
      rating: 5,
      date: 'Recently',
      text: '',
      serviceLabel: serviceOptions[0] ?? 'Configured Service',
      isActive: true,
      displayOrder: fields.length,
    });
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Testimonials</CardTitle>
          <CardDescription>Manage homepage testimonial content and visibility</CardDescription>
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
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Testimonials</CardTitle>
              <CardDescription>Manage homepage testimonial content and visibility</CardDescription>
              <div className="text-xs text-muted-foreground">
                <a href="/#testimonials-heading" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
                  Inspect testimonials section
                </a>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Testimonial {index + 1}</p>
                      <div className="flex items-center gap-2">
                        <a
                          href={`/?testimonial=${encodeURIComponent(form.watch(`testimonialsSettings.testimonials.${index}.id` as any))}#testimonials-heading`}
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
                          disabled={fields.length <= 1}
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control as any}
                        name={`testimonialsSettings.testimonials.${index}.author`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Author</FormLabel>
                            <FormControl>
                              <Input placeholder="Sarah M." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control as any}
                        name={`testimonialsSettings.testimonials.${index}.petName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pet Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Max" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control as any}
                        name={`testimonialsSettings.testimonials.${index}.serviceLabel`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Label</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a service type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {serviceOptions.map((serviceName) => (
                                  <SelectItem key={serviceName} value={serviceName}>
                                    {serviceName}
                                  </SelectItem>
                                ))}
                                {!serviceOptions.includes(field.value) && field.value ? (
                                  <SelectItem value={field.value}>{field.value}</SelectItem>
                                ) : null}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control as any}
                        name={`testimonialsSettings.testimonials.${index}.date`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date Label</FormLabel>
                            <FormControl>
                              <Input placeholder="2 weeks ago" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control as any}
                        name={`testimonialsSettings.testimonials.${index}.rating`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Rating</FormLabel>
                            <Select
                              value={field.value?.toString()}
                              onValueChange={(val) => field.onChange(parseInt(val))}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[1, 2, 3, 4, 5].map((rating) => (
                                  <SelectItem key={rating} value={rating.toString()}>
                                    {'⭐'.repeat(rating)} ({rating})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control as any}
                      name={`testimonialsSettings.testimonials.${index}.text`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Testimonial Text</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Share your experience..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control as any}
                      name={`testimonialsSettings.testimonials.${index}.isActive`}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Display on website</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" onClick={addTestimonial}>
                <Plus className="mr-2 h-4 w-4" />
                Add Testimonial
              </Button>
            </CardContent>
          </Card>

          {/* Save/Discard Buttons */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
            <div className="text-sm">
              {isDirty ? (
                <span className="text-amber-600 dark:text-amber-500">Unsaved changes</span>
              ) : (
                <span className="text-muted-foreground">No changes</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!isDirty || isSaving}
                onClick={onReset}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Discard
              </Button>
              <Button type="submit" disabled={!isDirty || isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
