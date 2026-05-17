import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authMock, prismaMock, appendPlayGroupAuditEventMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  appendPlayGroupAuditEventMock: vi.fn(),
  prismaMock: {
    playGroup: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    staffMember: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  auth: authMock,
}));

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
  isDatabaseConfigured: vi.fn(() => true),
}));

vi.mock('@/lib/api/play-group-audit', () => ({
  appendPlayGroupAuditEvent: appendPlayGroupAuditEventMock,
}));

import { POST } from '@/app/api/admin/play-groups/auto-assign/route';

describe('admin play groups auto-assign route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockResolvedValue([]);
  });

  it('returns 401 without session', async () => {
    authMock.mockResolvedValue(null);

    const response = await POST(new NextRequest('http://localhost/api/admin/play-groups/auto-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }));

    expect(response.status).toBe(401);
  });

  it('auto-assigns unassigned groups when suitable staff is available', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.playGroup.findMany.mockResolvedValue([
      {
        id: 'group-1',
        name: 'Morning A',
        timeSlot: '09:00-10:00',
        energyLevel: 'moderate',
        staffMemberId: null,
      },
      {
        id: 'group-2',
        name: 'Morning B',
        timeSlot: '10:30-11:30',
        energyLevel: 'high',
        staffMemberId: null,
      },
    ]);

    prismaMock.staffMember.findMany.mockResolvedValue([
      {
        id: 'staff-1',
        role: 'handler',
        certifications: ['Behavior Handling'],
        schedules: [{ shiftStart: '08:00', shiftEnd: '16:00' }],
        playGroups: [],
      },
      {
        id: 'staff-2',
        role: 'groomer',
        certifications: [],
        schedules: [{ shiftStart: '12:00', shiftEnd: '17:00' }],
        playGroups: [],
      },
    ]);

    const response = await POST(new NextRequest('http://localhost/api/admin/play-groups/auto-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-05-16T00:00:00.000Z' }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.plannedAssignments).toBe(2);
    expect(payload.data.appliedAssignments).toBe(2);
    expect(payload.data.assigned).toBe(2);
    expect(payload.data.auditEventsRecorded).toBe(2);
    expect(payload.data.skippedReasonCounts).toEqual({});
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(appendPlayGroupAuditEventMock).toHaveBeenCalledTimes(2);
    expect(appendPlayGroupAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'STAFF_AUTO_ASSIGNED',
        metadata: expect.objectContaining({ source: 'bulk_auto_assign' }),
      }),
    );
  });

  it('skips groups when no suitable staff recommendation is available', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.playGroup.findMany.mockResolvedValue([
      {
        id: 'group-1',
        name: 'Morning A',
        timeSlot: '09:00-10:00',
        energyLevel: 'moderate',
        staffMemberId: null,
      },
    ]);

    prismaMock.staffMember.findMany.mockResolvedValue([
      {
        id: 'staff-1',
        role: 'handler',
        certifications: [],
        schedules: [{ shiftStart: '12:00', shiftEnd: '16:00' }],
        playGroups: [],
      },
    ]);

    const response = await POST(new NextRequest('http://localhost/api/admin/play-groups/auto-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-05-16T00:00:00.000Z' }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.plannedAssignments).toBe(0);
    expect(payload.data.appliedAssignments).toBe(0);
    expect(payload.data.assigned).toBe(0);
    expect(payload.data.auditEventsRecorded).toBe(0);
    expect(payload.data.skipped).toHaveLength(1);
    expect(payload.data.skippedReasonCounts).toEqual({
      'No suitable staff recommendation available': 1,
    });
    expect(payload.data.skipped[0].details).toEqual(
      expect.objectContaining({
        scheduledCandidateCount: 0,
      }),
    );
    expect(payload.data.skipped[0].details.bestScore).toEqual(expect.any(Number));
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(appendPlayGroupAuditEventMock).not.toHaveBeenCalled();
  });

  it('repairs groups assigned to unscheduled staff when repair mode is enabled', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.playGroup.findMany.mockResolvedValue([
      {
        id: 'group-1',
        name: 'Morning A',
        timeSlot: '09:00-10:00',
        energyLevel: 'moderate',
        staffMemberId: 'staff-2',
      },
      {
        id: 'group-2',
        name: 'Morning B',
        timeSlot: '10:30-11:30',
        energyLevel: 'high',
        staffMemberId: null,
      },
    ]);

    prismaMock.staffMember.findMany.mockResolvedValue([
      {
        id: 'staff-1',
        role: 'handler',
        certifications: ['Behavior Handling'],
        schedules: [{ shiftStart: '08:00', shiftEnd: '16:00' }],
        playGroups: [],
      },
      {
        id: 'staff-2',
        role: 'groomer',
        certifications: [],
        schedules: [{ shiftStart: '12:00', shiftEnd: '17:00' }],
        playGroups: [{ id: 'group-1', timeSlot: '09:00-10:00' }],
      },
    ]);

    const response = await POST(new NextRequest('http://localhost/api/admin/play-groups/auto-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-05-16T00:00:00.000Z', repairConflicts: true }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.repairConflicts).toBe(true);
    expect(payload.data.plannedAssignments).toBe(2);
    expect(payload.data.appliedAssignments).toBe(2);
    expect(payload.data.assigned).toBe(2);
    expect(payload.data.auditEventsRecorded).toBe(2);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(appendPlayGroupAuditEventMock).toHaveBeenCalledTimes(2);
  });

  it('repairs overlapping assignments by reassigning the conflicting group', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.playGroup.findMany.mockResolvedValue([
      {
        id: 'group-1',
        name: 'Overlap A',
        timeSlot: '09:00-10:30',
        energyLevel: 'moderate',
        staffMemberId: 'staff-1',
      },
      {
        id: 'group-2',
        name: 'Overlap B',
        timeSlot: '10:00-11:00',
        energyLevel: 'high',
        staffMemberId: 'staff-1',
      },
      {
        id: 'group-3',
        name: 'Helper Group',
        timeSlot: '12:00-13:00',
        energyLevel: 'calm',
        staffMemberId: null,
      },
    ]);

    prismaMock.staffMember.findMany.mockResolvedValue([
      {
        id: 'staff-1',
        role: 'handler',
        certifications: ['Behavior Handling'],
        schedules: [{ shiftStart: '08:00', shiftEnd: '16:00' }],
        playGroups: [
          { id: 'group-1', timeSlot: '09:00-10:30' },
          { id: 'group-2', timeSlot: '10:00-11:00' },
        ],
      },
      {
        id: 'staff-2',
        role: 'groomer',
        certifications: [],
        schedules: [{ shiftStart: '08:00', shiftEnd: '16:00' }],
        playGroups: [],
      },
    ]);

    const response = await POST(new NextRequest('http://localhost/api/admin/play-groups/auto-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-05-16T00:00:00.000Z', repairConflicts: true }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.repairConflicts).toBe(true);
    expect(payload.data.plannedAssignments).toBe(2);
    expect(payload.data.appliedAssignments).toBe(2);
    expect(payload.data.assigned).toBe(2);
    expect(payload.data.auditEventsRecorded).toBe(2);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(appendPlayGroupAuditEventMock).toHaveBeenCalledTimes(2);
  });

  it('repairs only scoped exception groups when groupIds are provided', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.playGroup.findMany.mockResolvedValue([
      {
        id: 'group-1',
        name: 'No Coverage',
        timeSlot: '09:00-10:00',
        energyLevel: 'moderate',
        staffMemberId: 'staff-2',
      },
      {
        id: 'group-2',
        name: 'Also No Coverage',
        timeSlot: '10:00-11:00',
        energyLevel: 'high',
        staffMemberId: 'staff-2',
      },
    ]);

    prismaMock.staffMember.findMany.mockResolvedValue([
      {
        id: 'staff-1',
        role: 'handler',
        certifications: ['Behavior Handling'],
        schedules: [{ shiftStart: '08:00', shiftEnd: '16:00' }],
        playGroups: [],
      },
      {
        id: 'staff-2',
        role: 'groomer',
        certifications: [],
        schedules: [{ shiftStart: '12:00', shiftEnd: '17:00' }],
        playGroups: [
          { id: 'group-1', timeSlot: '09:00-10:00' },
          { id: 'group-2', timeSlot: '10:00-11:00' },
        ],
      },
    ]);

    const response = await POST(new NextRequest('http://localhost/api/admin/play-groups/auto-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-05-16T00:00:00.000Z',
        repairConflicts: true,
        groupIds: ['group-1'],
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.attempted).toBe(1);
    expect(payload.data.plannedAssignments).toBe(1);
    expect(payload.data.appliedAssignments).toBe(1);
    expect(payload.data.assigned).toBe(1);
    expect(payload.data.auditEventsRecorded).toBe(1);
    expect(payload.data.assignments).toHaveLength(1);
    expect(payload.data.assignments[0].groupId).toBe('group-1');
    expect(appendPlayGroupAuditEventMock).toHaveBeenCalledTimes(1);
  });

  it('supports dry-run preview without persisting assignments or audit events', async () => {
    authMock.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
    prismaMock.playGroup.findMany.mockResolvedValue([
      {
        id: 'group-1',
        name: 'Preview Group',
        timeSlot: '09:00-10:00',
        energyLevel: 'moderate',
        staffMemberId: null,
      },
    ]);

    prismaMock.staffMember.findMany.mockResolvedValue([
      {
        id: 'staff-1',
        role: 'handler',
        certifications: ['Behavior Handling'],
        schedules: [{ shiftStart: '08:00', shiftEnd: '16:00' }],
        playGroups: [],
      },
    ]);

    const response = await POST(new NextRequest('http://localhost/api/admin/play-groups/auto-assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: '2026-05-16T00:00:00.000Z',
        repairConflicts: true,
        groupIds: ['group-1'],
        dryRun: true,
      }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.dryRun).toBe(true);
    expect(payload.data.attempted).toBe(1);
    expect(payload.data.plannedAssignments).toBe(1);
    expect(payload.data.appliedAssignments).toBe(0);
    expect(payload.data.assigned).toBe(1);
    expect(payload.data.auditEventsRecorded).toBe(0);
    expect(payload.data.assignments).toHaveLength(1);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(appendPlayGroupAuditEventMock).not.toHaveBeenCalled();
  });
});
