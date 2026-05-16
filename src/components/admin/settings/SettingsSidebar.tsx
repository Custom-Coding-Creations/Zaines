'use client';

import { cn } from '@/lib/utils';
import {
  Clock,
  DollarSign,
  Calendar,
  Package,
  Globe,
  MessageSquare,
  Settings,
} from 'lucide-react';
import type { ComponentType } from 'react';

export type SettingsSection =
  | 'general'
  | 'booking'
  | 'pricing'
  | 'blackout-dates'
  | 'services'
  | 'website'
  | 'testimonials';

type SettingsSidebarItem = {
  id: SettingsSection;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
};

const sidebarItems: SettingsSidebarItem[] = [
  {
    id: 'general',
    label: 'General',
    icon: Settings,
    description: 'Business hours, contact info, social links',
  },
  {
    id: 'booking',
    label: 'Booking',
    icon: Clock,
    description: 'Availability rules, auto-confirm, dashboard',
  },
  {
    id: 'pricing',
    label: 'Pricing',
    icon: DollarSign,
    description: 'Rates, seasonal pricing, cancellation policy',
  },
  {
    id: 'blackout-dates',
    label: 'Blackout Dates',
    icon: Calendar,
    description: 'Block dates and manage availability',
  },
  {
    id: 'services',
    label: 'Services',
    icon: Package,
    description: 'Service tiers and add-ons',
  },
  {
    id: 'website',
    label: 'Website',
    icon: Globe,
    description: 'SEO, trust copy, service areas',
  },
  {
    id: 'testimonials',
    label: 'Testimonials',
    icon: MessageSquare,
    description: 'Customer testimonials',
  },
];

type SettingsSidebarProps = {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  dirtySections?: Set<SettingsSection>;
  className?: string;
};

export function SettingsSidebar({
  activeSection,
  onSectionChange,
  dirtySections = new Set(),
  className,
}: SettingsSidebarProps) {
  return (
    <aside
      className={cn('w-full lg:w-64 shrink-0', className)}
      aria-label="Settings navigation"
    >
      {/* Desktop vertical nav */}
      <nav className="hidden lg:block sticky top-4">
        <ul className="space-y-1">
          {sidebarItems.map((item) => {
            const active = item.id === activeSection;
            const isDirty = dirtySections.has(item.id);
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    'focus-ring inline-flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors relative',
                    active
                      ? 'border-sidebar-border bg-sidebar-accent text-sidebar-foreground shadow-sm'
                      : 'border-transparent text-muted-foreground hover:border-sidebar-border hover:bg-sidebar/50 hover:text-foreground',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="size-5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.label}</span>
                      {isDirty && (
                        <span
                          className="size-2 rounded-full bg-orange-500 shrink-0"
                          aria-label="Unsaved changes"
                          title="Unsaved changes"
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {item.description}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile horizontal scrollable nav */}
      <nav className="lg:hidden -mx-4 px-4 overflow-x-auto border-b border-border">
        <ul className="flex gap-2 pb-4 min-w-max">
          {sidebarItems.map((item) => {
            const active = item.id === activeSection;
            const isDirty = dirtySections.has(item.id);
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSectionChange(item.id)}
                  className={cn(
                    'focus-ring inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors whitespace-nowrap',
                    active
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/70 hover:text-foreground',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                  {isDirty && (
                    <span
                      className="size-2 rounded-full bg-orange-500 shrink-0"
                      aria-label="Unsaved changes"
                      title="Unsaved changes"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
