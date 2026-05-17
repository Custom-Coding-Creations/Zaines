import { describe, expect, it } from 'vitest';
import { collectStaffingExceptions } from '@/lib/play-groups/staffing-exceptions';

describe('collectStaffingExceptions', () => {
  it('returns actionable and non-actionable exception metadata with summary counts', () => {
    const date = new Date('2026-05-16T00:00:00.000Z');

    const result = collectStaffingExceptions([
      {
        id: 'group-unassigned',
        name: 'Unassigned',
        date,
        timeSlot: '09:00-10:00',
        staffMemberId: null,
        staffMember: null,
      },
      {
        id: 'group-invalid',
        name: 'Invalid Slot',
        date,
        timeSlot: 'bad-slot',
        staffMemberId: 'staff-1',
        staffMember: {
          user: { name: 'Alex', email: 'alex@example.com' },
          schedules: [{ shiftStart: '08:00', shiftEnd: '17:00' }],
        },
      },
      {
        id: 'group-overlap-a',
        name: 'Overlap A',
        date,
        timeSlot: '13:00-14:30',
        staffMemberId: 'staff-2',
        staffMember: {
          user: { name: 'Jordan', email: 'jordan@example.com' },
          schedules: [{ shiftStart: '08:00', shiftEnd: '18:00' }],
        },
      },
      {
        id: 'group-overlap-b',
        name: 'Overlap B',
        date,
        timeSlot: '14:00-15:00',
        staffMemberId: 'staff-2',
        staffMember: {
          user: { name: 'Jordan', email: 'jordan@example.com' },
          schedules: [{ shiftStart: '08:00', shiftEnd: '18:00' }],
        },
      },
      {
        id: 'group-without-coverage',
        name: 'No Coverage',
        date,
        timeSlot: '16:00-17:00',
        staffMemberId: 'staff-3',
        staffMember: {
          user: { name: 'Sam', email: 'sam@example.com' },
          schedules: [{ shiftStart: '08:00', shiftEnd: '12:00' }],
        },
      },
    ]);

    expect(result.summary.total).toBe(5);
    expect(result.summary.unassigned).toBe(1);
    expect(result.summary.invalidTimeSlot).toBe(1);
    expect(result.summary.withoutShiftCoverage).toBe(1);
    expect(result.summary.overlapConflicts).toBe(2);

    const invalid = result.items.find((item) => item.groupId === 'group-invalid');
    expect(invalid?.canAutoFix).toBe(false);

    const unassigned = result.items.find((item) => item.groupId === 'group-unassigned');
    expect(unassigned?.canAutoFix).toBe(true);
  });
});
