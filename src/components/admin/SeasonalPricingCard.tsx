'use client';

import { memo } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Trash2, Plus } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export const SeasonalPricingCard = memo(function SeasonalPricingCard() {
  const { control } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'seasonalPricingRules',
  });

  function addRule() {
    append({
      id: crypto.randomUUID(),
      name: '',
      startDate: '',
      endDate: '',
      priceMultiplier: 1.0,
      isActive: true,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seasonal Pricing</CardTitle>
        <CardDescription>
          Apply price multipliers for specific date ranges (e.g., 1.25 = 25% surcharge during holidays)
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          <a href="/book#booking-wizard" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Inspect booking wizard</a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            No seasonal pricing rules configured. Add rules below to apply price adjustments for specific periods.
          </p>
        )}

        {fields.map((field, index) => (
          <div key={field.id} className="p-4 border rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <FormField
                control={control}
                name={`seasonalPricingRules.${index}.name`}
                render={({ field: f }) => (
                  <FormItem className="flex-1 mr-3">
                    <FormLabel className="text-xs">Rule Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Holiday Weekend, Summer Peak" {...f} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="text-destructive hover:text-destructive mt-5 shrink-0"
                aria-label="Remove pricing rule"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Start Date */}
              <FormField
                control={control}
                name={`seasonalPricingRules.${index}.startDate`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...f} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* End Date */}
              <FormField
                control={control}
                name={`seasonalPricingRules.${index}.endDate`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs">End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...f} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price Multiplier */}
              <FormField
                control={control}
                name={`seasonalPricingRules.${index}.priceMultiplier`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs">
                      Price Multiplier
                      <span className="ml-1 text-muted-foreground font-normal">
                        (1.0 = no change)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.1"
                        max="10"
                        placeholder="1.25"
                        {...f}
                        onChange={(e) => f.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Active Toggle */}
            <FormField
              control={control}
              name={`seasonalPricingRules.${index}.isActive`}
              render={({ field: f }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={f.value}
                      onCheckedChange={f.onChange}
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal cursor-pointer">
                    Rule is active
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRule}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Pricing Rule
        </Button>
      </CardContent>
    </Card>
  );
});
