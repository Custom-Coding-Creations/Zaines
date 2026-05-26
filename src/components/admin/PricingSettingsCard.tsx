'use client';

import { memo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const PricingSettingsCard = memo(function PricingSettingsCard() {
  const { control, setValue } = useFormContext();
  const discountType = useWatch({ control, name: 'pricingSettings.multiPetDiscountType' }) ?? 'percent';
  const isFlat = discountType === 'flat';

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
        </div>

        {/* Multi-pet discount section */}
        <div className="space-y-4 rounded-xl border border-border/60 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Multi-Pet Discount</p>
              <p className="text-xs text-muted-foreground">Applied to each additional pet per night</p>
            </div>
            <FormField
              control={control}
              name="pricingSettings.multiPetDiscountType"
              render={({ field }) => (
                <div className="inline-flex rounded-lg border border-border bg-muted p-1 gap-1">
                  {(['percent', 'flat'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        field.onChange(type);
                        setValue('pricingSettings.multiPetDiscountType', type);
                      }}
                      className={cn(
                        'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                        field.value === type
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {type === 'percent' ? '% Percentage' : '$ Flat Fee'}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={control}
              name="pricingSettings.twoPetDiscountPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    2-Pet Discount {isFlat ? '($ off/pet/night)' : '(%)'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...(isFlat ? {} : { max: '100' })}
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
                  <FormLabel>
                    3+ Pets Discount {isFlat ? '($ off/pet/night)' : '(%)'}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...(isFlat ? {} : { max: '100' })}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={control}
          name="pricingSettings.currency"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel>Currency</FormLabel>
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
