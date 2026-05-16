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

export const PricingSettingsCard = memo(function PricingSettingsCard() {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing & Fees</CardTitle>
        <CardDescription>
          Configure nightly rates, tax, and multi-pet discounts used in booking quotes
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          <a href="/pricing" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Inspect on pricing page</a>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={control}
            name="pricingSettings.standardNightlyRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Standard Rate ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
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
            name="pricingSettings.deluxeNightlyRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deluxe Rate ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
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
            name="pricingSettings.luxuryNightlyRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Luxury Rate ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField
            control={control}
            name="pricingSettings.taxRatePercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tax Rate (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
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
            name="pricingSettings.twoPetDiscountPercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>2-Pet Discount (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
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
            name="pricingSettings.threePlusPetsDiscountPercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>3+ Pets Discount (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
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

        <FormField
          control={control}
          name="pricingSettings.currency"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel>Currency</FormLabel>
              <FormDescription>
                ISO currency code used in pricing responses (currently USD only in checkout)
              </FormDescription>
              <FormControl>
                <Input
                  placeholder="USD"
                  maxLength={3}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
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
