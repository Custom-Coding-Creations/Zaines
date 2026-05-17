import { parseTimeSlotRange, shiftCoversRange, timeRangesOverlap } from '@/lib/play-groups/time-slot';

export type StaffingIssueType =
  | 'unassigned'
  | 'invalid_time_slot'
  | 'staff_without_shift_coverage'
  | 'staff_overlap_conflict';

export type StaffingExceptionInputGroup = {
  id: string;
  name: string;
  date: Date;
  timeSlot: string;
  staffMemberId: string | null;
  staffMember?: {
    user?: {
      name: string | null;
      email: string | null;
    };
    schedules: Array<{
      shiftStart: string;
      shiftEnd: string;
    }>;
  } | null;
};

export type StaffingExceptionItem = {
  groupId: string;
  groupName: string;
  date: string;
  timeSlot: string;
  staffMemberId: string | null;
  staffName: string | null;
  issues: StaffingIssueType[];
  canAutoFix: boolean;
  recommendedAction: string;
};

export type StaffingExceptionSummary = {
  total: number;
  unassigned: number;
  invalidTimeSlot: number;
  withoutShiftCoverage: number;
  overlapConflicts: number;
};

export function collectStaffingExceptions(groups: StaffingExceptionInputGroup[]): {
  items: StaffingExceptionItem[];
  summary: StaffingExceptionSummary;
} {
  const groupSlots = new Map(groups.map((group) => [group.id, parseTimeSlotRange(group.timeSlot)]));

  const overlapGroupIds = new Set<string>();
  const byStaff = new Map<string, StaffingExceptionInputGroup[]>();
  for (const group of groups) {
    if (!group.staffMemberId) continue;
    const current = byStaff.get(group.staffMemberId) ?? [];
    current.push(group);
    byStaff.set(group.staffMemberId, current);
  }

  for (const staffGroups of byStaff.values()) {
    const sorted = [...staffGroups].sort((left, right) => {
      const leftSlot = groupSlots.get(left.id) ?? null;
      const rightSlot = groupSlots.get(right.id) ?? null;
      if (!leftSlot || !rightSlot) return 0;
      return leftSlot.start - rightSlot.start;
    });

    for (let i = 1; i < sorted.length; i += 1) {
      const previous = sorted[i - 1];
      const current = sorted[i];
      const previousSlot = groupSlots.get(previous.id) ?? null;
      const currentSlot = groupSlots.get(current.id) ?? null;
      if (timeRangesOverlap(previousSlot, currentSlot)) {
        overlapGroupIds.add(previous.id);
        overlapGroupIds.add(current.id);
      }
    }
  }

  const items = groups
    .map((group) => {
      const issues: StaffingIssueType[] = [];
      const slot = groupSlots.get(group.id) ?? null;

      if (!group.staffMemberId) {
        issues.push('unassigned');
      }

      if (!slot) {
        issues.push('invalid_time_slot');
      }

      if (group.staffMember && slot) {
        const scheduledForSlot = group.staffMember.schedules.some((schedule) =>
          shiftCoversRange(slot, schedule.shiftStart, schedule.shiftEnd),
        );

        if (!scheduledForSlot) {
          issues.push('staff_without_shift_coverage');
        }
      }

      if (overlapGroupIds.has(group.id)) {
        issues.push('staff_overlap_conflict');
      }

      if (issues.length === 0) return null;

      return {
        groupId: group.id,
        groupName: group.name,
        date: group.date.toISOString(),
        timeSlot: group.timeSlot,
        staffMemberId: group.staffMemberId,
        staffName: group.staffMember?.user?.name ?? group.staffMember?.user?.email ?? null,
        issues,
        canAutoFix: !issues.includes('invalid_time_slot'),
        recommendedAction: issues.includes('invalid_time_slot')
          ? 'Correct time slot format before auto-assignment'
          : 'Run auto-assign recommendation for this group',
      } satisfies StaffingExceptionItem;
    })
    .filter((item): item is StaffingExceptionItem => item !== null);

  const summary: StaffingExceptionSummary = {
    total: items.length,
    unassigned: items.filter((item) => item.issues.includes('unassigned')).length,
    invalidTimeSlot: items.filter((item) => item.issues.includes('invalid_time_slot')).length,
    withoutShiftCoverage: items.filter((item) => item.issues.includes('staff_without_shift_coverage')).length,
    overlapConflicts: items.filter((item) => item.issues.includes('staff_overlap_conflict')).length,
  };

  return { items, summary };
}
