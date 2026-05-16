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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const BlackoutDatesCard = memo(function BlackoutDatesCard() {
  const { control } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'blackoutDates',
  });

  function addBlackoutDate() {
    append({
      id: crypto.randomUUID(),
      date: '',
      reason: '',
      blockType: 'full_day',
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blackout Dates</CardTitle>
        <CardDescription>
          Block specific dates when no new bookings are allowed (holidays, staff vacations, etc.)
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          <a href="/book#booking-wizard" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Inspect booking wizard</a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            No blackout dates configured. Add dates below to block bookings on those days.
          </p>
        )}

        {fields.map((field, index) => (
          <div key={field.id} className="flex items-end gap-3 p-4 border rounded-lg bg-muted/30">
            {/* Date Picker */}
            <FormField
              control={control}
              name={`blackoutDates.${index}.date`}
              render={({ field: f }) => (
                <FormItem className="flex-1 min-w-[130px]">
                  <FormLabel className="text-xs">Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...f} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Block Type */}
            <FormField
              control={control}
              name={`blackoutDates.${index}.blockType`}
              render={({ field: f }) => (
                <FormItem className="flex-1 min-w-[160px]">
                  <FormLabel className="text-xs">Block Type</FormLabel>
                  <Select onValueChange={f.onChange} value={f.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="full_day">Full Day</SelectItem>
                      <SelectItem value="check_in_only">No Check-ins</SelectItem>
                      <SelectItem value="check_out_only">No Check-outs</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason */}
            <FormField
              control={control}
              name={`blackoutDates.${index}.reason`}
              render={({ field: f }) => (
                <FormItem className="flex-[2]">
                  <FormLabel className="text-xs">Reason (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Staff vacation, Holiday closure" {...f} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Remove Button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              className="text-destructive hover:text-destructive mb-0.5"
              aria-label="Remove blackout date"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addBlackoutDate}
          className="mt-2"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Blackout Date
        </Button>
      </CardContent>
    </Card>
  );
});
