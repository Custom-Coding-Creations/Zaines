'use client';

import { memo } from 'react';
import { useFormContext } from 'react-hook-form';
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

export const CancellationPolicySettingsCard = memo(function CancellationPolicySettingsCard() {
  const { control, watch } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cancellation Policy</CardTitle>
        <CardDescription>
          Configure refund windows and percentages used when customers cancel bookings
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          <a href="/policies" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Inspect on policies page</a>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="cancellationPolicySettings.fullRefundHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Refund Window (Hours)</FormLabel>
                <FormDescription>
                  Customers cancelling at or above this threshold receive a full refund
                </FormDescription>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="cancellationPolicySettings.partialRefundHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Partial Refund Window (Hours)</FormLabel>
                <FormDescription>
                  Customers cancelling at or above this threshold receive a partial refund
                </FormDescription>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={control}
            name="cancellationPolicySettings.partialRefundPercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Partial Refund (%)</FormLabel>
                <FormDescription>
                  Percentage refunded for cancellations between partial and full windows
                </FormDescription>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="cancellationPolicySettings.noShowRefundPercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>No-Show Refund (%)</FormLabel>
                <FormDescription>
                  Refund percentage for no-shows (typically 0%)
                </FormDescription>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
});
