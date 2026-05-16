/** @vitest-environment jsdom */

import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminSettingsPage from '@/app/admin/settings/page';

const routerPush = vi.fn();
let mockSection = 'general';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'section' ? mockSection : null),
  }),
}));

vi.mock('@/components/admin/settings/SettingsPageSkeleton', () => ({
  SettingsPageSkeleton: () => <div data-testid="settings-skeleton">Loading...</div>,
}));

vi.mock('@/components/admin/settings/SettingsSidebar', () => ({
  SettingsSidebar: ({ activeSection, onSectionChange }: { activeSection: string; onSectionChange: (section: string) => void }) => (
    <div data-testid="settings-sidebar">
      <span data-testid="sidebar-active">{activeSection}</span>
      <button data-testid="switch-pricing" onClick={() => onSectionChange('pricing')}>
        Switch to pricing
      </button>
    </div>
  ),
}));

vi.mock('@/components/admin/settings/tabs/GeneralTab', () => ({
  GeneralTab: ({ onDirtyChange }: { onDirtyChange?: (isDirty: boolean) => void }) => (
    <div data-testid="general-tab">
      <button data-testid="mark-dirty" onClick={() => onDirtyChange?.(true)}>
        Mark dirty
      </button>
    </div>
  ),
}));

vi.mock('@/components/admin/settings/tabs/BookingTab', () => ({
  BookingTab: () => <div data-testid="booking-tab">Booking tab</div>,
}));

vi.mock('@/components/admin/settings/tabs/PricingTab', () => ({
  PricingTab: () => <div data-testid="pricing-tab">Pricing tab</div>,
}));

vi.mock('@/components/admin/settings/tabs/BlackoutDatesTab', () => ({
  BlackoutDatesTab: () => <div data-testid="blackout-dates-tab">Blackout tab</div>,
}));

vi.mock('@/components/admin/settings/tabs/ServicesTab', () => ({
  ServicesTab: () => <div data-testid="services-tab">Services tab</div>,
}));

vi.mock('@/components/admin/settings/tabs/WebsiteTab', () => ({
  WebsiteTab: () => <div data-testid="website-tab">Website tab</div>,
}));

vi.mock('@/components/admin/settings/tabs/TestimonialsTab', () => ({
  TestimonialsTab: () => <div data-testid="testimonials-tab">Testimonials tab</div>,
}));

describe('Admin settings page integration', () => {
  let container: HTMLDivElement;
  let root: Root;

  const renderPage = async () => {
    await act(async () => {
      root.render(<AdminSettingsPage />);
    });

    // Flush mount effect that switches from skeleton to content
    await act(async () => {
      await Promise.resolve();
    });
  };

  const click = async (testId: string) => {
    const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLButtonElement | null;
    expect(el).not.toBeNull();
    await act(async () => {
      el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
  };

  beforeEach(() => {
    routerPush.mockReset();
    mockSection = 'general';
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal('confirm', vi.fn(() => true));

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('defaults to general section when URL section is invalid', async () => {
    mockSection = 'not-a-valid-section';
    await renderPage();

    expect(document.querySelector('[data-testid="sidebar-active"]')?.textContent).toBe(
      'general',
    );
    expect(document.querySelector('[data-testid="general-tab"]')).not.toBeNull();
  });

  it('renders section from URL search params', async () => {
    mockSection = 'booking';
    await renderPage();

    expect(document.querySelector('[data-testid="sidebar-active"]')?.textContent).toBe(
      'booking',
    );
    expect(document.querySelector('[data-testid="booking-tab"]')).not.toBeNull();
  });

  it('requires confirmation before switching sections when current section is dirty', async () => {
    await renderPage();

    await click('mark-dirty');

    const confirmMock = vi.mocked(globalThis.confirm);
    confirmMock.mockReturnValueOnce(false);
    await click('switch-pricing');
    expect(routerPush).not.toHaveBeenCalled();

    confirmMock.mockReturnValueOnce(true);
    await click('switch-pricing');
    expect(routerPush).toHaveBeenCalledWith('/admin/settings?section=pricing');
  });
});
