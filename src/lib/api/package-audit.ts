import { isDatabaseConfigured, prisma } from '@/lib/prisma';

export const PACKAGE_AUDIT_PREFIX = '[PACKAGE_AUDIT]';

export type PackageAuditEventInput = {
  actorUserId: string;
  actorName: string;
  eventType: 'PACKAGE_GRANTED' | 'PACKAGE_UPDATED';
  customerPackageId: string;
  targetUserId: string;
  packageId: string;
  metadata?: Record<string, unknown>;
};

export type PackageAuditEventPayload = {
  eventType: 'PACKAGE_GRANTED' | 'PACKAGE_UPDATED';
  customerPackageId: string;
  targetUserId: string;
  packageId: string;
  metadata: Record<string, unknown>;
  timestamp: string;
};

export function buildPackageAuditContent(input: PackageAuditEventInput): string {
  return `${PACKAGE_AUDIT_PREFIX}${JSON.stringify({
    eventType: input.eventType,
    customerPackageId: input.customerPackageId,
    targetUserId: input.targetUserId,
    packageId: input.packageId,
    metadata: input.metadata ?? {},
    timestamp: new Date().toISOString(),
  })}`;
}

export function parsePackageAuditContent(content: string): PackageAuditEventPayload | null {
  if (!content.startsWith(PACKAGE_AUDIT_PREFIX)) {
    return null;
  }

  const jsonContent = content.slice(PACKAGE_AUDIT_PREFIX.length);
  try {
    const parsed = JSON.parse(jsonContent) as Partial<PackageAuditEventPayload>;

    if (
      (parsed.eventType !== 'PACKAGE_GRANTED' && parsed.eventType !== 'PACKAGE_UPDATED') ||
      typeof parsed.customerPackageId !== 'string' ||
      typeof parsed.targetUserId !== 'string' ||
      typeof parsed.packageId !== 'string' ||
      typeof parsed.timestamp !== 'string'
    ) {
      return null;
    }

    return {
      eventType: parsed.eventType,
      customerPackageId: parsed.customerPackageId,
      targetUserId: parsed.targetUserId,
      packageId: parsed.packageId,
      metadata: typeof parsed.metadata === 'object' && parsed.metadata !== null ? parsed.metadata as Record<string, unknown> : {},
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

export async function appendPackageAuditEvent(input: PackageAuditEventInput): Promise<void> {
  if (!isDatabaseConfigured()) return;

  await prisma.message.create({
    data: {
      bookingId: null,
      userId: input.actorUserId,
      senderType: 'staff',
      senderName: input.actorName,
      content: buildPackageAuditContent(input),
      isRead: true,
      sentAt: new Date(),
    },
  });
}