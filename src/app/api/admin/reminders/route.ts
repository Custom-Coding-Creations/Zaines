import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { dispatchDueAutomatedReminders, generateAutomatedReminders } from '@/lib/reminders';

async function authorize() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const role = (session.user as { role?: string }).role;
  if (!role || !['staff', 'admin'].includes(role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { session };
}

export async function GET() {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ success: true, data: [] });
  }

  const reminders = await prisma.automatedReminder.findMany({
    include: {
      recipientUser: { select: { name: true, email: true } },
      booking: { select: { bookingNumber: true } },
      pet: { select: { name: true } },
    },
    orderBy: [{ sent: 'asc' }, { scheduledFor: 'asc' }],
    take: 100,
  });

  return NextResponse.json({ success: true, data: reminders });
}

export async function POST(request: NextRequest) {
  const authResult = await authorize();
  if (authResult.error) return authResult.error;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { action?: 'generate' | 'dispatch' | 'run'; limit?: number };
  const action = body.action || 'run';
  const limit = Math.min(Math.max(body.limit ?? 50, 1), 200);

  const generationResult = action === 'dispatch' ? { generated: 0 } : await generateAutomatedReminders();
  const dispatchResult = action === 'generate' ? { dispatched: 0, queued: 0 } : await dispatchDueAutomatedReminders(limit);

  return NextResponse.json({
    success: true,
    data: {
      action,
      ...generationResult,
      ...dispatchResult,
    },
  });
}