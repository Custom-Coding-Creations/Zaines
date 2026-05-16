'use client';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, X } from 'lucide-react';
import { useSettingsSectionForm } from '@/hooks/use-settings-section-form';
import {
  bookingSettingsSchema,
  type BookingSettingsFormValues,
} from '@/lib/validations/admin-settings';
import { bookingSettingsDefaults } from '@/lib/config/admin-settings-defaults';
import { AvailabilityRulesCard } from '@/components/admin/AvailabilityRulesCard';

const STRIPE_CAPABILITY_FLAGS = [
  {
    key: 'billingSubscriptionsEnabled' as const,
    label: 'Billing subscriptions',
    description: 'Recurring plans, subscriptions, and proration-safe changes.',
  },
  {
    key: 'customerPortalEnabled' as const,
    label: 'Customer portal',
    description: 'Self-service billing updates and plan changes.',
  },
  {
    key: 'savedPaymentMethodsEnabled' as const,
    label: 'Saved payment methods',
    description: 'Store and reuse cards for faster checkout experiences.',
  },
  {
    key: 'oneClickRebookingEnabled' as const,
    label: 'One-click rebooking',
    description:
      'Allow returning customers to confirm with a default payment method.',
  },
  {
    key: 'autopayEnabled' as const,
    label: 'Autopay authorization',
    description:
      'Enable optional automatic charging for upcoming balances and incidentals.',
  },
  {
    key: 'taxEnabled' as const,
    label: 'Stripe Tax',
    description: 'Automated tax calculation and reporting workflows.',
  },
  {
    key: 'disputesEnabled' as const,
    label: 'Disputes workflow',
    description: 'Chargeback evidence and response deadline tracking.',
  },
  {
    key: 'radarReviewEnabled' as const,
    label: 'Radar review flow',
    description: 'Risk-review queue for suspicious charges.',
  },
  {
    key: 'connectEnabled' as const,
    label: 'Connect platform',
    description: 'Connected account orchestration for partner models.',
  },
  {
    key: 'treasuryEnabled' as const,
    label: 'Treasury track',
    description: 'Financial account operations for advanced cash workflows.',
  },
  {
    key: 'issuingEnabled' as const,
    label: 'Issuing track',
    description: 'Card issuing controls for internal spend operations.',
  },
  {
    key: 'financialConnectionsEnabled' as const,
    label: 'Financial Connections',
    description: 'Bank account linking and ACH verification flows.',
  },
  {
    key: 'identityEnabled' as const,
    label: 'Identity verification',
    description: 'Verification gates for high-risk or regulated paths.',
  },
  {
    key: 'terminalEnabled' as const,
    label: 'Terminal in-person payments',
    description: 'card_present and in-person check-in charging capability.',
  },
  {
    key: 'premiumCheckoutReassuranceEnabled' as const,
    label: 'Premium checkout reassurance',
    description: 'Luxury reassurance panel near payment submission.',
  },
  {
    key: 'premiumCheckoutCopyEnabled' as const,
    label: 'Premium checkout copy',
    description: 'Enhanced copy for conversion in payment flows.',
  },
  {
    key: 'premiumCheckoutTrustIndicatorsEnabled' as const,
    label: 'Premium checkout trust indicators',
    description: 'Display badges like Stripe Climate, encrypted, etc.',
  },
  {
    key: 'premiumCheckoutLoadingExperienceEnabled' as const,
    label: 'Premium checkout loading experience',
    description: 'Polished loading/transition states in payment UI.',
  },
];

type BookingTabProps = {
  onDirtyChange?: (isDirty: boolean) => void;
};

export function BookingTab({ onDirtyChange }: BookingTabProps) {
  const sectionKeys: (keyof import('@/types/admin').AdminSettings)[] = [
    'autoConfirmBookings',
    'photoNotificationType',
    'photoNotificationTime',
    'dashboardDateRange',
    'stripeCapabilityFlags',
    'availabilityRules',
  ];

  const { form, isLoading, isSaving, isDirty, error, onSubmit, onReset } =
    useSettingsSectionForm({
      schema: bookingSettingsSchema,
      sectionKeys,
      defaults: bookingSettingsDefaults,
    });

  const watchedPhotoNotificationType = useWatch({
    control: form.control,
    name: 'photoNotificationType',
  });

  // Notify parent of dirty state changes
  if (onDirtyChange) {
    onDirtyChange(isDirty);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">Loading booking settings...</span>
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
        {/* Booking Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Preferences</CardTitle>
            <CardDescription>Control how new bookings are created</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control as any}
              name="autoConfirmBookings"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Auto-confirm Bookings</FormLabel>
                    <FormDescription>
                      Automatically confirm bookings when created from admin or phone
                      orders
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        startTransition(() => field.onChange(Boolean(checked)));
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="dashboardDateRange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dashboard Date Range</FormLabel>
                  <FormDescription>
                    Which dates to show in admin dashboard KPIs
                  </FormDescription>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="today">Today only</SelectItem>
                      <SelectItem value="today_tomorrow">
                        Today + Tomorrow
                      </SelectItem>
                      <SelectItem value="this_week">
                        This week (Mon-Sun)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="photoNotificationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo Notification Type</FormLabel>
                  <FormDescription>
                    How to send photo notifications to customers
                  </FormDescription>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="instant">Instant (real-time)</SelectItem>
                      <SelectItem value="daily_batch">Daily batch</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedPhotoNotificationType === 'daily_batch' && (
              <FormField
                control={form.control as any}
                name="photoNotificationTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Batch Time</FormLabel>
                    <FormDescription>
                      When to send the daily photo batch
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="time"
                        {...field}
                        value={field.value || ''}
                        className="w-32"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Stripe Capability Flags Card */}
        <Card>
          <CardHeader>
            <CardTitle>Stripe Capability Tracks</CardTitle>
            <CardDescription>
              Enable production-ready tracks as your business model expands.
              Disabled tracks remain integrated but dormant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {STRIPE_CAPABILITY_FLAGS.map((flag) => (
              <FormField
                key={flag.key}
                control={form.control as any}
                name={`stripeCapabilityFlags.${flag.key}`}
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        {flag.label}
                      </FormLabel>
                      <FormDescription className="text-xs">
                        {flag.description}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          startTransition(() => field.onChange(Boolean(checked)));
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </CardContent>
        </Card>

        {/* Availability Rules Card (existing component) */}
        <AvailabilityRulesCard />

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
                Save Booking Settings
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
