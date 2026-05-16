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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

export const BusinessProfileSettingsCard = memo(function BusinessProfileSettingsCard() {
  const { control } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Profile & Social Links</CardTitle>
        <CardDescription>
          Configure branding and social channels displayed across the site
        </CardDescription>
        <div className="text-xs text-muted-foreground">
          <a href="/#site-footer" target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">Inspect in footer</a>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="businessProfileSettings.businessName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Name</FormLabel>
              <FormControl>
                <Input placeholder="Business name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={control}
            name="businessProfileSettings.socialLinks.facebook"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Facebook URL</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://facebook.com/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="businessProfileSettings.socialLinks.instagram"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Instagram URL</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://instagram.com/..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="businessProfileSettings.socialLinks.twitter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>X / Twitter URL</FormLabel>
                <FormControl>
                  <Input type="url" placeholder="https://twitter.com/..." {...field} />
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
