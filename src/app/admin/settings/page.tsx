'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  SettingsSidebar,
  type SettingsSection,
} from '@/components/admin/settings/SettingsSidebar';
import { SettingsPageSkeleton } from '@/components/admin/settings/SettingsPageSkeleton';
import { GeneralTab } from '@/components/admin/settings/tabs/GeneralTab';
import { BookingTab } from '@/components/admin/settings/tabs/BookingTab';
import { PricingTab } from '@/components/admin/settings/tabs/PricingTab';
import { BlackoutDatesTab } from '@/components/admin/settings/tabs/BlackoutDatesTab';
import { ServicesTab } from '@/components/admin/settings/tabs/ServicesTab';
import { WebsiteTab } from '@/components/admin/settings/tabs/WebsiteTab';
import { TestimonialsTab } from '@/components/admin/settings/tabs/TestimonialsTab';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const VALID_SECTIONS: SettingsSection[] = [
  'general',
  'booking',
  'pricing',
  'blackout-dates',
  'services',
  'website',
  'testimonials',
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [dirtySections, setDirtySections] = useState<Set<SettingsSection>>(
    new Set(),
  );
  const [pendingSection, setPendingSection] = useState<SettingsSection | null>(
    null,
  );

  // Get active section from URL, default to 'general'
  const rawSection = searchParams?.get('section');
  const activeSection: SettingsSection = VALID_SECTIONS.includes(
    rawSection as SettingsSection,
  )
    ? (rawSection as SettingsSection)
    : 'general';

  // Initial load complete after mount
  useEffect(() => {
    setIsInitialLoad(false);
  }, []);

  // Handle section change with unsaved changes warning
  const handleSectionChange = (newSection: SettingsSection) => {
    if (dirtySections.has(activeSection)) {
      // Show confirmation dialog
      const confirmed = window.confirm(
        `You have unsaved changes in ${activeSection}. Discard changes and switch sections?`,
      );

      if (!confirmed) {
        return;
      }

      // Clear dirty state for current section
      setDirtySections((prev) => {
        const next = new Set(prev);
        next.delete(activeSection);
        return next;
      });
    }

    // Update URL
    router.push(`/admin/settings?section=${newSection}`);
  };

  // Handle dirty state changes from child tabs
  const handleDirtyChange = (section: SettingsSection, isDirty: boolean) => {
    setDirtySections((prev) => {
      const next = new Set(prev);
      if (isDirty) {
        next.add(section);
      } else {
        next.delete(section);
      }
      return next;
    });
  };

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtySections.size > 0) {
        e.preventDefault();
        e.returnValue =
          'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtySections]);

  // Show skeleton on initial load
  if (isInitialLoad) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold">Admin Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure business operations, booking rules, and website content
        </p>
      </div>

      {/* Warning for unsaved changes */}
      {dirtySections.size > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes in:{' '}
            {Array.from(dirtySections)
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              .join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Layout: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <SettingsSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          dirtySections={dirtySections}
        />

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {activeSection === 'general' && (
            <GeneralTab
              onDirtyChange={(dirty) =>
                handleDirtyChange('general', dirty)
              }
            />
          )}
          {activeSection === 'booking' && (
            <BookingTab
              onDirtyChange={(dirty) =>
                handleDirtyChange('booking', dirty)
              }
            />
          )}
          {activeSection === 'pricing' && (
            <PricingTab
              onDirtyChange={(dirty) =>
                handleDirtyChange('pricing', dirty)
              }
            />
          )}
          {activeSection === 'blackout-dates' && (
            <BlackoutDatesTab
              onDirtyChange={(dirty) =>
                handleDirtyChange('blackout-dates', dirty)
              }
            />
          )}
          {activeSection === 'services' && (
            <ServicesTab
              onDirtyChange={(dirty) =>
                handleDirtyChange('services', dirty)
              }
            />
          )}
          {activeSection === 'website' && (
            <WebsiteTab
              onDirtyChange={(dirty) =>
                handleDirtyChange('website', dirty)
              }
            />
          )}
          {activeSection === 'testimonials' && (
            <TestimonialsTab
              onDirtyChange={(dirty) =>
                handleDirtyChange('testimonials', dirty)
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

