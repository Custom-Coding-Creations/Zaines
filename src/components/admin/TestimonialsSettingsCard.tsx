'use client';

import { startTransition, useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useInvalidateSettings } from '@/providers/settings-provider';
import type { AdminSettings } from '@/types/admin';

function createClientId(prefix: string): string {
  const randomPart = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
  return `${prefix}-${randomPart}`;
}

const testimonialSchema = z.object({
  id: z.string().min(1),
  author: z.string().min(1, 'Author is required'),
  petName: z.string().min(1, 'Pet name is required'),
  rating: z.number().min(1).max(5),
  date: z.string().min(1, 'Date label is required'),
  text: z.string().min(10, 'Testimonial text must be at least 10 characters'),
  serviceLabel: z.string().min(1, 'Service label is required'),
  isActive: z.boolean(),
  displayOrder: z.number().int().min(0),
});

const testimonialsFormSchema = z.object({
  testimonials: z.array(testimonialSchema).min(1, 'At least one testimonial is required'),
});

type TestimonialsFormValues = z.infer<typeof testimonialsFormSchema>;

export function TestimonialsSettingsCard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const { invalidate } = useInvalidateSettings();

  const form = useForm<TestimonialsFormValues>({
    resolver: zodResolver(testimonialsFormSchema),
    defaultValues: {
      testimonials: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'testimonials',
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings');
        const data = (await res.json()) as { success?: boolean; data?: AdminSettings };
        if (data.data?.serviceSettings?.serviceTiers) {
          const options = data.data.serviceSettings.serviceTiers
            .filter((tier) => tier.isActive)
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((tier) => tier.name);
          setServiceOptions(options);
        }
        if (data.data?.testimonialsSettings?.testimonials) {
          form.reset({ testimonials: data.data.testimonialsSettings.testimonials });
        }
      } catch (error) {
        console.error('Error loading testimonials settings:', error);
        toast.error('Failed to load testimonial settings');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [form]);

  async function onSubmit(values: TestimonialsFormValues) {
    setIsSaving(true);
    try {
      const normalized = values.testimonials.map((t, index) => ({
        ...t,
        displayOrder: index,
      }));

      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testimonialsSettings: {
            testimonials: normalized,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save testimonials');
      }

      await invalidate();
      toast.success('Testimonials updated successfully');
    } catch (error) {
      console.error('Testimonials save error:', error);
      toast.error('Failed to save testimonials');
    } finally {
      setIsSaving(false);
    }
  }

  function addTestimonial() {
    append({
      id: createClientId('testimonial'),
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
    <Card>
      <CardHeader>
        <CardTitle>Testimonials</CardTitle>
        <CardDescription>Manage homepage testimonial content and visibility</CardDescription>
        <div className="text-xs text-muted-foreground">
          <a href="/#testimonials-heading" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Inspect testimonials section</a>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Testimonial {index + 1}</p>
                    <div className="flex items-center gap-2">
                      <a
                        href={`/?testimonial=${encodeURIComponent(form.watch(`testimonials.${index}.id`))}#testimonials-heading`}
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
                      control={form.control}
                      name={`testimonials.${index}.author`}
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
                      control={form.control}
                      name={`testimonials.${index}.petName`}
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
                      control={form.control}
                      name={`testimonials.${index}.serviceLabel`}
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
                      control={form.control}
                      name={`testimonials.${index}.date`}
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
                      control={form.control}
                      name={`testimonials.${index}.rating`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rating (1-5)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="5"
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`testimonials.${index}.text`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Testimonial Text</FormLabel>
                        <FormControl>
                          <Input placeholder="Share what the family said about their experience" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`testimonials.${index}.isActive`}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              // Defer updates to reduce interaction blocking on large forms.
                              startTransition(() => field.onChange(Boolean(checked)));
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal cursor-pointer">
                          Show on homepage
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" className="w-full" onClick={addTestimonial}>
              <Plus className="mr-2 h-4 w-4" />
              Add Testimonial
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
                  Save Testimonials
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
