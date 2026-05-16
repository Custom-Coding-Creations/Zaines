'use client';

import { useEffect } from 'react';
import { startTransition } from 'react';
import { useWatch } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, X } from 'lucide-react';
import { useSettingsSectionForm } from '@/hooks/use-settings-section-form';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import {
  generalSettingsSchema,
  type GeneralSettingsFormValues,
} from '@/lib/validations/admin-settings';
import { generalSettingsDefaults } from '@/lib/config/admin-settings-defaults';
import { BusinessProfileSettingsCard } from '@/components/admin/BusinessProfileSettingsCard';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const DAY_LABELS: Record<(typeof DAYS_OF_WEEK)[number], string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

type GeneralTabProps = {
  onDirtyChange?: (isDirty: boolean) => void;
};

export function GeneralTab({ onDirtyChange }: GeneralTabProps) {
  const sectionKeys: (keyof import('@/types/admin').AdminSettings)[] = [
    'businessHours',
    'contactPhone',
    'contactEmail',
    'address',
    'city',
    'state',
    'zip',
    'businessProfileSettings',
  ];

  const { form, isLoading, isSaving, isDirty, error, onSubmit, onReset } =
    useSettingsSectionForm({
      schema: generalSettingsSchema,
      sectionKeys,
      defaults: generalSettingsDefaults,
    });

  // Enable keyboard shortcuts (Ctrl+S to save, Esc to discard)
  useKeyboardShortcuts({
    onSave: () => {
      if (!isSaving && isDirty && form.formState.isValid) {
        onSubmit(form.getValues() as GeneralSettingsFormValues);
      }
    },
    onDiscard: () => {
      if (isDirty && !isSaving) {
        onReset();
      }
    },
    enabled: !isLoading,
  });

  // Watch business hours for conditional rendering
  const watchedBusinessHours = useWatch({
    control: form.control,
    name: 'businessHours',
  });

  // Notify parent of dirty state changes
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Loading general settings...</span>
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
        {/* Business Hours Card */}
        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>
              Set your operating hours for each day of the week
            </CardDescription>
            <div className="text-xs text-muted-foreground">
              <a
                href="/contact#hours-of-operation"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Inspect on contact page
              </a>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className={cn(
                  'flex flex-col sm:flex-row items-start sm:items-center gap-3 pb-3 border-b last:border-b-0',
                )}
              >
                {/* Day Label */}
                <span className="w-32 text-sm font-medium">
                  {DAY_LABELS[day]}
                </span>

                {/* Closed Checkbox */}
                <FormField
                  control={form.control as any}
                  name={`businessHours.${day}.isClosed`}
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
                        Closed
                      </FormLabel>
                    </FormItem>
                  )}
                />

                {/* Open/Close Times */}
                {!watchedBusinessHours?.[day]?.isClosed && (
                  <>
                    <FormField
                      control={form.control as any}
                      name={`businessHours.${day}.openTime`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Opens</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} className="w-24" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control as any}
                      name={`businessHours.${day}.closeTime`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Closes</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} className="w-24" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Contact Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Update business contact details displayed to customers
            </CardDescription>
            <div className="text-xs text-muted-foreground">
              <a
                href="/contact#contact-information"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Inspect on contact page
              </a>
              <span className="mx-2">•</span>
              <a
                href="/#site-footer"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Inspect in footer
              </a>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control as any}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="(315) 657-1332" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="contact@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control as any}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Syracuse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="NY" maxLength={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                      <Input placeholder="13202" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Business Profile Settings Card (existing component) */}
        <BusinessProfileSettingsCard />

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
                Save General Settings
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
