import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured } from '@/lib/prisma';
import { awardPoints } from '@/lib/loyalty/paw-points';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { userId?: string; points?: number; reason?: string; description?: string; bookingId?: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { userId, points, reason, description, bookingId } = body;
  if (!userId || typeof points !== 'number' || points <= 0 || !reason) {
    return NextResponse.json({ error: 'userId, points, and reason are required' }, { status: 400 });
  }

  await awardPoints(userId, points, reason, bookingId, description);
  return NextResponse.json({ success: true });
}
