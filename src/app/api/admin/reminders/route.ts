import { NextRequest, NextResponse } from 'next/server';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { dispatchDueAutomatedReminders, generateAutomatedReminders } from '@/lib/reminders';

export async function GET() {
  try {
    const authResult = await requireStaffSession();
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
  } catch (error) {
    console.error('Failed to load reminders', error);
    return NextResponse.json({ error: 'Failed to load reminders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireStaffSession();
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
  } catch (error) {
    console.error('Failed to run reminders workflow', error);
    return NextResponse.json({ error: 'Failed to run reminders workflow' }, { status: 500 });
  }
}