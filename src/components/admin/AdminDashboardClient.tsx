'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminErrorState, AdminLoadingState } from '@/components/admin/AdminAsyncState';
import {
  Calendar,
  LogOut,
  Users,
  AlertCircle,
  ListChecks,
} from 'lucide-react';
import type {
  AdminBookingResponse,
  AdminOperationsQueueResponse,
  AdminQueueItem,
} from '@/types/admin';

interface KPICard {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  status?: 'success' | 'warning' | 'alert';
  action?: {
    label: string;
    href: string;
  };
}

type DashboardStaffingFixSummary = {
  mode: 'preview' | 'apply';
  attempted: number;
  assigned: number;
  auditEventsRecorded: number;
  skipped: number;
  skippedReasonCounts: Record<string, number>;
};

function statusBadgeVariant(
  status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'confirmed':
      return 'default';
    case 'checked_in':
      return 'secondary';
    case 'completed':
      return 'outline';
    case 'cancelled':
      return 'destructive';
    default:
      return 'outline';
  }
}

function getDateRange(
  dateRangeType: 'today' | 'today_tomorrow' | 'this_week',
): { startDate: Date; endDate: Date } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);

  if (dateRangeType === 'today_tomorrow') {
    endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 1);
    endDate.setHours(23, 59, 59, 999);
  } else if (dateRangeType === 'this_week') {
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    endDate = new Date(today);
    endDate.setDate(endDate.getDate() + daysUntilSunday);
    endDate.setHours(23, 59, 59, 999);
  }

  return { startDate: today, endDate };
}

interface AdminDashboardClientProps {
  dateRange: 'today' | 'today_tomorrow' | 'this_week';
}

export default function AdminDashboardClient({
  dateRange = 'today',
}: AdminDashboardClientProps) {
  const [bookings, setBookings] = useState<AdminBookingResponse[]>([]);
  const [operationsQueue, setOperationsQueue] = useState<AdminQueueItem[]>([]);
  const [kpis, setKpis] = useState<KPICard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [actionableStaffingGroupIds, setActionableStaffingGroupIds] = useState<string[]>([]);
  const [isFixingStaffing, setIsFixingStaffing] = useState(false);
  const [staffingFixSummary, setStaffingFixSummary] = useState<DashboardStaffingFixSummary | null>(null);

  const queueById = useCallback(
    (id: AdminQueueItem['id']) => operationsQueue.find((item) => item.id === id),
    [operationsQueue],
  );

  const staffingSummaryItems = [
    queueById('actionable_staffing_exceptions'),
    queueById('invalid_play_group_time_slots'),
    queueById('unassigned_play_groups'),
    queueById('staffed_groups_without_shift'),
    queueById('overlapping_staff_shifts'),
  ].filter((item): item is AdminQueueItem => Boolean(item));

  const staffingHasWork = staffingSummaryItems.some((item) => item.count > 0);
  const invalidSlotCount = queueById('invalid_play_group_time_slots')?.count ?? 0;

  // Calculate KPIs from bookings
  function calculateKPIs(bookingList: AdminBookingResponse[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count check-ins today
    const checkInsToday = bookingList.filter((b) => {
      const checkInDate = new Date(b.checkInDate);
      checkInDate.setHours(0, 0, 0, 0);
      return (
        checkInDate.getTime() === today.getTime() &&
        (b.status === 'confirmed' || b.status === 'checked_in')
      );
    }).length;

    // Count check-outs today
    const checkOutsToday = bookingList.filter((b) => {
      const checkOutDate = new Date(b.checkOutDate);
      checkOutDate.setHours(0, 0, 0, 0);
      return (
        checkOutDate.getTime() === today.getTime() && b.status === 'checked_in'
      );
    }).length;

    // Count pending confirmations
    const pendingConfirmations = bookingList.filter(
      (b) => b.status === 'pending',
    ).length;

    // Count currently checked in (occupancy)
    const checkedIn = bookingList.filter(
      (b) => b.status === 'checked_in',
    ).length;

    const newKPIs: KPICard[] = [
      {
        label: 'Check-ins Today',
        value: checkInsToday,
        icon: <Calendar className="h-4 w-4" />,
        status: checkInsToday > 0 ? 'success' : 'warning',
        action: {
          label: 'View Bookings',
          href: '/admin/bookings?status=confirmed',
        },
      },
      {
        label: 'Check-outs Today',
        value: checkOutsToday,
        icon: <LogOut className="h-4 w-4" />,
        status: checkOutsToday > 0 ? 'success' : 'warning',
        action: {
          label: 'View Bookings',
          href: '/admin/bookings?status=checked_in',
        },
      },
      {
        label: 'Current Occupancy',
        value: checkedIn,
        icon: <Users className="h-4 w-4" />,
        status: checkedIn > 0 ? 'success' : 'warning',
        action: {
          label: 'View Occupancy',
          href: '/admin/occupancy',
        },
      },
      {
        label: 'Pending Confirmations',
        value: pendingConfirmations,
        icon: <AlertCircle className="h-4 w-4" />,
        status: pendingConfirmations > 0 ? 'alert' : 'success',
        action: {
          label: 'Confirm Now',
          href: '/admin/bookings?status=pending',
        },
      },
    ];

    setKpis(newKPIs);
    setLastUpdated(new Date());
  }

  // Fetch bookings data
  const fetchBookings = useCallback(async () => {
    setErrorMessage('');

    try {
      const { startDate, endDate } = getDateRange(dateRange);
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const [bookingsRes, queueRes, staffingExceptionsRes] = await Promise.all([
        fetch(`/api/admin/bookings?${params}`),
        fetch('/api/admin/operations/queue'),
        fetch(`/api/admin/play-groups/staffing-exceptions?date=${encodeURIComponent(new Date().toISOString().slice(0, 10))}`),
      ]);

      const data = (await bookingsRes.json()) as {
        success?: boolean;
        data?: AdminBookingResponse[];
      };
      const queueData = (await queueRes.json()) as {
        success?: boolean;
        data?: AdminOperationsQueueResponse;
      };
      const exceptionsPayload = (await staffingExceptionsRes.json()) as {
        data?: {
          items?: Array<{ groupId: string; canAutoFix: boolean }>;
        };
      };

      if (data.data) {
        setBookings(data.data);
        calculateKPIs(data.data);
      }

      if (queueData.data?.items) {
        setOperationsQueue(queueData.data.items);
      }

      setActionableStaffingGroupIds(
        (exceptionsPayload.data?.items ?? [])
          .filter((item) => item.canAutoFix)
          .map((item) => item.groupId),
      );
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed loading dashboard data.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  async function runDashboardStaffingAutoFix(dryRun = false) {
    if (actionableStaffingGroupIds.length === 0) return;

    try {
      setIsFixingStaffing(true);
      setErrorMessage('');

      const response = await fetch('/api/admin/play-groups/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString(),
          repairConflicts: true,
          groupIds: actionableStaffingGroupIds,
          dryRun,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || 'Failed to run staffing auto-fix');
      }

      const payload = (await response.json()) as {
        data?: {
          attempted?: number;
          assigned?: number;
          auditEventsRecorded?: number;
          skippedReasonCounts?: Record<string, number>;
          skipped?: Array<{ groupId: string; reason: string }>;
        };
      };

      setStaffingFixSummary({
        mode: dryRun ? 'preview' : 'apply',
        attempted: payload.data?.attempted ?? 0,
        assigned: payload.data?.assigned ?? 0,
        auditEventsRecorded: payload.data?.auditEventsRecorded ?? 0,
        skipped: payload.data?.skipped?.length ?? 0,
        skippedReasonCounts: payload.data?.skippedReasonCounts ?? {},
      });

      await fetchBookings();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed running staffing auto-fix from dashboard.',
      );
    } finally {
      setIsFixingStaffing(false);
    }
  }

  // Initial fetch
  useEffect(() => {
     
    fetchBookings();
  }, [fetchBookings]);

  // Set up polling (5 second interval)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchBookings();
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [fetchBookings]);

  if (isLoading && bookings.length === 0) {
    return (
      <div className="py-8">
        <AdminLoadingState message="Loading staff dashboard…" />
      </div>
    );
  }

  if (errorMessage && bookings.length === 0) {
    return (
      <AdminErrorState
        title="Dashboard unavailable"
        message={errorMessage}
        action={{
          label: 'Retry Dashboard Load',
          onAction: () => {
            void fetchBookings();
          },
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Staff Dashboard</h1>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-1">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Link
          href="/admin/bookings/create"
          className="text-sm font-medium text-primary hover:underline"
        >
          + Create Booking
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const statusBg =
            kpi.status === 'success'
              ? 'bg-green-50 border-green-200'
              : kpi.status === 'alert'
                ? 'bg-red-50 border-red-200'
                : 'bg-yellow-50 border-yellow-200';

          return (
            <Card key={idx} className={statusBg}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {kpi.label}
                </CardTitle>
                {kpi.icon}
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">{kpi.value}</div>
                {kpi.action && (
                  <Link
                    href={kpi.action.href}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {kpi.action.label} →
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Operations Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {operationsQueue.length === 0 ? (
            <p className="text-sm text-muted-foreground">No queue items available.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {operationsQueue.map((item) => {
                const severityTone =
                  item.severity === 'critical'
                    ? 'border-red-200 bg-red-50'
                    : item.severity === 'attention'
                      ? 'border-amber-200 bg-amber-50'
                      : 'border-slate-200 bg-white';

                return (
                  <div key={item.id} className={`rounded-md border p-3 ${severityTone}`}>
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-medium">{item.label}</p>
                      <Badge variant={item.severity === 'critical' ? 'destructive' : 'outline'}>
                        {item.count}
                      </Badge>
                    </div>
                    <p className="mb-2 text-xs text-muted-foreground">{item.description}</p>
                    {item.capabilityBlocked ? (
                      <Link href="/admin/settings" className="text-xs font-medium text-primary hover:underline">
                        Enable capability in settings →
                      </Link>
                    ) : (
                      <Link href={item.href} className="text-xs font-medium text-primary hover:underline">
                        Open queue →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Staffing Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Live staffing signals and remediation entrypoints for today&apos;s play groups.
          </p>

          {staffingSummaryItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staffing queue metrics available yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {staffingSummaryItems.map((item) => (
                <div key={`staffing-${item.id}`} className="rounded-md border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-medium">{item.label}</p>
                    <Badge variant={item.severity === 'critical' ? 'destructive' : 'outline'}>
                      {item.count}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/play-groups" className="text-sm font-medium text-primary hover:underline">
              Open Play Groups Staffing Console →
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFixingStaffing || actionableStaffingGroupIds.length === 0}
              onClick={() => void runDashboardStaffingAutoFix(true)}
            >
              {isFixingStaffing
                ? 'Running...'
                : `Preview Auto-Fix (${actionableStaffingGroupIds.length})`}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFixingStaffing || actionableStaffingGroupIds.length === 0}
              onClick={() => void runDashboardStaffingAutoFix(false)}
            >
              {isFixingStaffing
                ? 'Fixing...'
                : `Run Auto-Fix (${actionableStaffingGroupIds.length})`}
            </Button>
            {staffingHasWork ? (
              <span className="text-xs text-amber-700">
                {invalidSlotCount > 0
                  ? 'Action needed: invalid time slots require manual correction in Play Groups before auto-fix.'
                  : 'Action needed: use Fix Actionable Exceptions in Play Groups.'}
              </span>
            ) : (
              <span className="text-xs text-emerald-700">Staffing exceptions are currently clear.</span>
            )}
          </div>
          {staffingFixSummary ? (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                Last {staffingFixSummary.mode === 'preview' ? 'preview' : 'quick-fix run'}: attempted {staffingFixSummary.attempted} · assigned {staffingFixSummary.assigned} · audit events {staffingFixSummary.auditEventsRecorded} · skipped {staffingFixSummary.skipped}
              </p>
              {Object.entries(staffingFixSummary.skippedReasonCounts)
                .slice(0, 2)
                .map(([reason, count]) => (
                  <p key={`${reason}-${count}`}>{count} skipped: {reason}</p>
                ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Bookings List */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          {dateRange === 'today'
            ? "Today's Bookings"
            : dateRange === 'today_tomorrow'
              ? 'Today & Tomorrow Bookings'
              : 'This Week Bookings'}
        </h2>

        {bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No bookings for this period.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const petNames = booking.bookingPets
                ?.map((bp) => bp.pet?.name)
                .filter(Boolean)
                .join(', ') || '—';

              return (
                <Card key={booking.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {booking.bookingNumber}
                      </CardTitle>
                      <Badge variant={statusBadgeVariant(booking.status)}>
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                      <div>
                        <div className="text-muted-foreground">Guest</div>
                        <div>
                          {booking.user?.name ?? booking.user?.email ?? '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Suite</div>
                        <div>{booking.suite?.name ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Pets</div>
                        <div>{petNames}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Dates</div>
                        <div>
                          {new Date(booking.checkInDate).toLocaleDateString()} →{' '}
                          {new Date(booking.checkOutDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                      {booking.status === 'confirmed' && (
                        <Link
                          href={`/admin/check-in/${booking.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Check In →
                        </Link>
                      )}
                      {booking.status === 'checked_in' && (
                        <>
                          <Link
                            href={`/admin/activities?bookingId=${booking.id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            Activity →
                          </Link>
                          <Link
                            href={`/admin/photos?bookingId=${booking.id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            Photos →
                          </Link>
                          <Link
                            href={`/admin/check-out/${booking.id}`}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            Check Out →
                          </Link>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
