'use client';

import { memo } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { AvailabilityRules } from '@/types/admin';

export const AvailabilityRulesCard = memo(function AvailabilityRulesCard() {
  const { control, watch } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability & Scheduling Rules</CardTitle>
        <CardDescription>
          Configure booking constraints and scheduling windows
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          <a href="/book#booking-wizard" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Inspect booking wizard</a>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Min Nights */}
        <FormField
          control={control}
          name="availabilityRules.minNightsPerBooking"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum Nights Per Booking</FormLabel>
              <FormDescription>
                Minimum number of nights customers must book (e.g., 1 = at least 1 night minimum)
              </FormDescription>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Max Nights */}
        <FormField
          control={control}
          name="availabilityRules.maxNightsPerBooking"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Nights Per Booking</FormLabel>
              <FormDescription>
                Maximum number of nights in a single booking (e.g., 365 = up to 1 year)
              </FormDescription>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max="730"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Advance Booking Window */}
        <FormField
          control={control}
          name="availabilityRules.advanceBookingWindowDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Advance Booking Window (Days)</FormLabel>
              <FormDescription>
                How far in advance customers can book (e.g., 365 = up to 1 year ahead)
              </FormDescription>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  max="730"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Minimum Lead Time */}
        <FormField
          control={control}
          name="availabilityRules.minimumLeadTimeDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum Lead Time (Days)</FormLabel>
              <FormDescription>
                Minimum days before check-in to allow booking (e.g., 0 = same-day bookings, 1 = at least 1 day before)
              </FormDescription>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  max="90"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
});
