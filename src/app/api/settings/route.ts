import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/prisma';
import { getAdminSettings, getDefaultSettings } from '@/lib/api/admin-settings';
import type { AdminSettings, ApiResponse } from '@/types/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/settings - Get public settings (no authentication required)
 * Used by public components like footer, contact page, booking CTA
 */
export async function GET() {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        {
          success: true,
          data: getDefaultSettings(),
        } as ApiResponse<AdminSettings>,
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
          },
        },
      );
    }

    const settings = await getAdminSettings();

    return NextResponse.json(
      {
        success: true,
        data: settings,
      } as ApiResponse<AdminSettings>,
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      },
    );
  } catch (error) {
    console.error('Error fetching public settings:', error);
    return NextResponse.json(
      {
        success: true,
        data: getDefaultSettings(),
      } as ApiResponse<AdminSettings>,
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      },
    );
  }
}
