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