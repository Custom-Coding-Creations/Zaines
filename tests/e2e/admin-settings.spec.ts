/**
 * E2E tests for admin settings page
 * Tests navigation, form state, saving, and user workflows
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin (adjust based on your auth setup)
    await page.goto('/admin/login');
    await page.fill('[name="email"]', 'admin@zainesstayandplay.com');
    await page.fill('[name="password"]', 'admin-password');
    await page.click('button[type="submit"]');
    
    // Navigate to settings
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Navigation', () => {
    test('defaults to general section', async ({ page }) => {
      await expect(page).toHaveURL(/section=general/);
      await expect(page.locator('text=Business Hours')).toBeVisible();
    });

    test('navigates between sections via sidebar', async ({ page }) => {
      // Click on Booking section
      await page.click('text=Booking');
      await expect(page).toHaveURL(/section=booking/);
      await expect(page.locator('text=Auto-confirm Bookings')).toBeVisible();

      // Click on Pricing section
      await page.click('text=Pricing');
      await expect(page).toHaveURL(/section=pricing/);
      await expect(page.locator('text=Standard Nightly Rate')).toBeVisible();
    });

    test('supports direct URL navigation to specific section', async ({ page }) => {
      await page.goto('/admin/settings?section=website');
      await expect(page.locator('text=Website Profile')).toBeVisible();
    });

    test('highlights active section in sidebar', async ({ page }) => {
      await page.click('text=Services');
      const servicesNav = page.locator('nav a:has-text("Services")');
      await expect(servicesNav).toHaveClass(/bg-accent/);
    });
  });

  test.describe('Form State & Dirty Tracking', () => {
    test('shows unsaved changes indicator when form is dirty', async ({ page }) => {
      // Edit a field
      await page.fill('[name="contactPhone"]', '(315) 555-9999');
      
      // Check for dirty indicator
      await expect(page.locator('text=Unsaved changes')).toBeVisible();
      
      // Check for dirty dot in sidebar
      const generalNav = page.locator('nav a:has-text("General")');
      await expect(generalNav.locator('.dirty-indicator')).toBeVisible();
    });

    test('warns when navigating away with unsaved changes', async ({ page }) => {
      // Edit a field
      await page.fill('[name="contactPhone"]', '(315) 555-9999');
      
      // Try to navigate to another section
      page.on('dialog', async dialog => {
        expect(dialog.message()).toContain('unsaved changes');
        await dialog.dismiss();
      });
      
      await page.click('text=Booking');
      
      // Should still be on General section
      await expect(page).toHaveURL(/section=general/);
    });

    test('allows navigation after saving changes', async ({ page }) => {
      // Edit and save
      await page.fill('[name="contactPhone"]', '(315) 555-9999');
      await page.click('button:has-text("Save Changes")');
      await expect(page.locator('text=Settings updated successfully')).toBeVisible();
      
      // Navigate to another section (no warning)
      await page.click('text=Booking');
      await expect(page).toHaveURL(/section=booking/);
    });

    test('allows navigation after discarding changes', async ({ page }) => {
      // Edit field
      await page.fill('[name="contactPhone"]', '(315) 555-9999');
      
      // Discard changes
      await page.click('button:has-text("Discard")');
      
      // Navigate to another section (no warning)
      await page.click('text=Booking');
      await expect(page).toHaveURL(/section=booking/);
    });
  });

  test.describe('Form Submission', () => {
    test('saves general settings successfully', async ({ page }) => {
      await page.fill('[name="contactPhone"]', '(315) 555-1111');
      await page.fill('[name="contactEmail"]', 'newemail@zainesstayandplay.com');
      
      await page.click('button:has-text("Save Changes")');
      
      // Check for success toast
      await expect(page.locator('text=Settings updated successfully')).toBeVisible();
      
      // Check that dirty indicator is gone
      await expect(page.locator('text=Unsaved changes')).not.toBeVisible();
    });

    test('shows validation errors for invalid data', async ({ page }) => {
      await page.fill('[name="contactEmail"]', 'invalid-email');
      
      await page.click('button:has-text("Save Changes")');
      
      // Check for validation error
      await expect(page.locator('text=Invalid email')).toBeVisible();
    });

    test('disables save button when form has errors', async ({ page }) => {
      await page.fill('[name="contactEmail"]', 'invalid-email');
      
      // Wait for validation
      await page.waitForTimeout(500);
      
      const saveButton = page.locator('button:has-text("Save Changes")');
      await expect(saveButton).toBeDisabled();
    });

    test('shows loading state while saving', async ({ page }) => {
      await page.fill('[name="contactPhone"]', '(315) 555-2222');
      
      // Click save and check for loading state
      await page.click('button:has-text("Save Changes")');
      await expect(page.locator('button:has-text("Saving...")')).toBeVisible();
    });
  });

  test.describe('Pricing Section - Business Logic', () => {
    test('enforces fullRefundHours > partialRefundHours constraint', async ({ page }) => {
      await page.goto('/admin/settings?section=pricing');
      
      // Set invalid values
      await page.fill('[name="cancellationPolicySettings.fullRefundHours"]', '24');
      await page.fill('[name="cancellationPolicySettings.partialRefundHours"]', '48');
      
      await page.click('button:has-text("Save Changes")');
      
      // Check for validation error
      await expect(page.locator('text=Full refund window must be greater')).toBeVisible();
    });

    test('accepts valid refund hours configuration', async ({ page }) => {
      await page.goto('/admin/settings?section=pricing');
      
      // Set valid values
      await page.fill('[name="cancellationPolicySettings.fullRefundHours"]', '72');
      await page.fill('[name="cancellationPolicySettings.partialRefundHours"]', '24');
      
      await page.click('button:has-text("Save Changes")');
      
      // Check for success
      await expect(page.locator('text=Settings updated successfully')).toBeVisible();
    });
  });

  test.describe('Services Section - Array Fields', () => {
    test('adds new service tier', async ({ page }) => {
      await page.goto('/admin/settings?section=services');
      await page.click('text=Service Tiers'); // Tab
      
      const initialTiers = await page.locator('[data-testid="service-tier"]').count();
      
      await page.click('button:has-text("Add Service Tier")');
      
      const newTierCount = await page.locator('[data-testid="service-tier"]').count();
      expect(newTierCount).toBe(initialTiers + 1);
    });

    test('removes service tier', async ({ page }) => {
      await page.goto('/admin/settings?section=services');
      await page.click('text=Service Tiers'); // Tab
      
      const initialTiers = await page.locator('[data-testid="service-tier"]').count();
      
      if (initialTiers > 1) {
        await page.locator('button:has-text("Remove")').first().click();
        
        const newTierCount = await page.locator('[data-testid="service-tier"]').count();
        expect(newTierCount).toBe(initialTiers - 1);
      }
    });

    test('switches between tiers and add-ons tabs', async ({ page }) => {
      await page.goto('/admin/settings?section=services');
      
      // Should start on Service Tiers tab
      await expect(page.locator('text=Service Tier')).toBeVisible();
      
      // Switch to Add-Ons tab
      await page.click('text=Add-Ons');
      await expect(page.locator('text=Add-On').or(page.locator('button:has-text("Add Add-On")'))).toBeVisible();
    });
  });

  test.describe('Testimonials Section', () => {
    test('loads service options for testimonials dropdown', async ({ page }) => {
      await page.goto('/admin/settings?section=testimonials');
      
      // Wait for form to load
      await page.waitForTimeout(1000);
      
      // Check that service label dropdown has options
      const firstTestimonial = page.locator('[data-testid="testimonial"]').first();
      await firstTestimonial.locator('select[name*="serviceLabel"]').click();
      
      // Should have at least one option (from service tiers)
      const options = await page.locator('option').count();
      expect(options).toBeGreaterThan(0);
    });

    test('adds new testimonial', async ({ page }) => {
      await page.goto('/admin/settings?section=testimonials');
      
      const initialCount = await page.locator('[data-testid="testimonial"]').count();
      
      await page.click('button:has-text("Add Testimonial")');
      
      const newCount = await page.locator('[data-testid="testimonial"]').count();
      expect(newCount).toBe(initialCount + 1);
    });

    test('validates testimonial text minimum length', async ({ page }) => {
      await page.goto('/admin/settings?section=testimonials');
      
      // Fill first testimonial with short text
      await page.fill('[name*="testimonials.0.text"]', 'Short');
      
      await page.click('button:has-text("Save Changes")');
      
      // Check for validation error
      await expect(page.locator('text=at least 10 characters')).toBeVisible();
    });
  });

  test.describe('Mobile Responsive', () => {
    test('shows horizontal sidebar on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/admin/settings');
      
      // Sidebar should be horizontal on mobile
      const sidebar = page.locator('[data-testid="settings-sidebar"]');
      const box = await sidebar.boundingBox();
      
      // Width should be close to viewport width
      expect(box?.width).toBeGreaterThan(300);
    });

    test('maintains functionality on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/admin/settings');
      
      // Navigate to different section
      await page.click('text=Booking');
      await expect(page).toHaveURL(/section=booking/);
      
      // Edit and save
      await page.click('[name="autoConfirmBookings"]');
      await page.click('button:has-text("Save Changes")');
      await expect(page.locator('text=Settings updated successfully')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('has proper ARIA labels on navigation', async ({ page }) => {
      const nav = page.locator('nav[aria-label]');
      await expect(nav).toBeVisible();
    });

    test('supports keyboard navigation', async ({ page }) => {
      // Tab through sidebar items
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Press Enter to navigate
      await page.keyboard.press('Enter');
      
      // Should navigate to next section
      await expect(page).not.toHaveURL(/section=general/);
    });

    test('has accessible form labels', async ({ page }) => {
      const labels = await page.locator('label').count();
      expect(labels).toBeGreaterThan(0);
      
      // All inputs should have associated labels
      const inputs = await page.locator('input, select, textarea').all();
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          await expect(label).toBeVisible();
        }
      }
    });
  });

  test.describe('beforeunload Warning', () => {
    test('shows browser warning when leaving page with unsaved changes', async ({ page }) => {
      // Edit a field
      await page.fill('[name="contactPhone"]', '(315) 555-3333');
      
      // Attempt to leave page
      let beforeUnloadFired = false;
      page.on('dialog', async dialog => {
        if (dialog.type() === 'beforeunload') {
          beforeUnloadFired = true;
        }
        await dialog.dismiss();
      });
      
      await page.goto('/admin');
      
      expect(beforeUnloadFired).toBe(true);
    });

    test('no warning when leaving page without changes', async ({ page }) => {
      let beforeUnloadFired = false;
      page.on('dialog', async dialog => {
        if (dialog.type() === 'beforeunload') {
          beforeUnloadFired = true;
        }
        await dialog.dismiss();
      });
      
      await page.goto('/admin');
      
      expect(beforeUnloadFired).toBe(false);
    });
  });

  test.describe('Error Handling', () => {
    test('shows error message on API failure', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/admin/settings', route => {
        route.fulfill({ status: 500, body: 'Internal Server Error' });
      });
      
      await page.fill('[name="contactPhone"]', '(315) 555-4444');
      await page.click('button:has-text("Save Changes")');
      
      // Check for error toast
      await expect(page.locator('text=Failed to save').or(page.locator('text=error'))).toBeVisible();
    });

    test('recovers from network errors', async ({ page }) => {
      // Simulate network error then recovery
      let callCount = 0;
      await page.route('**/api/admin/settings', route => {
        callCount++;
        if (callCount === 1) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });
      
      await page.fill('[name="contactPhone"]', '(315) 555-5555');
      await page.click('button:has-text("Save Changes")');
      
      // First attempt should fail
      await expect(page.locator('text=Failed').or(page.locator('text=error'))).toBeVisible();
      
      // Retry should succeed
      await page.click('button:has-text("Save Changes")');
      await expect(page.locator('text=Settings updated successfully')).toBeVisible();
    });
  });
});
