import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { getRecentContactSubmissions } from "@/lib/api/issue26";
import { Prisma } from "@prisma/client";

type CrmSettingsStore = {
  findMany: (args: {
    where: { key: { startsWith: string } };
    orderBy: { updatedAt: "desc" | "asc" };
  }) => Promise<Array<{ value: string }>>;
};

const prismaSettings = (prisma as unknown as { settings: CrmSettingsStore }).settings;

export type CrmCustomerSummary = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  loyaltyTier: string;
  totalBookings: number;
  totalSpent: number;
  lastBookingDate: string | null;
  pets: Array<{ id: string; name: string; breed: string }>;
  tags: Array<{ id: string; name: string; color: string }>;
};

export type CrmTimelineItem = {
  id: string;
  type:
    | "booking"
    | "message"
    | "activity"
    | "incident"
    | "contact_submission"
    | "note"
    | "interaction"
    | "opportunity";
  title: string;
  detail: string;
  timestamp: string;
};

export type CrmNote = {
  noteId: string;
  userId: string;
  content: string;
  createdById: string;
  createdByName: string;
  createdAt: string;
};

export type CrmTask = {
  taskId: string;
  userId: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: "open" | "completed";
  priority: "low" | "normal" | "high" | "urgent";
  createdById: string;
  createdByName: string;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type CrmInteraction = {
  id: string;
  userId: string;
  channel: string;
  direction: string;
  subject: string | null;
  content: string;
  occurredAt: string;
  createdByName: string | null;
};

export type CrmOpportunity = {
  id: string;
  userId: string;
  ownerUserId: string | null;
  customerName: string | null;
  title: string;
  description: string | null;
  stage: "new" | "qualified" | "proposal" | "won" | "lost";
  source: string | null;
  estimatedValue: number | null;
  expectedCloseAt: string | null;
  ownerName: string | null;
  createdAt: string;
};

export type CrmTag = {
  id: string;
  name: string;
  color: string;
  description: string | null;
};

export type CrmSegment = {
  id: string;
  name: string;
  description: string | null;
  criteriaJson: Record<string, unknown>;
  isActive: boolean;
};

export type CrmCampaign = {
  id: string;
  name: string;
  channel: "email" | "sms";
  status: "draft" | "scheduled" | "sent" | "cancelled";
  subject: string | null;
  body: string;
  segmentId: string | null;
  recipientCount: number;
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type CrmOwner = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};

export type CrmCampaignRecipientSummary = {
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
  total: number;
};

export type CrmCampaignRecipient = {
  id: string;
  userId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  status: "pending" | "sent" | "failed" | "skipped";
  sentAt: string | null;
  error: string | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  createdAt: string;
};

export type CrmCampaignRecipientAttempt = {
  id: string;
  recipientId: string;
  campaignId: string;
  userId: string;
  channel: "email" | "sms";
  status: "sent" | "failed" | "retry_queued";
  errorCode: string | null;
  errorDetail: string | null;
  attemptedAt: string;
  createdAt: string;
};

export type CrmDispatchResult = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
};

export type CrmCampaignRecipientPage = {
  recipients: CrmCampaignRecipient[];
  summary: CrmCampaignRecipientSummary;
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
    totalFiltered: number;
  };
};

export type CrmCampaignRecipientAttemptPage = {
  attempts: CrmCampaignRecipientAttempt[];
  pagination: {
    offset: number;
    limit: number;
    hasMore: boolean;
    total: number;
  };
};

function ensureDatabaseReady(): void {
  if (!isDatabaseConfigured()) {
    throw new Error("PERSISTENCE_UNAVAILABLE");
  }
}

function parseStoredValue(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Ignore malformed records.
  }

  return {};
}

function noteStoragePrefix(userId: string): string {
  return `crm:note:${userId}:`;
}

function taskStoragePrefix(userId: string): string {
  return `crm:task:${userId}:`;
}

function normalizeLegacyNote(raw: Record<string, unknown>): CrmNote | null {
  if (
    typeof raw.noteId !== "string" ||
    typeof raw.userId !== "string" ||
    typeof raw.content !== "string" ||
    typeof raw.createdById !== "string" ||
    typeof raw.createdByName !== "string" ||
    typeof raw.createdAt !== "string"
  ) {
    return null;
  }

  return {
    noteId: raw.noteId,
    userId: raw.userId,
    content: raw.content,
    createdById: raw.createdById,
    createdByName: raw.createdByName,
    createdAt: raw.createdAt,
  };
}

function normalizeLegacyTask(raw: Record<string, unknown>): CrmTask | null {
  if (
    typeof raw.taskId !== "string" ||
    typeof raw.userId !== "string" ||
    typeof raw.title !== "string" ||
    typeof raw.createdById !== "string" ||
    typeof raw.createdByName !== "string" ||
    typeof raw.createdAt !== "string"
  ) {
    return null;
  }

  return {
    taskId: raw.taskId,
    userId: raw.userId,
    title: raw.title,
    description: typeof raw.description === "string" ? raw.description : null,
    dueAt: typeof raw.dueAt === "string" ? raw.dueAt : null,
    status: raw.status === "completed" ? "completed" : "open",
    priority: "normal",
    createdById: raw.createdById,
    createdByName: raw.createdByName,
    assignedToId: null,
    assignedToName: null,
    createdAt: raw.createdAt,
    completedAt: typeof raw.completedAt === "string" ? raw.completedAt : null,
  };
}

function isValidPriority(value: string | undefined): value is "low" | "normal" | "high" | "urgent" {
  return value === "low" || value === "normal" || value === "high" || value === "urgent";
}

function isValidStage(value: string | undefined): value is "new" | "qualified" | "proposal" | "won" | "lost" {
  return value === "new" || value === "qualified" || value === "proposal" || value === "won" || value === "lost";
}

function isValidChannel(value: string | undefined): value is "email" | "sms" {
  return value === "email" || value === "sms";
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export async function dispatchPendingCampaignRecipients(params: {
  campaignId: string;
  simulatedFailureRate?: number;
}): Promise<CrmDispatchResult> {
  ensureDatabaseReady();

  const campaign = await prisma.crmCampaign.findUnique({
    where: { id: params.campaignId },
    select: {
      id: true,
      channel: true,
      status: true,
    },
  });

  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  if (!isValidChannel(campaign.channel)) {
    throw new Error("INVALID_CAMPAIGN_CHANNEL");
  }

  if (campaign.status === "cancelled") {
    throw new Error("CAMPAIGN_CANCELLED");
  }

  const simulatedFailureRate = Math.min(Math.max(params.simulatedFailureRate ?? 0, 0), 1);

  const pendingRecipients = await prisma.crmCampaignRecipient.findMany({
    where: {
      campaignId: params.campaignId,
      status: "pending",
    },
    include: {
      user: {
        select: {
          email: true,
          phone: true,
        },
      },
    },
    take: 500,
  });

  if (pendingRecipients.length === 0) {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const sentAt = new Date();

  for (const recipient of pendingRecipients) {
    const attemptedAt = new Date();
    const missingAddress = campaign.channel === "email" ? !recipient.user.email : !recipient.user.phone;
    if (missingAddress) {
      const errorCode = campaign.channel === "email" ? "NO_EMAIL_ADDRESS" : "NO_PHONE_NUMBER";
      await prisma.$transaction([
        prisma.crmCampaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "failed",
            error: errorCode,
            sentAt: null,
          },
        }),
        prisma.crmCampaignRecipientAttempt.create({
          data: {
            recipientId: recipient.id,
            campaignId: recipient.campaignId,
            userId: recipient.userId,
            channel: campaign.channel,
            status: "failed",
            errorCode,
            errorDetail: "Recipient is missing required delivery address for channel.",
            attemptedAt,
          },
        }),
      ]);
      failed += 1;
      continue;
    }

    const shouldFail = Math.random() < simulatedFailureRate;
    if (shouldFail) {
      const transientFailureCount = await prisma.crmCampaignRecipientAttempt.count({
        where: {
          recipientId: recipient.id,
          errorCode: "TRANSIENT_DELIVERY_FAILURE",
        },
      });

      const shouldEscalate = transientFailureCount + 1 >= 3;
      if (shouldEscalate) {
        await prisma.$transaction([
          prisma.crmCampaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: "skipped",
              error: "DEAD_LETTER_ESCALATED",
              sentAt: null,
            },
          }),
          prisma.crmCampaignRecipientAttempt.create({
            data: {
              recipientId: recipient.id,
              campaignId: recipient.campaignId,
              userId: recipient.userId,
              channel: campaign.channel,
              status: "failed",
              errorCode: "DEAD_LETTER_ESCALATED",
              errorDetail: "Escalated after repeated transient delivery failures.",
              attemptedAt,
            },
          }),
        ]);
        skipped += 1;
        continue;
      }

      await prisma.$transaction([
        prisma.crmCampaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: "failed",
            error: "TRANSIENT_DELIVERY_FAILURE",
            sentAt: null,
          },
        }),
        prisma.crmCampaignRecipientAttempt.create({
          data: {
            recipientId: recipient.id,
            campaignId: recipient.campaignId,
            userId: recipient.userId,
            channel: campaign.channel,
            status: "failed",
            errorCode: "TRANSIENT_DELIVERY_FAILURE",
            errorDetail: "Simulated transient delivery failure.",
            attemptedAt,
          },
        }),
      ]);
      failed += 1;
      continue;
    }

    await prisma.$transaction([
      prisma.crmCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "sent",
          error: null,
          sentAt,
        },
      }),
      prisma.crmCampaignRecipientAttempt.create({
        data: {
          recipientId: recipient.id,
          campaignId: recipient.campaignId,
          userId: recipient.userId,
          channel: campaign.channel,
          status: "sent",
          attemptedAt,
        },
      }),
    ]);
    sent += 1;
  }

  const remainingPending = await prisma.crmCampaignRecipient.count({
    where: {
      campaignId: params.campaignId,
      status: "pending",
    },
  });

  if (remainingPending === 0) {
    await prisma.crmCampaign.update({
      where: { id: params.campaignId },
      data: {
        status: "sent",
        sentAt,
      },
    });
  }

  return {
    processed: pendingRecipients.length,
    sent,
    failed,
    skipped,
  };
}

type AudienceCandidate = {
  id: string;
  loyaltyTier: string | null;
  bookings: Array<{ status: string }>;
  crmTagAssignments: Array<{ tagId: string }>;
};

function matchesAudienceCriteria(user: AudienceCandidate, criteria: Record<string, unknown>): boolean {
  const loyaltyTier = typeof criteria.loyaltyTier === "string" ? criteria.loyaltyTier : null;
  const includeTagIds = parseStringArray(criteria.includeTagIds);
  const excludeTagIds = parseStringArray(criteria.excludeTagIds);
  const requiresActiveBookings = Boolean(criteria.requiresActiveBookings);

  if (loyaltyTier && user.loyaltyTier !== loyaltyTier) {
    return false;
  }

  const assignedTagIds = user.crmTagAssignments.map((assignment) => assignment.tagId);

  if (includeTagIds.length > 0 && !includeTagIds.some((tagId) => assignedTagIds.includes(tagId))) {
    return false;
  }

  if (excludeTagIds.length > 0 && excludeTagIds.some((tagId) => assignedTagIds.includes(tagId))) {
    return false;
  }

  if (requiresActiveBookings) {
    const activeStatuses = new Set(["pending", "confirmed", "checked_in"]);
    const hasActiveBooking = user.bookings.some((booking) => activeStatuses.has(booking.status));
    if (!hasActiveBooking) {
      return false;
    }
  }

  return true;
}

async function resolveAudienceUserIdsByCriteria(params: {
  criteria: Record<string, unknown>;
  channel: "email" | "sms";
}): Promise<string[]> {
  const baseUsers = await prisma.user.findMany({
    where: {
      role: "customer",
      ...(params.channel === "email"
        ? { marketingEmailsEnabled: true }
        : { smsNotificationsEnabled: true }),
    },
    select: {
      id: true,
      loyaltyTier: true,
      bookings: {
        select: { status: true },
      },
      crmTagAssignments: {
        select: {
          tagId: true,
        },
      },
    },
  });

  return baseUsers
    .filter((user) => matchesAudienceCriteria(user, params.criteria))
    .map((user) => user.id);
}

async function resolveSegmentAudienceUserIds(params: {
  segmentId?: string;
  channel: "email" | "sms";
}): Promise<string[]> {
  if (!params.segmentId) {
    const customers = await prisma.user.findMany({
      where: {
        role: "customer",
        ...(params.channel === "email"
          ? { marketingEmailsEnabled: true }
          : { smsNotificationsEnabled: true }),
      },
      select: { id: true },
    });

    return customers.map((customer) => customer.id);
  }

  const segment = await prisma.crmSegment.findUnique({
    where: { id: params.segmentId },
    select: {
      criteriaJson: true,
      isActive: true,
    },
  });

  if (!segment || !segment.isActive) {
    return [];
  }

  return resolveAudienceUserIdsByCriteria({
    criteria: (segment.criteriaJson ?? {}) as Record<string, unknown>,
    channel: params.channel,
  });
}

export async function previewSegmentAudience(params: {
  criteriaJson: Record<string, unknown>;
  channel: "email" | "sms";
}): Promise<{ estimatedRecipients: number }> {
  ensureDatabaseReady();

  const criteria = params.criteriaJson ?? {};
  const userIds = await resolveAudienceUserIdsByCriteria({
    criteria,
    channel: params.channel,
  });

  return { estimatedRecipients: userIds.length };
}

export async function listCrmCustomers(params: {
  query?: string;
  tagId?: string;
  loyaltyTier?: string;
  limit?: number;
}): Promise<CrmCustomerSummary[]> {
  ensureDatabaseReady();

  const query = params.query?.trim();
  const take = Math.min(Math.max(params.limit ?? 50, 1), 100);

  const users = await prisma.user.findMany({
    where: {
      role: "customer",
      ...(params.loyaltyTier ? { loyaltyTier: params.loyaltyTier } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(params.tagId
        ? {
            crmTagAssignments: {
              some: {
                tagId: params.tagId,
              },
            },
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      loyaltyTier: true,
      pets: {
        select: { id: true, name: true, breed: true },
      },
      bookings: {
        select: { checkInDate: true, status: true, total: true },
      },
      crmTagAssignments: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take,
  });

  return users.map((user) => {
    const lastBookingDate = user.bookings.reduce<Date | null>((latest, booking) => {
      if (!latest) {
        return booking.checkInDate;
      }
      return booking.checkInDate > latest ? booking.checkInDate : latest;
    }, null);

    const totalSpent = user.bookings
      .filter((booking) => booking.status !== "cancelled")
      .reduce((sum, booking) => sum + booking.total, 0);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      loyaltyTier: user.loyaltyTier,
      totalBookings: user.bookings.length,
      totalSpent,
      lastBookingDate: lastBookingDate ? lastBookingDate.toISOString() : null,
      pets: user.pets,
      tags: user.crmTagAssignments.map((assignment) => assignment.tag),
    };
  });
}

export async function listCrmTags(): Promise<CrmTag[]> {
  ensureDatabaseReady();

  const tags = await prisma.crmTag.findMany({
    orderBy: [{ name: "asc" }],
  });

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    color: tag.color,
    description: tag.description,
  }));
}

export async function createCrmTag(params: {
  name: string;
  color?: string;
  description?: string;
}): Promise<CrmTag> {
  ensureDatabaseReady();

  const tag = await prisma.crmTag.create({
    data: {
      name: params.name,
      color: params.color?.trim() || "slate",
      description: params.description?.trim() || null,
    },
  });

  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    description: tag.description,
  };
}

export async function assignCustomerTag(userId: string, tagId: string): Promise<void> {
  ensureDatabaseReady();

  await prisma.crmTagAssignment.upsert({
    where: {
      userId_tagId: {
        userId,
        tagId,
      },
    },
    create: { userId, tagId },
    update: {},
  });
}

export async function removeCustomerTag(userId: string, tagId: string): Promise<void> {
  ensureDatabaseReady();

  await prisma.crmTagAssignment.deleteMany({
    where: { userId, tagId },
  });
}

export async function listCustomerNotes(userId: string, limit = 50): Promise<CrmNote[]> {
  ensureDatabaseReady();

  const notes = await prisma.crmNote.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
    },
    take: limit,
  });

  const mapped = notes.map((note) => ({
    noteId: note.id,
    userId: note.userId,
    content: note.content,
    createdById: note.createdByUserId,
    createdByName: note.createdByUser.name || note.createdByUser.email || "Staff",
    createdAt: note.createdAt.toISOString(),
  }));

  if (mapped.length > 0) {
    return mapped;
  }

  const legacyRecords = await prismaSettings.findMany({
    where: { key: { startsWith: noteStoragePrefix(userId) } },
    orderBy: { updatedAt: "desc" },
  });

  return legacyRecords
    .map((record) => normalizeLegacyNote(parseStoredValue(record.value)))
    .filter((item): item is CrmNote => Boolean(item))
    .slice(0, limit);
}

export async function createCustomerNote(params: {
  userId: string;
  content: string;
  createdById: string;
}): Promise<CrmNote> {
  ensureDatabaseReady();

  const note = await prisma.crmNote.create({
    data: {
      userId: params.userId,
      content: params.content,
      createdByUserId: params.createdById,
    },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return {
    noteId: note.id,
    userId: note.userId,
    content: note.content,
    createdById: note.createdByUserId,
    createdByName: note.createdByUser.name || note.createdByUser.email || "Staff",
    createdAt: note.createdAt.toISOString(),
  };
}

export async function listCustomerTasks(userId: string, limit = 50): Promise<CrmTask[]> {
  ensureDatabaseReady();

  const tasks = await prisma.crmTask.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }],
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
      assignedToUser: {
        select: { id: true, name: true, email: true },
      },
    },
    take: limit,
  });

  const mapped: CrmTask[] = tasks.map((task) => ({
    taskId: task.id,
    userId: task.userId,
    title: task.title,
    description: task.description,
    dueAt: task.dueAt ? task.dueAt.toISOString() : null,
    status: (task.status === "completed" ? "completed" : "open") as "open" | "completed",
    priority: isValidPriority(task.priority) ? task.priority : "normal",
    createdById: task.createdByUserId,
    createdByName: task.createdByUser.name || task.createdByUser.email || "Staff",
    assignedToId: task.assignedToUserId,
    assignedToName: task.assignedToUser
      ? task.assignedToUser.name || task.assignedToUser.email || "Staff"
      : null,
    createdAt: task.createdAt.toISOString(),
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  }));

  if (mapped.length > 0) {
    return mapped;
  }

  const legacyRecords = await prismaSettings.findMany({
    where: { key: { startsWith: taskStoragePrefix(userId) } },
    orderBy: { updatedAt: "desc" },
  });

  return legacyRecords
    .map((record) => normalizeLegacyTask(parseStoredValue(record.value)))
    .filter((item): item is CrmTask => Boolean(item))
    .slice(0, limit);
}

export async function createCustomerTask(params: {
  userId: string;
  title: string;
  description?: string;
  dueAt?: string;
  priority?: string;
  createdById: string;
  assignedToId?: string;
}): Promise<CrmTask> {
  ensureDatabaseReady();

  const dueAt = params.dueAt ? new Date(params.dueAt) : null;
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    throw new Error("INVALID_DUE_DATE");
  }

  const priority = isValidPriority(params.priority) ? params.priority : "normal";

  const task = await prisma.crmTask.create({
    data: {
      userId: params.userId,
      title: params.title,
      description: params.description?.trim() || null,
      dueAt,
      priority,
      createdByUserId: params.createdById,
      assignedToUserId: params.assignedToId || null,
    },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
      assignedToUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return {
    taskId: task.id,
    userId: task.userId,
    title: task.title,
    description: task.description,
    dueAt: task.dueAt ? task.dueAt.toISOString() : null,
    status: task.status === "completed" ? "completed" : "open",
    priority,
    createdById: task.createdByUserId,
    createdByName: task.createdByUser.name || task.createdByUser.email || "Staff",
    assignedToId: task.assignedToUserId,
    assignedToName: task.assignedToUser
      ? task.assignedToUser.name || task.assignedToUser.email || "Staff"
      : null,
    createdAt: task.createdAt.toISOString(),
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  };
}

export async function updateCustomerTaskStatus(params: {
  userId: string;
  taskId: string;
  status: "open" | "completed";
}): Promise<CrmTask> {
  ensureDatabaseReady();

  const existing = await prisma.crmTask.findFirst({
    where: {
      id: params.taskId,
      userId: params.userId,
    },
  });

  if (!existing) {
    throw new Error("TASK_NOT_FOUND");
  }

  const task = await prisma.crmTask.update({
    where: { id: params.taskId },
    data: {
      status: params.status,
      completedAt: params.status === "completed" ? new Date() : null,
    },
    include: {
      createdByUser: {
        select: { id: true, name: true, email: true },
      },
      assignedToUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return {
    taskId: task.id,
    userId: task.userId,
    title: task.title,
    description: task.description,
    dueAt: task.dueAt ? task.dueAt.toISOString() : null,
    status: task.status === "completed" ? "completed" : "open",
    priority: isValidPriority(task.priority) ? task.priority : "normal",
    createdById: task.createdByUserId,
    createdByName: task.createdByUser.name || task.createdByUser.email || "Staff",
    assignedToId: task.assignedToUserId,
    assignedToName: task.assignedToUser
      ? task.assignedToUser.name || task.assignedToUser.email || "Staff"
      : null,
    createdAt: task.createdAt.toISOString(),
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  };
}

export async function listCustomerInteractions(userId: string, limit = 100): Promise<CrmInteraction[]> {
  ensureDatabaseReady();

  const interactions = await prisma.crmInteraction.findMany({
    where: { userId },
    orderBy: [{ occurredAt: "desc" }],
    include: {
      createdByUser: {
        select: { name: true, email: true },
      },
    },
    take: limit,
  });

  return interactions.map((interaction) => ({
    id: interaction.id,
    userId: interaction.userId,
    channel: interaction.channel,
    direction: interaction.direction,
    subject: interaction.subject,
    content: interaction.content,
    occurredAt: interaction.occurredAt.toISOString(),
    createdByName: interaction.createdByUser
      ? interaction.createdByUser.name || interaction.createdByUser.email
      : null,
  }));
}

export async function createCustomerInteraction(params: {
  userId: string;
  createdById?: string;
  channel: string;
  direction: string;
  subject?: string;
  content: string;
  occurredAt?: string;
  sourceSystem?: string;
  sourceReference?: string;
}): Promise<CrmInteraction> {
  ensureDatabaseReady();

  const occurredAt = params.occurredAt ? new Date(params.occurredAt) : new Date();
  if (Number.isNaN(occurredAt.getTime())) {
    throw new Error("INVALID_OCCURRED_AT");
  }

  const interaction = await prisma.crmInteraction.create({
    data: {
      userId: params.userId,
      createdByUserId: params.createdById || null,
      channel: params.channel,
      direction: params.direction,
      subject: params.subject?.trim() || null,
      content: params.content,
      occurredAt,
      sourceSystem: params.sourceSystem?.trim() || null,
      sourceReference: params.sourceReference?.trim() || null,
    },
    include: {
      createdByUser: {
        select: { name: true, email: true },
      },
    },
  });

  return {
    id: interaction.id,
    userId: interaction.userId,
    channel: interaction.channel,
    direction: interaction.direction,
    subject: interaction.subject,
    content: interaction.content,
    occurredAt: interaction.occurredAt.toISOString(),
    createdByName: interaction.createdByUser
      ? interaction.createdByUser.name || interaction.createdByUser.email
      : null,
  };
}

export async function listOpportunities(params?: {
  stage?: string;
  userId?: string;
  limit?: number;
}): Promise<CrmOpportunity[]> {
  ensureDatabaseReady();

  const take = Math.min(Math.max(params?.limit ?? 200, 1), 400);
  const opportunities = await prisma.crmOpportunity.findMany({
    where: {
      ...(params?.stage && isValidStage(params.stage) ? { stage: params.stage } : {}),
      ...(params?.userId ? { userId: params.userId } : {}),
    },
    include: {
      user: {
        select: { name: true, email: true },
      },
      ownerUser: {
        select: { name: true, email: true },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    take,
  });

  return opportunities.map((item) => ({
    id: item.id,
    userId: item.userId,
    ownerUserId: item.ownerUserId,
    customerName: item.user.name || item.user.email,
    title: item.title,
    description: item.description,
    stage: isValidStage(item.stage) ? item.stage : "new",
    source: item.source,
    estimatedValue: item.estimatedValue,
    expectedCloseAt: item.expectedCloseAt ? item.expectedCloseAt.toISOString() : null,
    ownerName: item.ownerUser ? item.ownerUser.name || item.ownerUser.email : null,
    createdAt: item.createdAt.toISOString(),
  }));
}

export async function createOpportunity(params: {
  userId: string;
  title: string;
  description?: string;
  stage?: string;
  source?: string;
  estimatedValue?: number;
  expectedCloseAt?: string;
  ownerUserId?: string;
}): Promise<CrmOpportunity> {
  ensureDatabaseReady();

  const expectedCloseAt = params.expectedCloseAt ? new Date(params.expectedCloseAt) : null;
  if (expectedCloseAt && Number.isNaN(expectedCloseAt.getTime())) {
    throw new Error("INVALID_EXPECTED_CLOSE_AT");
  }

  const stage = isValidStage(params.stage) ? params.stage : "new";
  const item = await prisma.crmOpportunity.create({
    data: {
      userId: params.userId,
      title: params.title,
      description: params.description?.trim() || null,
      stage,
      source: params.source?.trim() || null,
      estimatedValue: typeof params.estimatedValue === "number" ? params.estimatedValue : null,
      expectedCloseAt,
      ownerUserId: params.ownerUserId || null,
    },
    include: {
      user: {
        select: { name: true, email: true },
      },
      ownerUser: {
        select: { name: true, email: true },
      },
    },
  });

  return {
    id: item.id,
    userId: item.userId,
    ownerUserId: item.ownerUserId,
    customerName: item.user.name || item.user.email,
    title: item.title,
    description: item.description,
    stage: isValidStage(item.stage) ? item.stage : "new",
    source: item.source,
    estimatedValue: item.estimatedValue,
    expectedCloseAt: item.expectedCloseAt ? item.expectedCloseAt.toISOString() : null,
    ownerName: item.ownerUser ? item.ownerUser.name || item.ownerUser.email : null,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function updateOpportunityStage(params: {
  opportunityId: string;
  stage: "new" | "qualified" | "proposal" | "won" | "lost";
}): Promise<CrmOpportunity> {
  ensureDatabaseReady();

  const now = new Date();
  const item = await prisma.crmOpportunity.update({
    where: { id: params.opportunityId },
    data: {
      stage: params.stage,
      wonAt: params.stage === "won" ? now : null,
      lostAt: params.stage === "lost" ? now : null,
    },
    include: {
      user: {
        select: { name: true, email: true },
      },
      ownerUser: {
        select: { name: true, email: true },
      },
    },
  });

  return {
    id: item.id,
    userId: item.userId,
    ownerUserId: item.ownerUserId,
    customerName: item.user.name || item.user.email,
    title: item.title,
    description: item.description,
    stage: isValidStage(item.stage) ? item.stage : "new",
    source: item.source,
    estimatedValue: item.estimatedValue,
    expectedCloseAt: item.expectedCloseAt ? item.expectedCloseAt.toISOString() : null,
    ownerName: item.ownerUser ? item.ownerUser.name || item.ownerUser.email : null,
    createdAt: item.createdAt.toISOString(),
  };
}

export async function listSegments(): Promise<CrmSegment[]> {
  ensureDatabaseReady();

  const segments = await prisma.crmSegment.findMany({
    orderBy: [{ updatedAt: "desc" }],
  });

  return segments.map((segment) => ({
    id: segment.id,
    name: segment.name,
    description: segment.description,
    criteriaJson: segment.criteriaJson as Record<string, unknown>,
    isActive: segment.isActive,
  }));
}

export async function createSegment(params: {
  name: string;
  description?: string;
  criteriaJson: Record<string, unknown>;
  createdByUserId: string;
}): Promise<CrmSegment> {
  ensureDatabaseReady();

  const segment = await prisma.crmSegment.create({
    data: {
      name: params.name,
      description: params.description?.trim() || null,
      criteriaJson: params.criteriaJson as Prisma.InputJsonValue,
      createdByUserId: params.createdByUserId,
    },
  });

  return {
    id: segment.id,
    name: segment.name,
    description: segment.description,
    criteriaJson: segment.criteriaJson as Record<string, unknown>,
    isActive: segment.isActive,
  };
}

export async function listCrmAssignableOwners(params?: {
  query?: string;
  limit?: number;
}): Promise<CrmOwner[]> {
  ensureDatabaseReady();

  const query = params?.query?.trim();
  const take = Math.min(Math.max(params?.limit ?? 100, 1), 200);

  const owners = await prisma.user.findMany({
    where: {
      role: {
        in: ["staff", "admin"],
      },
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }, { email: "asc" }],
    take,
  });

  return owners;
}

export async function listCampaigns(): Promise<CrmCampaign[]> {
  ensureDatabaseReady();

  const campaigns = await prisma.crmCampaign.findMany({
    include: {
      _count: {
        select: {
          recipients: true,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  return campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    channel: isValidChannel(campaign.channel) ? campaign.channel : "email",
    status:
      campaign.status === "scheduled" || campaign.status === "sent" || campaign.status === "cancelled"
        ? campaign.status
        : "draft",
    subject: campaign.subject,
    body: campaign.body,
    segmentId: campaign.segmentId,
    recipientCount: campaign._count.recipients,
    scheduledFor: campaign.scheduledFor ? campaign.scheduledFor.toISOString() : null,
    sentAt: campaign.sentAt ? campaign.sentAt.toISOString() : null,
    createdAt: campaign.createdAt.toISOString(),
  }));
}

export async function createCampaign(params: {
  name: string;
  channel: "email" | "sms";
  subject?: string;
  body: string;
  segmentId?: string;
  scheduledFor?: string;
  createdByUserId: string;
}): Promise<CrmCampaign> {
  ensureDatabaseReady();

  const scheduledFor = params.scheduledFor ? new Date(params.scheduledFor) : null;
  if (scheduledFor && Number.isNaN(scheduledFor.getTime())) {
    throw new Error("INVALID_SCHEDULED_FOR");
  }

  const campaign = await prisma.crmCampaign.create({
    data: {
      name: params.name,
      channel: params.channel,
      subject: params.subject?.trim() || null,
      body: params.body,
      segmentId: params.segmentId || null,
      scheduledFor,
      status: scheduledFor ? "scheduled" : "draft",
      createdByUserId: params.createdByUserId,
    },
  });

  const recipientUserIds = await resolveSegmentAudienceUserIds({
    segmentId: params.segmentId,
    channel: params.channel,
  });

  if (recipientUserIds.length > 0) {
    await prisma.crmCampaignRecipient.createMany({
      data: recipientUserIds.map((userId) => ({
        campaignId: campaign.id,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  return {
    id: campaign.id,
    name: campaign.name,
    channel: isValidChannel(campaign.channel) ? campaign.channel : "email",
    status:
      campaign.status === "scheduled" || campaign.status === "sent" || campaign.status === "cancelled"
        ? campaign.status
        : "draft",
    subject: campaign.subject,
    body: campaign.body,
    segmentId: campaign.segmentId,
    recipientCount: recipientUserIds.length,
    scheduledFor: campaign.scheduledFor ? campaign.scheduledFor.toISOString() : null,
    sentAt: campaign.sentAt ? campaign.sentAt.toISOString() : null,
    createdAt: campaign.createdAt.toISOString(),
  };
}

export async function updateCampaignStatus(params: {
  campaignId: string;
  status: "draft" | "scheduled" | "sent" | "cancelled";
}): Promise<CrmCampaign> {
  ensureDatabaseReady();

  const campaign = await prisma.crmCampaign.update({
    where: { id: params.campaignId },
    data: {
      status: params.status,
      sentAt: params.status === "sent" ? new Date() : null,
    },
  });

  if (params.status === "sent") {
    await prisma.crmCampaignRecipient.updateMany({
      where: { campaignId: campaign.id },
      data: {
        status: "sent",
        sentAt: new Date(),
      },
    });
  } else if (params.status === "cancelled") {
    await prisma.crmCampaignRecipient.updateMany({
      where: { campaignId: campaign.id, status: "pending" },
      data: {
        status: "skipped",
      },
    });
  } else if (params.status === "draft") {
    await prisma.crmCampaignRecipient.updateMany({
      where: { campaignId: campaign.id },
      data: {
        status: "pending",
        sentAt: null,
      },
    });
  }

  const recipientCount = await prisma.crmCampaignRecipient.count({
    where: { campaignId: campaign.id },
  });

  return {
    id: campaign.id,
    name: campaign.name,
    channel: isValidChannel(campaign.channel) ? campaign.channel : "email",
    status:
      campaign.status === "scheduled" || campaign.status === "sent" || campaign.status === "cancelled"
        ? campaign.status
        : "draft",
    subject: campaign.subject,
    body: campaign.body,
    segmentId: campaign.segmentId,
    recipientCount,
    scheduledFor: campaign.scheduledFor ? campaign.scheduledFor.toISOString() : null,
    sentAt: campaign.sentAt ? campaign.sentAt.toISOString() : null,
    createdAt: campaign.createdAt.toISOString(),
  };
}

function normalizeRecipientStatus(value: string): "pending" | "sent" | "failed" | "skipped" {
  if (value === "sent" || value === "failed" || value === "skipped") {
    return value;
  }

  return "pending";
}

export async function listCampaignRecipients(params: {
  campaignId: string;
  status?: "pending" | "sent" | "failed" | "skipped";
  limit?: number;
  offset?: number;
}): Promise<CrmCampaignRecipientPage> {
  ensureDatabaseReady();

  const take = Math.min(Math.max(params.limit ?? 100, 1), 500);
  const skip = Math.max(params.offset ?? 0, 0);
  const recipientWhere = {
    campaignId: params.campaignId,
    ...(params.status ? { status: params.status } : {}),
  };

  const [recipients, grouped, totalFiltered] = await Promise.all([
    prisma.crmCampaignRecipient.findMany({
      where: recipientWhere,
      include: {
        _count: {
          select: {
            attempts: true,
          },
        },
        attempts: {
          take: 1,
          orderBy: [{ attemptedAt: "desc" }],
          select: {
            attemptedAt: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      skip,
      take,
    }),
    prisma.crmCampaignRecipient.groupBy({
      by: ["status"],
      where: { campaignId: params.campaignId },
      _count: {
        _all: true,
      },
    }),
    prisma.crmCampaignRecipient.count({
      where: recipientWhere,
    }),
  ]);

  const summary: CrmCampaignRecipientSummary = {
    pending: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    total: 0,
  };

  for (const bucket of grouped) {
    const normalized = normalizeRecipientStatus(bucket.status);
    const count = bucket._count._all;
    summary[normalized] += count;
    summary.total += count;
  }

  return {
    recipients: recipients.map((recipient) => ({
      id: recipient.id,
      userId: recipient.userId,
      customerName: recipient.user.name,
      customerEmail: recipient.user.email,
      customerPhone: recipient.user.phone,
      status: normalizeRecipientStatus(recipient.status),
      sentAt: recipient.sentAt ? recipient.sentAt.toISOString() : null,
      error: recipient.error,
      attemptCount: recipient._count.attempts,
      lastAttemptAt: recipient.attempts[0]?.attemptedAt ? recipient.attempts[0].attemptedAt.toISOString() : null,
      createdAt: recipient.createdAt.toISOString(),
    })),
    summary,
    pagination: {
      offset: skip,
      limit: take,
      hasMore: skip + recipients.length < totalFiltered,
      totalFiltered,
    },
  };
}

export async function listCampaignRecipientAttempts(params: {
  campaignId: string;
  recipientId: string;
  status?: "sent" | "failed" | "retry_queued";
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}): Promise<CrmCampaignRecipientAttemptPage> {
  ensureDatabaseReady();

  const take = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const skip = Math.max(params.offset ?? 0, 0);
  const since = params.since ? new Date(params.since) : null;
  const until = params.until ? new Date(params.until) : null;

  if (since && Number.isNaN(since.getTime())) {
    throw new Error("INVALID_SINCE_AT");
  }

  if (until && Number.isNaN(until.getTime())) {
    throw new Error("INVALID_UNTIL_AT");
  }

  if (since && until && since > until) {
    throw new Error("INVALID_ATTEMPT_RANGE");
  }

  const attemptsWhere = {
    campaignId: params.campaignId,
    recipientId: params.recipientId,
    ...(params.status ? { status: params.status } : {}),
    ...(since || until
      ? {
          attemptedAt: {
            ...(since ? { gte: since } : {}),
            ...(until ? { lte: until } : {}),
          },
        }
      : {}),
  };

  const recipient = await prisma.crmCampaignRecipient.findFirst({
    where: {
      id: params.recipientId,
      campaignId: params.campaignId,
    },
    select: { id: true },
  });

  if (!recipient) {
    throw new Error("CAMPAIGN_RECIPIENT_NOT_FOUND");
  }

  const [attempts, total] = await Promise.all([
    prisma.crmCampaignRecipientAttempt.findMany({
      where: attemptsWhere,
      orderBy: [{ attemptedAt: "desc" }],
      skip,
      take,
    }),
    prisma.crmCampaignRecipientAttempt.count({
      where: attemptsWhere,
    }),
  ]);

  return {
    attempts: attempts.map((attempt) => ({
      id: attempt.id,
      recipientId: attempt.recipientId,
      campaignId: attempt.campaignId,
      userId: attempt.userId,
      channel: isValidChannel(attempt.channel) ? attempt.channel : "email",
      status:
        attempt.status === "failed" || attempt.status === "retry_queued"
          ? attempt.status
          : "sent",
      errorCode: attempt.errorCode,
      errorDetail: attempt.errorDetail,
      attemptedAt: attempt.attemptedAt.toISOString(),
      createdAt: attempt.createdAt.toISOString(),
    })),
    pagination: {
      offset: skip,
      limit: take,
      hasMore: skip + attempts.length < total,
      total,
    },
  };
}

function toCsvCell(value: string | number | null): string {
  if (value === null) {
    return "";
  }

  const text = String(value);
  if (text.includes(",") || text.includes("\n") || text.includes("\"")) {
    return `"${text.replace(/\"/g, '""')}"`;
  }

  return text;
}

export async function exportCampaignRecipientsCsv(campaignId: string): Promise<string> {
  ensureDatabaseReady();

  const campaign = await prisma.crmCampaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  const recipients = await prisma.crmCampaignRecipient.findMany({
    where: { campaignId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      _count: {
        select: {
          attempts: true,
        },
      },
      attempts: {
        take: 1,
        orderBy: [{ attemptedAt: "desc" }],
        select: {
          attemptedAt: true,
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  const header = [
    "campaignId",
    "campaignName",
    "recipientId",
    "userId",
    "customerName",
    "customerEmail",
    "customerPhone",
    "status",
    "error",
    "sentAt",
    "attemptCount",
    "lastAttemptAt",
  ];

  const lines = recipients.map((recipient) =>
    [
      campaign.id,
      campaign.name,
      recipient.id,
      recipient.userId,
      recipient.user.name,
      recipient.user.email,
      recipient.user.phone,
      normalizeRecipientStatus(recipient.status),
      recipient.error,
      recipient.sentAt ? recipient.sentAt.toISOString() : null,
      recipient._count.attempts,
      recipient.attempts[0]?.attemptedAt ? recipient.attempts[0].attemptedAt.toISOString() : null,
    ]
      .map((value) => toCsvCell(value))
      .join(","),
  );

  return [header.join(","), ...lines].join("\n");
}

export async function retryFailedCampaignRecipients(params: {
  campaignId: string;
  recipientIds?: string[];
}): Promise<{ retried: number }> {
  ensureDatabaseReady();

  const campaign = await prisma.crmCampaign.findUnique({
    where: { id: params.campaignId },
    select: {
      id: true,
      status: true,
      channel: true,
    },
  });

  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  if (campaign.status === "sent") {
    throw new Error("CAMPAIGN_ALREADY_SENT");
  }

  if (!isValidChannel(campaign.channel)) {
    throw new Error("INVALID_CAMPAIGN_CHANNEL");
  }

  const retryIds = (params.recipientIds ?? []).filter((id) => typeof id === "string" && id.length > 0);

  const targetRecipients = await prisma.crmCampaignRecipient.findMany({
    where: {
      campaignId: params.campaignId,
      status: "failed",
      ...(retryIds.length > 0 ? { id: { in: retryIds } } : {}),
    },
    select: {
      id: true,
      campaignId: true,
      userId: true,
    },
  });

  if (targetRecipients.length === 0) {
    return {
      retried: 0,
    };
  }

  const now = new Date();
  const [result] = await prisma.$transaction([
    prisma.crmCampaignRecipient.updateMany({
      where: {
        id: { in: targetRecipients.map((recipient) => recipient.id) },
      },
      data: {
        status: "pending",
        error: null,
        sentAt: null,
      },
    }),
    prisma.crmCampaignRecipientAttempt.createMany({
      data: targetRecipients.map((recipient) => ({
        recipientId: recipient.id,
        campaignId: recipient.campaignId,
        userId: recipient.userId,
        channel: campaign.channel,
        status: "retry_queued",
        attemptedAt: now,
      })),
    }),
  ]);

  return {
    retried: result.count,
  };
}

export async function refreshCampaignRecipients(campaignId: string): Promise<{
  recipientCount: number;
  added: number;
  skipped: number;
  reactivated: number;
}> {
  ensureDatabaseReady();

  const campaign = await prisma.crmCampaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      status: true,
      channel: true,
      segmentId: true,
    },
  });

  if (!campaign) {
    throw new Error("CAMPAIGN_NOT_FOUND");
  }

  if (campaign.status === "sent") {
    throw new Error("CAMPAIGN_ALREADY_SENT");
  }

  if (!isValidChannel(campaign.channel)) {
    throw new Error("INVALID_CAMPAIGN_CHANNEL");
  }

  const targetUserIds = await resolveSegmentAudienceUserIds({
    segmentId: campaign.segmentId ?? undefined,
    channel: campaign.channel,
  });

  const existing = await prisma.crmCampaignRecipient.findMany({
    where: { campaignId },
    select: { userId: true, status: true },
  });

  const existingByUserId = new Map(existing.map((row) => [row.userId, row.status]));
  const targetSet = new Set(targetUserIds);

  const toAdd = targetUserIds.filter((userId) => !existingByUserId.has(userId));
  const toSkip = existing
    .filter((row) => !targetSet.has(row.userId) && row.status === "pending")
    .map((row) => row.userId);
  const toReactivate = existing
    .filter((row) => targetSet.has(row.userId) && row.status === "skipped")
    .map((row) => row.userId);

  if (toAdd.length > 0) {
    await prisma.crmCampaignRecipient.createMany({
      data: toAdd.map((userId) => ({
        campaignId,
        userId,
      })),
      skipDuplicates: true,
    });
  }

  if (toSkip.length > 0) {
    await prisma.crmCampaignRecipient.updateMany({
      where: {
        campaignId,
        userId: { in: toSkip },
      },
      data: {
        status: "skipped",
      },
    });
  }

  if (toReactivate.length > 0) {
    await prisma.crmCampaignRecipient.updateMany({
      where: {
        campaignId,
        userId: { in: toReactivate },
      },
      data: {
        status: "pending",
        sentAt: null,
        error: null,
      },
    });
  }

  const recipientCount = await prisma.crmCampaignRecipient.count({
    where: { campaignId },
  });

  return {
    recipientCount,
    added: toAdd.length,
    skipped: toSkip.length,
    reactivated: toReactivate.length,
  };
}

export async function processDueScheduledCampaigns(now = new Date()): Promise<{
  processedCampaigns: number;
  processedRecipientRows: number;
}> {
  ensureDatabaseReady();

  const dueCampaigns = await prisma.crmCampaign.findMany({
    where: {
      status: "scheduled",
      scheduledFor: {
        lte: now,
      },
    },
    select: {
      id: true,
    },
    take: 100,
  });

  if (dueCampaigns.length === 0) {
    return {
      processedCampaigns: 0,
      processedRecipientRows: 0,
    };
  }

  let processedRecipientRows = 0;
  let processedCampaigns = 0;

  for (const campaign of dueCampaigns) {
    try {
      const result = await dispatchPendingCampaignRecipients({
        campaignId: campaign.id,
      });
      processedCampaigns += 1;
      processedRecipientRows += result.sent;
    } catch (error) {
      console.error("[CRM] Scheduled campaign dispatch failed", {
        campaignId: campaign.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    processedCampaigns,
    processedRecipientRows,
  };
}

export async function getCrmCustomerProfile(userId: string): Promise<{
  customer: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    loyaltyTier: string;
    createdAt: string;
    pets: Array<{ id: string; name: string; breed: string }>;
    totalBookings: number;
    totalSpent: number;
    tags: Array<{ id: string; name: string; color: string }>;
  };
  timeline: CrmTimelineItem[];
  notes: CrmNote[];
  tasks: CrmTask[];
  interactions: CrmInteraction[];
  opportunities: CrmOpportunity[];
}> {
  ensureDatabaseReady();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      loyaltyTier: true,
      createdAt: true,
      pets: {
        select: {
          id: true,
          name: true,
          breed: true,
        },
      },
      bookings: {
        take: 25,
        orderBy: { checkInDate: "desc" },
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          checkInDate: true,
          checkOutDate: true,
          total: true,
        },
      },
      messages: {
        take: 25,
        orderBy: { sentAt: "desc" },
        select: {
          id: true,
          senderType: true,
          senderName: true,
          content: true,
          sentAt: true,
          booking: {
            select: {
              bookingNumber: true,
            },
          },
        },
      },
      crmTagAssignments: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      },
    },
  });

  if (!user || !user.email) {
    throw new Error("CUSTOMER_NOT_FOUND");
  }
  const customerEmail = user.email;

  const [activities, incidents, notes, tasks, submissions, interactions, opportunities] =
    await Promise.all([
      prisma.activity.findMany({
        where: {
          pet: {
            userId,
          },
        },
        take: 25,
        orderBy: { performedAt: "desc" },
        select: {
          id: true,
          type: true,
          description: true,
          notes: true,
          performedBy: true,
          performedAt: true,
          pet: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.incidentReport.findMany({
        where: {
          pet: {
            userId,
          },
        },
        take: 25,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          severity: true,
          description: true,
          createdAt: true,
          pet: {
            select: {
              name: true,
            },
          },
        },
      }),
      listCustomerNotes(userId, 50),
      listCustomerTasks(userId, 50),
      getRecentContactSubmissions(250),
      listCustomerInteractions(userId, 100),
      listOpportunities({ userId, limit: 100 }),
    ]);

  const matchedSubmissions = submissions.filter(
    (submission) => submission.email.toLowerCase() === customerEmail.toLowerCase(),
  );

  const bookingTimeline: CrmTimelineItem[] = user.bookings.map((booking) => ({
    id: `booking:${booking.id}`,
    type: "booking",
    title: `Booking ${booking.bookingNumber}`,
    detail: `${booking.status} · ${new Date(booking.checkInDate).toLocaleDateString()} to ${new Date(booking.checkOutDate).toLocaleDateString()} · $${booking.total.toFixed(2)}`,
    timestamp: booking.checkInDate.toISOString(),
  }));

  const messageTimeline: CrmTimelineItem[] = user.messages.map((message) => ({
    id: `message:${message.id}`,
    type: "message",
    title: `${message.senderType === "staff" ? "Staff" : "Customer"} message`,
    detail: `${message.senderName}${message.booking?.bookingNumber ? ` · ${message.booking.bookingNumber}` : ""} · ${message.content}`,
    timestamp: message.sentAt.toISOString(),
  }));

  const activityTimeline: CrmTimelineItem[] = activities.map((activity) => ({
    id: `activity:${activity.id}`,
    type: "activity",
    title: `${activity.type} update for ${activity.pet.name}`,
    detail: [activity.description, activity.notes, activity.performedBy]
      .filter((value): value is string => Boolean(value && value.trim().length > 0))
      .join(" · "),
    timestamp: activity.performedAt.toISOString(),
  }));

  const incidentTimeline: CrmTimelineItem[] = incidents.map((incident) => ({
    id: `incident:${incident.id}`,
    type: "incident",
    title: `${incident.severity} ${incident.type} incident for ${incident.pet.name}`,
    detail: incident.description,
    timestamp: incident.createdAt.toISOString(),
  }));

  const submissionTimeline: CrmTimelineItem[] = matchedSubmissions.flatMap((submission) =>
    submission.conversation.map((entry) => ({
      id: `submission:${submission.submissionId}:${entry.messageId}`,
      type: "contact_submission" as const,
      title: `${entry.senderType === "staff" ? "Staff" : "Customer"} contact thread message`,
      detail: `${entry.senderName} · ${entry.content}`,
      timestamp: entry.createdAt,
    })),
  );

  const noteTimeline: CrmTimelineItem[] = notes.map((note) => ({
    id: `note:${note.noteId}`,
    type: "note",
    title: `Internal note by ${note.createdByName}`,
    detail: note.content,
    timestamp: note.createdAt,
  }));

  const interactionTimeline: CrmTimelineItem[] = interactions.map((interaction) => ({
    id: `interaction:${interaction.id}`,
    type: "interaction",
    title: `${interaction.direction} ${interaction.channel} interaction`,
    detail: `${interaction.subject ? `${interaction.subject} · ` : ""}${interaction.content}`,
    timestamp: interaction.occurredAt,
  }));

  const opportunityTimeline: CrmTimelineItem[] = opportunities.map((opportunity) => ({
    id: `opportunity:${opportunity.id}`,
    type: "opportunity",
    title: `Opportunity ${opportunity.title}`,
    detail: `${opportunity.stage}${opportunity.estimatedValue ? ` · $${opportunity.estimatedValue.toFixed(2)}` : ""}`,
    timestamp: opportunity.createdAt,
  }));

  const timeline = [
    ...bookingTimeline,
    ...messageTimeline,
    ...activityTimeline,
    ...incidentTimeline,
    ...submissionTimeline,
    ...noteTimeline,
    ...interactionTimeline,
    ...opportunityTimeline,
  ]
    .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
    .slice(0, 300);

  const totalSpent = user.bookings
    .filter((booking) => booking.status !== "cancelled")
    .reduce((sum, booking) => sum + booking.total, 0);

  return {
    customer: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      city: user.city,
      state: user.state,
      zip: user.zip,
      loyaltyTier: user.loyaltyTier,
      createdAt: user.createdAt.toISOString(),
      pets: user.pets,
      totalBookings: user.bookings.length,
      totalSpent,
      tags: user.crmTagAssignments.map((assignment) => assignment.tag),
    },
    timeline,
    notes,
    tasks,
    interactions,
    opportunities,
  };
}
