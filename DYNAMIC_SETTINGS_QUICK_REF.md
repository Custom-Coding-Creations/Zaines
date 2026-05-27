# Quick Reference: Dynamic Settings Implementation

## ✅ What Was Implemented

A real-time settings system where changes made in `/admin/settings` **instantly update across your entire site** without requiring a page rebuild or refresh.

### How It Works

1. **Admin changes settings** → Saved to database
2. **Settings API cache invalidated** → React Query refreshes data
3. **All components re-render** → Show new values immediately
4. **Sites updates live** → No manual refresh needed

## 🚀 For Every New Component Using Site Settings

### Step 1: Make it a Client Component
```typescript
'use client';  // Add at the very top
```

### Step 2: Import the Hook
```typescript
import { useSiteSettings } from "@/hooks/use-site-settings";
```

### Step 3: Use the Hook
```typescript
const { contactInfo, businessHours, isLoading } = useSiteSettings();
```

### Step 4: Use the Values
```typescript
// Instead of: siteConfig.contact.phone
// Use: contactInfo.phone

// Instead of: siteConfig.contact.address
// Use: contactInfo.address
```

## 📝 Example: Converting a Component

**Before (static):**
```typescript
import { siteConfig } from "@/config/site";

export function CallButton() {
  return (
    <a href={`tel:${siteConfig.contact.phone}`}>
      {siteConfig.contact.phone}
    </a>
  );
}
```

**After (dynamic):**
```typescript
'use client';

import { useSiteSettings } from "@/hooks/use-site-settings";

export function CallButton() {
  const { contactInfo } = useSiteSettings();
  return (
    <a href={`tel:${contactInfo.phone}`}>
      {contactInfo.phone}
    </a>
  );
}
```

## 🔍 Available Data from `useSiteSettings()`

```typescript
const { contactInfo, businessHours, isLoading } = useSiteSettings();

// contactInfo object:
{
  phone: string;      // "(315) 657-1332"
  email: string;      // "info@zainesstayandplay.com"
  address: string;    // "123 Pet Paradise Lane"
  city: string;       // "Syracuse"
  state: string;      // "NY"
  zip: string;        // "13202"
}

// businessHours object (each day has):
{
  openTime: string;   // "06:00"
  closeTime: string;  // "20:00"
  isClosed: boolean;  // false
}

// isLoading: boolean
// true while fetching settings, false when loaded
```

## 🎯 Where It's Already Been Implemented

✅ **SiteFooter** - Shows address, phone, email, hours
✅ **Contact Page** - Full contact information
✅ **Booking CTA** - Phone number in call button

## 🔨 Testing It Works

1. Go to `/admin/settings`
2. Change the address to something test-like (e.g., "999 Test Street")
3. Click "Save Settings"
4. Watch the success toast: "Settings saved successfully and updated across the site!"
5. Go to footer - address is updated
6. Go to `/contact` - address is updated
7. Refresh page - new address persists (from database)

## ⚠️ Important Notes

### Server Components (Static Metadata, Build-Time)
- Keep using `siteConfig` for build-time values
- Example: Page metadata, canonical URLs in layout

### Client Components (User-Facing Content)
- Use `useSiteSettings()` hook
- Example: Footer, contact page, dynamic content

### For SEO/Build-Time Values
- Keep static `siteConfig` in `/src/config/site.ts`
- Use in server components or build-time generation

## 🧠 How Caching Works

- **Cached for 1 minute** - No API calls within 1 minute
- **Refetches on window focus** - Click back on browser tab → data refreshes
- **Shared across components** - Multiple components = 1 API call
- **Invalidated on save** - When admin saves, all components re-fetch

## 🚨 Common Mistakes

❌ **Don't:** Use `siteConfig` in components that need live updates
```typescript
// BAD - won't update
const { contactInfo } = siteConfig;
```

✅ **Do:** Use the hook
```typescript
// GOOD - auto-updates
const { contactInfo } = useSiteSettings();
```

❌ **Don't:** Forget to add `'use client'` at the top
```typescript
// BAD - will error
import { useSiteSettings } from "@/hooks/use-site-settings";
```

✅ **Do:** Add it
```typescript
// GOOD
'use client';
import { useSiteSettings } from "@/hooks/use-site-settings";
```

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `/src/providers/settings-provider.tsx` | React Query provider & context |
| `/src/hooks/use-site-settings.ts` | Hook to access settings |
| `/src/components/providers.tsx` | Main provider wrapper |
| `/src/app/admin/settings/page.tsx` | Admin form (calls invalidate on save) |
| `/src/components/site-footer.tsx` | Updated to use hook |
| `/src/app/contact/page-content.tsx` | Updated to use hook |
| `/src/components/home/booking-cta.tsx` | Updated to use hook |

## 🎯 Next Steps

1. Find other components using `siteConfig` (grep: `import.*siteConfig`)
2. Convert them to client components
3. Replace with `useSiteSettings()` hook
4. Test by changing settings in admin panel

## 💡 Pro Tip

All changes are **real-time and persistent**. When you save settings:
- ✅ Database updated
- ✅ All connected clients notified
- ✅ Components automatically re-fetch
- ✅ UI updates instantly
- ✅ Changes persist across page reloads

No manual refreshing needed!
