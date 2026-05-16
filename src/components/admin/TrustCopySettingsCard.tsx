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

export const TrustCopySettingsCard = memo(function TrustCopySettingsCard() {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trust Copy</CardTitle>
        <CardDescription>
          Configure customer-facing disclosure copy with required compliance language
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          <a href="/book" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Inspect booking page</a>
          <span className="mx-2">•</span>
          <a href="/policies" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Inspect policies page</a>
          <span className="mx-2">•</span>
          <a href="/privacy" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Inspect privacy page</a>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="trustCopySettings.pricingDisclosure"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pricing Disclosure</FormLabel>
              <FormDescription>
                Must include wording about pre-confirmation visibility and hidden fees.
              </FormDescription>
              <FormControl>
                <textarea
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="trustCopySettings.cancellationProcessing"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cancellation Processing Note</FormLabel>
              <FormDescription>
                Message displayed on policies and terms pages for refund processing.
              </FormDescription>
              <FormControl>
                <textarea
                  className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="trustCopySettings.privacySecurityDisclosure"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Privacy & Security Disclosure</FormLabel>
              <FormDescription>
                Used on privacy-policy data security sections.
              </FormDescription>
              <FormControl>
                <textarea
                  className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="trustCopySettings.trustEvidenceClaim"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Trust Evidence Claim</FormLabel>
              <FormDescription>
                Short trust statement used on booking and policy hero areas.
              </FormDescription>
              <FormControl>
                <textarea
                  className="min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...field}
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
