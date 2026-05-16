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

export const WebsiteProfileSettingsCard = memo(function WebsiteProfileSettingsCard() {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Website Profile & Service Area</CardTitle>
        <CardDescription>
          Configure core website metadata and the service areas shown across the site
        </CardDescription>
        <div className="text-xs text-muted-foreground space-y-1">
          <a href="/" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Inspect homepage</a>
          <span className="mx-2">•</span>
          <a href="/#owner-section" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Inspect owner section</a>
          <span className="mx-2">•</span>
          <a href="/#site-footer" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Inspect footer</a>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="websiteProfileSettings.siteUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website URL</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="websiteProfileSettings.ogImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Open Graph Image URL</FormLabel>
              <FormDescription>
                Used when your site link is shared on social platforms (Facebook, X, LinkedIn, iMessage) to show the preview image.
              </FormDescription>
              <FormControl>
                <Input type="url" placeholder="https://example.com/og.jpg" {...field} />
              </FormControl>
              <div className="text-xs">
                <a href={field.value || '#'} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Preview OG image URL</a>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="websiteProfileSettings.ownerImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner Section Image URL</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://example.com/images/owner.jpg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="websiteProfileSettings.logoImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logo Image URL</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://example.com/logo.svg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="websiteProfileSettings.siteDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website Description</FormLabel>
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
          name="websiteProfileSettings.serviceArea"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service Area (comma-separated)</FormLabel>
              <FormDescription>
                Example: Syracuse, Liverpool, Cicero
              </FormDescription>
              <FormControl>
                <textarea
                  className="min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={(field.value || []).join(', ')}
                  onChange={(e) => {
                    const value = e.target.value
                      .split(',')
                      .map((city) => city.trim())
                      .filter(Boolean);
                    field.onChange(value);
                  }}
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
