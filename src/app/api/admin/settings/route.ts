import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured } from '@/lib/prisma';
import { getAdminSettings, updateAdminSettings } from '@/lib/api/admin-settings';
import { fullSettingsSchema } from '@/lib/validations/admin-settings';
import type { AdminSettings, ApiResponse } from '@/types/admin';

/**
 * GET /api/admin/settings - Get all admin settings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as { id: string; role?: string }).role;
    if (!role || !['staff', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isDatabaseConfigured()) {
      const { getDefaultSettings } = await import('@/lib/api/admin-settings');
      return NextResponse.json({
        success: true,
        data: getDefaultSettings(),
      } as ApiResponse<AdminSettings>);
    }

    const settings = await getAdminSettings();

    return NextResponse.json({
      success: true,
      data: settings,
    } as ApiResponse<AdminSettings>);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/admin/settings - Update admin settings
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as { id: string; role?: string }).role;
    if (!role || !['staff', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 },
      );
    }

    const body = (await request.json()) as Partial<AdminSettings>;

    // Validate the request body with Zod (allow partial updates)
    const validation = fullSettingsSchema.partial().safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validation.error.issues 
        },
        { status: 400 },
      );
    }

    const settings = await updateAdminSettings(validation.data as Partial<AdminSettings>);

    return NextResponse.json({
      success: true,
      data: settings,
    } as ApiResponse<AdminSettings>);
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/settings - Partial update admin settings
 * Mirrors PUT behavior for compatibility with settings cards that submit partial payloads.
 */
export async function PATCH(request: NextRequest) {
  return PUT(request);
}
