import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import type { AdminOperationsQueueResponse } from '@/types/admin';
import { getAdminSettings } from '@/lib/api/admin-settings';

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfToday(): Date {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as { role?: string }).role;
    if (!role || !['staff', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!isDatabaseConfigured()) {
      const empty: AdminOperationsQueueResponse = {
        generatedAt: new Date().toISOString(),
        items: [],
      };
      return NextResponse.json({ success: true, data: empty });
    }

    const todayStart = startOfToday();
    const todayEnd = endOfToday();
    const settings = await getAdminSettings();

    const [
      checkInsToday,
      checkOutsToday,
      pendingConfirmations,
      unresolvedMessages,
      failedPayments,
      pendingReminders,
      reconciliationExceptions,
    ] = await Promise.all([
      prisma.booking.count({
        where: {
          checkInDate: {
            gte: todayStart,
            lte: todayEnd,
          },
          status: {
            in: ['confirmed', 'checked_in'],
          },
        },
      }),
      prisma.booking.count({
        where: {
          checkOutDate: {
            gte: todayStart,
            lte: todayEnd,
          },
          status: 'checked_in',
        },
      }),
      prisma.booking.count({
        where: {
          status: 'pending',
        },
      }),
      prisma.message.count({
        where: {
          senderType: 'customer',
          isRead: false,
        },
      }),
      prisma.payment.count({
        where: {
          status: 'failed',
        },
      }),
      prisma.automatedReminder.count({
        where: {
          sent: false,
          scheduledFor: {
            lte: todayEnd,
          },
        },
      }),
      prisma.payment.count({
        where: {
          reconciliationStatus: {
            in: ['pending', 'disputed'],
          },
        },
      }),
    ]);

    const disputeDeadlines = settings.stripeCapabilityFlags.disputesEnabled
      ? await prisma.payment.count({
          where: {
            reconciliationStatus: 'disputed',
          },
        })
      : 0;

    const response: AdminOperationsQueueResponse = {
      generatedAt: new Date().toISOString(),
      items: [
        {
          id: 'check_ins_today',
          label: 'Check-ins today',
          count: checkInsToday,
          href: '/admin/bookings?status=confirmed',
          description: 'Arrivals that need check-in handling today.',
          severity: checkInsToday > 0 ? 'attention' : 'normal',
        },
        {
          id: 'check_outs_today',
          label: 'Check-outs today',
          count: checkOutsToday,
          href: '/admin/bookings?status=checked_in',
          description: 'Active stays expected to check out today.',
          severity: checkOutsToday > 0 ? 'attention' : 'normal',
        },
        {
          id: 'pending_confirmations',
          label: 'Pending confirmations',
          count: pendingConfirmations,
          href: '/admin/bookings?status=pending',
          description: 'Bookings awaiting staff confirmation.',
          severity: pendingConfirmations >= 5 ? 'critical' : pendingConfirmations > 0 ? 'attention' : 'normal',
        },
        {
          id: 'unresolved_messages',
          label: 'Unresolved messages',
          count: unresolvedMessages,
          href: '/admin/messages',
          description: 'Unread customer messages requiring a response.',
          severity: unresolvedMessages >= 10 ? 'critical' : unresolvedMessages > 0 ? 'attention' : 'normal',
        },
        {
          id: 'failed_payments',
          label: 'Failed payments',
          count: failedPayments,
          href: '/admin/finance?status=failed',
          description: 'Failed charges that may require recovery outreach.',
          severity: failedPayments >= 3 ? 'critical' : failedPayments > 0 ? 'attention' : 'normal',
        },
        {
          id: 'pending_reminders',
          label: 'Pending reminders',
          count: pendingReminders,
          href: '/admin/reminders',
          description: 'Due reminders awaiting generation or dispatch.',
          severity: pendingReminders >= 10 ? 'critical' : pendingReminders > 0 ? 'attention' : 'normal',
        },
        {
          id: 'reconciliation_exceptions',
          label: 'Reconciliation exceptions',
          count: reconciliationExceptions,
          href: '/admin/finance/reconciliation',
          description: 'Payments not fully reconciled against Stripe balances.',
          severity:
            reconciliationExceptions >= 5
              ? 'critical'
              : reconciliationExceptions > 0
                ? 'attention'
                : 'normal',
        },
        {
          id: 'dispute_deadlines',
          label: 'Dispute deadlines',
          count: disputeDeadlines,
          href: '/admin/finance/reconciliation',
          description: settings.stripeCapabilityFlags.disputesEnabled
            ? 'Disputed payments that need evidence response follow-up.'
            : 'Enable dispute workflow in settings to activate this queue.',
          severity: disputeDeadlines > 0 ? 'critical' : 'normal',
          capabilityBlocked: !settings.stripeCapabilityFlags.disputesEnabled,
        },
      ],
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Failed to load admin operations queue', error);
    return NextResponse.json(
      { error: 'Failed to load admin operations queue' },
      { status: 500 },
    );
  }
}
