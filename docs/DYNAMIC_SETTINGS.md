# Dynamic Settings System - Documentation

## Overview

Your site now has a **dynamic settings system** that automatically updates across the entire site whenever you change settings in the admin panel. No more hardcoded values, no more rebuilding required!

## How It Works

### Architecture

```
User Changes Settings in Admin Panel
         ↓
API saves to Database (/api/admin/settings)
         ↓
React Query cache is invalidated
         ↓
All components using useSettings() hook automatically re-fetch
         ↓
Components re-render with new values
         ↓
Site updates instantly across all pages
```

### Components & Files

- **`/src/providers/settings-provider.tsx`** - React Query provider that manages settings state
- **`/src/hooks/use-site-settings.ts`** - Hook to access dynamic settings in components
- **`/src/components/providers.tsx`** - Main providers wrapper (now includes QueryClientProvider and SettingsProvider)
- **`/src/app/admin/settings/page.tsx`** - Admin settings form (now invalidates cache on save)

## Using Dynamic Settings

### In Your Components

Replace static imports of `siteConfig` with the `useSiteSettings()` hook:

**Before (static):**
```typescript
import { siteConfig } from "@/config/site";

export function MyComponent() {
  return <a href={`tel:${siteConfig.contact.phone}`}>{siteConfig.contact.phone}</a>;
}
```

**After (dynamic):**
```typescript
'use client';

import { useSiteSettings } from "@/hooks/use-site-settings";

export function MyComponent() {
  const { contactInfo } = useSiteSettings();
  return <a href={`tel:${contactInfo.phone}`}>{contactInfo.phone}</a>;
}
```

### What You Get from `useSiteSettings()`

```typescript
const { contactInfo, businessHours, isLoading } = useSiteSettings();

// contactInfo contains:
{
  phone: string;           // e.g., "(315) 657-1332"
  email: string;           // e.g., "info@zainesstayandplay.com"
  address: string;         // e.g., "123 Pet Paradise Lane"
  city: string;            // e.g., "Syracuse"
  state: string;           // e.g., "NY"
  zip: string;             // e.g., "13202"
}

// businessHours contains:
{
  monday: { openTime: string; closeTime: string; isClosed: boolean };
  tuesday: { openTime: string; closeTime: string; isClosed: boolean };
  // ... rest of week
}

// isLoading: boolean - true while fetching settings
```

### Helper Hooks

**Get formatted address string:**
```typescript
import { useFormattedAddress } from "@/hooks/use-site-settings";

export function MyComponent() {
  const address = useFormattedAddress(); // "123 Pet Paradise Lane, Syracuse, NY 13202"
  return <p>{address}</p>;
}
```

## Updated Components

The following components now use dynamic settings:

1. **SiteFooter** - Displays address, phone, email, business hours
2. **Contact Page** - Shows all contact information dynamically
3. **Booking CTA** - Phone number in call button

## How to Update More Components

1. Make it a `'use client'` component
2. Import the hook: `import { useSiteSettings } from "@/hooks/use-site-settings";`
3. Call the hook: `const { contactInfo, businessHours, isLoading } = useSiteSettings();`
4. Use the data instead of static `siteConfig`

## Important Notes

### Server Components

For **server-side components** (like the layout metadata), you should continue using static `siteConfig` for build-time metadata. These don't need to be dynamic since they're only used at build time.

### Client-Side vs Server-Side

- **Client components** (`'use client'`) → Use `useSiteSettings()` hook for dynamic updates
- **Server components** (default) → Use static `siteConfig` for build-time values
- **API routes** → Use `getAdminSettings()` from `/src/lib/api/admin-settings.ts`

### Performance

The settings are cached with React Query:
- **Stale time:** 1 minute - data is fresh for 1 minute without refetching
- **Refetch on window focus:** When you click back on the browser, settings are automatically refreshed
- **Background refetch:** Every component that uses the hook shares the same cache

This means:
- ✅ Multiple components don't make multiple API calls
- ✅ Data updates automatically when the window regains focus
- ✅ Very efficient caching strategy

## Testing the System

### Manual Test

1. Go to `/admin/settings`
2. Change the address or phone number
3. Click "Save Settings"
4. Watch the footer update immediately
5. Go to `/contact` - the address shows the new value
6. Refresh the page - the new value persists (it's from the database)

### What Happens on Save

When you save settings:
1. API updates the database
2. Success toast shows: "Settings saved successfully and updated across the site!"
3. React Query cache is invalidated
4. All components using `useSiteSettings()` automatically re-fetch
5. Components re-render with new values
6. No page reload needed!

## Troubleshooting

### Settings not updating?

1. **Make sure the component is a client component:** Add `'use client'` at the top
2. **Make sure you're using the hook:** `const { contactInfo } = useSiteSettings();`
3. **Check the admin settings endpoint:** Verify `/api/admin/settings` is accessible
4. **Check React Query DevTools:** Add `<ReactQueryDevtools initialIsOpen={false} />` to see cache state

### Settings updating but not persisting?

The database might not be configured. Check that your `DATABASE_URL` environment variable is set.

## API Endpoints

### GET /api/admin/settings

Fetches all current settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "contactPhone": "(315) 657-1332",
    "contactEmail": "info@zainesstayandplay.com",
    "address": "123 Pet Paradise Lane",
    "city": "Syracuse",
    "state": "NY",
    "zip": "13202",
    "businessHours": { ... },
    "availabilityRules": { ... },
    "blackoutDates": [],
    "seasonalPricingRules": []
  }
}
```

### PUT /api/admin/settings

Updates settings. Requires authentication (admin/staff role).

**Request body:** Any partial `AdminSettings` object

**Response:** Updated `AdminSettings` object

## Future Enhancements

You can extend this system to include:

- **Real-time updates:** Use WebSockets or Server-Sent Events for instant updates across all browser tabs
- **Settings UI validation:** Add client-side validation before saving
- **Settings history:** Track changes to settings over time
- **Settings rollback:** Ability to revert to previous settings
- **Custom settings:** Add new setting types without changing the core system

## Files Modified

- `src/providers/settings-provider.tsx` - NEW
- `src/hooks/use-site-settings.ts` - NEW
- `src/components/providers.tsx` - UPDATED
- `src/components/site-footer.tsx` - UPDATED
- `src/app/contact/page.tsx` - UPDATED
- `src/components/home/booking-cta.tsx` - UPDATED
- `src/app/admin/settings/page.tsx` - UPDATED

## Summary

You now have a production-ready dynamic settings system that:

✅ Automatically updates across the entire site
✅ No hardcoded values for configurable settings
✅ Efficient caching with React Query
✅ Refetches when browser window regains focus
✅ Works with both client and server components
✅ Easy to extend to new settings
