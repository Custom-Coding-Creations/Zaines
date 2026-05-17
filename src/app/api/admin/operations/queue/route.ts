import { NextResponse } from 'next/server';
import { isDatabaseConfigured, prisma } from '@/lib/prisma';
import type { AdminOperationsQueueResponse } from '@/types/admin';
import { getAdminSettings } from '@/lib/api/admin-settings';
import { requireStaffSession } from '@/lib/api/admin-auth';
import { collectStaffingExceptions } from '@/lib/play-groups/staffing-exceptions';

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

function normalizeMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function countStaffWithOverlappingShifts(
  schedules: Array<{ staffMemberId: string; shiftStart: string; shiftEnd: string }>,
) {
  const byStaff = new Map<string, Array<{ start: number; end: number }>>();

  for (const schedule of schedules) {
    const start = normalizeMinutes(schedule.shiftStart);
    const end = normalizeMinutes(schedule.shiftEnd);
    if (start === null || end === null || end <= start) continue;

    const existing = byStaff.get(schedule.staffMemberId) ?? [];
    existing.push({ start, end });
    byStaff.set(schedule.staffMemberId, existing);
  }

  let overlapCount = 0;
  for (const intervals of byStaff.values()) {
    intervals.sort((left, right) => left.start - right.start);
    let hasOverlap = false;
    for (let i = 1; i < intervals.length; i += 1) {
      if (intervals[i].start < intervals[i - 1].end) {
        hasOverlap = true;
        break;
      }
    }
    if (hasOverlap) overlapCount += 1;
  }

  return overlapCount;
}

export async function GET() {
  try {
    const authResult = await requireStaffSession();
    if (authResult.error) return authResult.error;

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
    const inventoryStore = prisma.inventoryItem as unknown as {
      findMany?: (args: {
        where: { isActive: boolean };
        select: { currentStock: boolean; reorderLevel: boolean };
      }) => Promise<Array<{ currentStock: number; reorderLevel: number }>>;
      count: (args: { where: { isActive: boolean } }) => Promise<number>;
    };

    const inventoryMetricPromise =
      typeof inventoryStore.findMany === 'function'
        ? inventoryStore.findMany({
            where: {
              isActive: true,
            },
            select: {
              currentStock: true,
              reorderLevel: true,
            },
          })
        : inventoryStore.count({
            where: {
              isActive: true,
            },
          });

    const [
      checkInsToday,
      checkOutsToday,
      pendingConfirmations,
      unresolvedMessages,
      failedPayments,
      pendingReminders,
      inventoryLevels,
      expiringPackages,
      unassignedPlayGroups,
      unscheduledStaffToday,
      reconciliationExceptions,
      todayPlayGroupsForStaffingExceptions,
      todaysStaffSchedules,
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
      inventoryMetricPromise,
      prisma.customerPackage.count({
        where: {
          status: 'active',
          expiresAt: {
            gte: todayStart,
            lte: new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.playGroup.count({
        where: {
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
          staffMemberId: null,
        },
      }),
      prisma.staffMember.count({
        where: {
          isActive: true,
          schedules: {
            none: {
              date: {
                gte: todayStart,
                lte: todayEnd,
              },
            },
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
      prisma.playGroup.findMany({
        where: {
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        select: {
          id: true,
          name: true,
          date: true,
          timeSlot: true,
          staffMemberId: true,
          staffMember: {
            select: {
              schedules: {
                where: {
                  date: {
                    gte: todayStart,
                    lte: todayEnd,
                  },
                },
                select: {
                  shiftStart: true,
                  shiftEnd: true,
                },
              },
            },
          },
        },
      }),
      prisma.staffSchedule.findMany({
        where: {
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        select: {
          staffMemberId: true,
          shiftStart: true,
          shiftEnd: true,
        },
      }),
    ]);

    const staffingExceptions = collectStaffingExceptions(todayPlayGroupsForStaffingExceptions);
    const staffedGroupsWithoutShiftCoverage = staffingExceptions.summary.withoutShiftCoverage;
    const invalidPlayGroupTimeSlots = staffingExceptions.summary.invalidTimeSlot;
    const actionableStaffingExceptions = staffingExceptions.items.filter((item) => item.canAutoFix).length;
    const lowStockItems = Array.isArray(inventoryLevels)
      ? inventoryLevels.filter((item) => item.currentStock <= item.reorderLevel).length
      : inventoryLevels;

    const overlappingStaffShifts = countStaffWithOverlappingShifts(todaysStaffSchedules);

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
          id: 'low_stock_items',
          label: 'Low-stock items',
          count: lowStockItems,
          href: '/admin/inventory',
          description: 'Inventory items at or below reorder level.',
          severity: lowStockItems >= 5 ? 'critical' : lowStockItems > 0 ? 'attention' : 'normal',
        },
        {
          id: 'expiring_packages',
          label: 'Expiring packages',
          count: expiringPackages,
          href: '/admin/packages',
          description: 'Active customer packages expiring within the next 7 days.',
          severity: expiringPackages >= 10 ? 'critical' : expiringPackages > 0 ? 'attention' : 'normal',
        },
        {
          id: 'unassigned_play_groups',
          label: 'Unassigned play groups',
          count: unassignedPlayGroups,
          href: '/admin/play-groups',
          description: 'Today\'s play groups without an assigned staff lead.',
          severity:
            unassignedPlayGroups >= 3
              ? 'critical'
              : unassignedPlayGroups > 0
                ? 'attention'
                : 'normal',
        },
        {
          id: 'actionable_staffing_exceptions',
          label: 'Actionable staffing exceptions',
          count: actionableStaffingExceptions,
          href: '/admin/play-groups',
          description: 'Play groups with fixable staffing exceptions ready for auto-remediation.',
          severity:
            actionableStaffingExceptions >= 3
              ? 'critical'
              : actionableStaffingExceptions > 0
                ? 'attention'
                : 'normal',
        },
        {
          id: 'invalid_play_group_time_slots',
          label: 'Invalid play group time slots',
          count: invalidPlayGroupTimeSlots,
          href: '/admin/play-groups',
          description: 'Play groups with invalid time slot formats requiring manual correction.',
          severity:
            invalidPlayGroupTimeSlots > 0
              ? 'critical'
              : 'normal',
        },
        {
          id: 'unscheduled_staff_today',
          label: 'Unscheduled staff today',
          count: unscheduledStaffToday,
          href: '/admin/staff',
          description: 'Active staff members with no shift scheduled for today.',
          severity:
            unscheduledStaffToday >= 3
              ? 'critical'
              : unscheduledStaffToday > 0
                ? 'attention'
                : 'normal',
        },
        {
          id: 'staffed_groups_without_shift',
          label: 'Staffed groups outside shift',
          count: staffedGroupsWithoutShiftCoverage,
          href: '/admin/play-groups',
          description: 'Play groups assigned to staff without matching shift coverage.',
          severity:
            staffedGroupsWithoutShiftCoverage >= 3
              ? 'critical'
              : staffedGroupsWithoutShiftCoverage > 0
                ? 'attention'
                : 'normal',
        },
        {
          id: 'overlapping_staff_shifts',
          label: 'Overlapping staff shifts',
          count: overlappingStaffShifts,
          href: '/admin/staff',
          description: 'Staff members with overlapping shifts scheduled today.',
          severity:
            overlappingStaffShifts >= 2
              ? 'critical'
              : overlappingStaffShifts > 0
                ? 'attention'
                : 'normal',
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
