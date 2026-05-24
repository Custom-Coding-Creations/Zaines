import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured } from '@/lib/prisma';
import { saveLoyaltyProgramSettings, getAdminSettings } from '@/lib/api/admin-settings';
import type { LoyaltyProgramSettings } from '@/types/admin';

/**
 * GET /api/admin/settings/loyalty - Get loyalty program settings
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (!role || !['staff', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isDatabaseConfigured()) {
    const { getDefaultSettings } = await import('@/lib/api/admin-settings');
    return NextResponse.json({ success: true, data: getDefaultSettings().loyaltyProgramSettings });
  }

  const settings = await getAdminSettings();
  return NextResponse.json({ success: true, data: settings.loyaltyProgramSettings });
}

/**
 * PUT /api/admin/settings/loyalty - Save loyalty program settings
 */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (!role || role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  let body: LoyaltyProgramSettings;
  try {
    body = (await request.json()) as LoyaltyProgramSettings;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  await saveLoyaltyProgramSettings(body);
  return NextResponse.json({ success: true });
}
