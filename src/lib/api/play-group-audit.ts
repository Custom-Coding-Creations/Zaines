import { isDatabaseConfigured, prisma } from '@/lib/prisma';

export const PLAY_GROUP_AUDIT_PREFIX = '[PLAY_GROUP_AUDIT]';

export type PlayGroupAuditEventInput = {
  actorUserId: string;
  actorName: string;
  eventType: 'STAFF_ASSIGNED' | 'STAFF_UNASSIGNED' | 'STAFF_AUTO_ASSIGNED';
  playGroupId: string;
  staffMemberId: string | null;
  metadata?: Record<string, unknown>;
};

export type PlayGroupAuditEventPayload = {
  eventType: 'STAFF_ASSIGNED' | 'STAFF_UNASSIGNED' | 'STAFF_AUTO_ASSIGNED';
  playGroupId: string;
  staffMemberId: string | null;
  metadata: Record<string, unknown>;
  timestamp: string;
};

export function buildPlayGroupAuditContent(input: PlayGroupAuditEventInput): string {
  return `${PLAY_GROUP_AUDIT_PREFIX}${JSON.stringify({
    eventType: input.eventType,
    playGroupId: input.playGroupId,
    staffMemberId: input.staffMemberId,
    metadata: input.metadata ?? {},
    timestamp: new Date().toISOString(),
  })}`;
}

export function parsePlayGroupAuditContent(content: string): PlayGroupAuditEventPayload | null {
  if (!content.startsWith(PLAY_GROUP_AUDIT_PREFIX)) {
    return null;
  }

  const jsonContent = content.slice(PLAY_GROUP_AUDIT_PREFIX.length);
  try {
    const parsed = JSON.parse(jsonContent) as Partial<PlayGroupAuditEventPayload>;

    if (
      (parsed.eventType !== 'STAFF_ASSIGNED' &&
        parsed.eventType !== 'STAFF_UNASSIGNED' &&
        parsed.eventType !== 'STAFF_AUTO_ASSIGNED') ||
      typeof parsed.playGroupId !== 'string' ||
      (parsed.staffMemberId !== null && typeof parsed.staffMemberId !== 'string') ||
      typeof parsed.timestamp !== 'string'
    ) {
      return null;
    }

    return {
      eventType: parsed.eventType,
      playGroupId: parsed.playGroupId,
      staffMemberId: parsed.staffMemberId,
      metadata:
        typeof parsed.metadata === 'object' && parsed.metadata !== null
          ? (parsed.metadata as Record<string, unknown>)
          : {},
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

export async function appendPlayGroupAuditEvent(input: PlayGroupAuditEventInput): Promise<void> {
  if (!isDatabaseConfigured()) return;

  await prisma.message.create({
    data: {
      bookingId: null,
      userId: input.actorUserId,
      senderType: 'staff',
      senderName: input.actorName,
      content: buildPlayGroupAuditContent(input),
      isRead: true,
      sentAt: new Date(),
    },
  });
}
