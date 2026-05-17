import { prisma, isDatabaseConfigured } from '@/lib/prisma';
import { getAdminSettings } from '@/lib/api/admin-settings';
import { sendReminderNotification } from '@/lib/notifications';

type ReminderType =
  | 'booking_reminder'
  | 'pickup_reminder'
  | 'rebook_nudge'
  | 'vaccine_expiry'
  | 'assessment_due';

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date): Date {
  const value = startOfDay(date);
  value.setDate(value.getDate() + 1);
  return value;
}

function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function formatDate(date?: Date | null): string {
  if (!date) return 'soon';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getChannelsForUser(user: { phone?: string | null; smsNotificationsEnabled?: boolean }, smsEnabled: boolean) {
  const channels: Array<'email' | 'sms'> = ['email'];
  if (smsEnabled && user.phone && user.smsNotificationsEnabled) {
    channels.push('sms');
  }
  return channels;
}

async function createReminderIfMissing(payload: {
  type: ReminderType;
  recipientUserId: string;
  recipientEmail: string;
  bookingId?: string;
  petId?: string;
  scheduledFor: Date;
  channel: 'email' | 'sms';
}) {
  const existing = await prisma.automatedReminder.findFirst({
    where: {
      type: payload.type,
      recipientUserId: payload.recipientUserId,
      bookingId: payload.bookingId ?? null,
      petId: payload.petId ?? null,
      channel: payload.channel,
      scheduledFor: payload.scheduledFor,
    },
    select: { id: true },
  });

  if (existing) {
    return false;
  }

  await prisma.automatedReminder.create({
    data: payload,
  });
  return true;
}

export async function generateAutomatedReminders(referenceDate = new Date()) {
  if (!isDatabaseConfigured()) {
    return { generated: 0 };
  }

  const settings = await getAdminSettings();
  let generated = 0;

  if (settings.reminderSettings.bookingReminder24hEnabled) {
    const bookingWindowStart = addDays(referenceDate, 1);
    const bookingWindowEnd = addDays(referenceDate, 2);
    const bookings = await prisma.booking.findMany({
      where: {
        checkInDate: { gte: bookingWindowStart, lt: bookingWindowEnd },
        status: { in: ['pending', 'confirmed'] },
      },
      include: {
        user: { select: { id: true, email: true, phone: true, smsNotificationsEnabled: true } },
      },
    });

    for (const booking of bookings) {
      if (!booking.user.email) continue;
      const scheduledFor = addDays(booking.checkInDate, -1);
      for (const channel of getChannelsForUser(booking.user, settings.smsSettings.enabled)) {
        if (await createReminderIfMissing({
          type: 'booking_reminder',
          recipientUserId: booking.user.id,
          recipientEmail: booking.user.email,
          bookingId: booking.id,
          scheduledFor,
          channel,
        })) {
          generated += 1;
        }
      }
    }
  }

  if (settings.reminderSettings.pickupReminderEnabled) {
    const pickupWindowStart = addDays(referenceDate, 1);
    const pickupWindowEnd = addDays(referenceDate, 2);
    const bookings = await prisma.booking.findMany({
      where: {
        checkOutDate: { gte: pickupWindowStart, lt: pickupWindowEnd },
        status: { in: ['confirmed', 'checked_in'] },
      },
      include: {
        user: { select: { id: true, email: true, phone: true, smsNotificationsEnabled: true } },
      },
    });

    for (const booking of bookings) {
      if (!booking.user.email) continue;
      const scheduledFor = addDays(booking.checkOutDate, -1);
      for (const channel of getChannelsForUser(booking.user, settings.smsSettings.enabled)) {
        if (await createReminderIfMissing({
          type: 'pickup_reminder',
          recipientUserId: booking.user.id,
          recipientEmail: booking.user.email,
          bookingId: booking.id,
          scheduledFor,
          channel,
        })) {
          generated += 1;
        }
      }
    }
  }

  if (settings.reminderSettings.rebookNudgeEnabled) {
    const targetStart = startOfDay(addDays(referenceDate, -settings.reminderSettings.rebookNudgeDaysAfterCheckout));
    const targetEnd = endOfDay(targetStart);
    const bookings = await prisma.booking.findMany({
      where: {
        checkOutDate: { gte: targetStart, lt: targetEnd },
        status: 'completed',
      },
      include: {
        user: { select: { id: true, email: true, phone: true, smsNotificationsEnabled: true } },
      },
    });

    for (const booking of bookings) {
      if (!booking.user.email) continue;
      for (const channel of getChannelsForUser(booking.user, settings.smsSettings.enabled)) {
        if (await createReminderIfMissing({
          type: 'rebook_nudge',
          recipientUserId: booking.user.id,
          recipientEmail: booking.user.email,
          bookingId: booking.id,
          scheduledFor: targetStart,
          channel,
        })) {
          generated += 1;
        }
      }
    }
  }

  if (settings.reminderSettings.vaccineReminderEnabled) {
    for (const daysBefore of settings.reminderSettings.vaccineReminderDaysBeforeExpiry) {
      const targetStart = startOfDay(addDays(referenceDate, daysBefore));
      const targetEnd = endOfDay(targetStart);
      const vaccines = await prisma.vaccine.findMany({
        where: { expiryDate: { gte: targetStart, lt: targetEnd } },
        include: {
          pet: {
            include: {
              user: { select: { id: true, email: true, phone: true, smsNotificationsEnabled: true } },
            },
          },
        },
      });

      for (const vaccine of vaccines) {
        if (!vaccine.pet.user.email) continue;
        for (const channel of getChannelsForUser(vaccine.pet.user, settings.smsSettings.enabled)) {
          if (await createReminderIfMissing({
            type: 'vaccine_expiry',
            recipientUserId: vaccine.pet.user.id,
            recipientEmail: vaccine.pet.user.email,
            petId: vaccine.pet.id,
            scheduledFor: targetStart,
            channel,
          })) {
            generated += 1;
          }
        }
      }
    }
  }

  if (settings.reminderSettings.assessmentReminderEnabled) {
    for (const daysBefore of settings.reminderSettings.assessmentReminderDaysBeforeExpiry) {
      const targetStart = startOfDay(addDays(referenceDate, daysBefore));
      const targetEnd = endOfDay(targetStart);
      const assessments = await prisma.behavioralAssessment.findMany({
        where: { validUntil: { gte: targetStart, lt: targetEnd } },
        include: {
          pet: {
            include: {
              user: { select: { id: true, email: true, phone: true, smsNotificationsEnabled: true } },
            },
          },
        },
      });

      for (const assessment of assessments) {
        if (!assessment.pet.user.email) continue;
        for (const channel of getChannelsForUser(assessment.pet.user, settings.smsSettings.enabled)) {
          if (await createReminderIfMissing({
            type: 'assessment_due',
            recipientUserId: assessment.pet.user.id,
            recipientEmail: assessment.pet.user.email,
            petId: assessment.pet.id,
            scheduledFor: targetStart,
            channel,
          })) {
            generated += 1;
          }
        }
      }
    }
  }

  return { generated };
}

function buildReminderContent(reminder: {
  type: ReminderType;
  booking?: { bookingNumber: string; checkInDate: Date; checkOutDate: Date } | null;
  pet?: { name: string } | null;
  recipientUser?: { name: string | null } | null;
}) {
  const customerName = reminder.recipientUser?.name || 'there';
  switch (reminder.type) {
    case 'booking_reminder':
      return {
        subject: `Reminder: upcoming stay ${reminder.booking?.bookingNumber || ''}`.trim(),
        text: `Zaine's Stay & Play reminder: your upcoming stay${reminder.booking?.bookingNumber ? ` ${reminder.booking.bookingNumber}` : ''} begins ${formatDate(reminder.booking?.checkInDate)}.`,
        html: `<p>Hi ${customerName}, your upcoming stay${reminder.booking?.bookingNumber ? ` <strong>${reminder.booking.bookingNumber}</strong>` : ''} begins ${formatDate(reminder.booking?.checkInDate)}.</p>`,
      };
    case 'pickup_reminder':
      return {
        subject: `Pickup reminder${reminder.booking?.bookingNumber ? ` for ${reminder.booking.bookingNumber}` : ''}`,
        text: `Zaine's Stay & Play reminder: pickup is scheduled for ${formatDate(reminder.booking?.checkOutDate)}${reminder.booking?.bookingNumber ? ` for booking ${reminder.booking.bookingNumber}` : ''}.`,
        html: `<p>Hi ${customerName}, pickup is scheduled for ${formatDate(reminder.booking?.checkOutDate)}${reminder.booking?.bookingNumber ? ` for booking <strong>${reminder.booking.bookingNumber}</strong>` : ''}.</p>`,
      };
    case 'rebook_nudge':
      return {
        subject: 'Ready to book the next stay?',
        text: `Zaine's Stay & Play: we'd love to welcome you back. Rebook your next stay whenever you're ready.`,
        html: `<p>Hi ${customerName}, we'd love to welcome you back. Rebook your next stay whenever you're ready.</p>`,
      };
    case 'vaccine_expiry':
      return {
        subject: `${reminder.pet?.name || 'Your pet'} vaccine reminder`,
        text: `Zaine's Stay & Play reminder: a vaccine record for ${reminder.pet?.name || 'your pet'} is nearing expiration. Please upload updated records before your next booking.`,
        html: `<p>Hi ${customerName}, a vaccine record for ${reminder.pet?.name || 'your pet'} is nearing expiration. Please upload updated records before your next booking.</p>`,
      };
    case 'assessment_due':
      return {
        subject: `${reminder.pet?.name || 'Your pet'} assessment reminder`,
        text: `Zaine's Stay & Play reminder: ${reminder.pet?.name || 'your pet'} may need an updated behavior assessment soon.`,
        html: `<p>Hi ${customerName}, ${reminder.pet?.name || 'your pet'} may need an updated behavior assessment soon.</p>`,
      };
  }
}

export async function dispatchDueAutomatedReminders(limit = 50) {
  if (!isDatabaseConfigured()) {
    return { dispatched: 0, queued: 0 };
  }

  const reminders = await prisma.automatedReminder.findMany({
    where: {
      sent: false,
      scheduledFor: { lte: new Date() },
    },
    include: {
      recipientUser: { select: { name: true, phone: true } },
      booking: { select: { bookingNumber: true, checkInDate: true, checkOutDate: true } },
      pet: { select: { name: true } },
    },
    orderBy: { scheduledFor: 'asc' },
    take: limit,
  });

  let dispatched = 0;
  let queued = 0;

  for (const reminder of reminders) {
    const typedReminder = {
      ...reminder,
      type: reminder.type as ReminderType,
    };
    const content = buildReminderContent(typedReminder);
    const result = await sendReminderNotification({
      channel: reminder.channel as 'email' | 'sms',
      toEmail: reminder.recipientEmail,
      toPhone: reminder.recipientUser?.phone,
      subject: content.subject,
      html: content.html,
      text: content.text,
      category: typedReminder.type,
      bookingId: reminder.bookingId || undefined,
    });

    const wasHandled =
      result.sent ||
      result.provider === 'dev-queue' ||
      result.sms?.provider === 'dev-log';

    if (wasHandled) {
      await prisma.automatedReminder.update({
        where: { id: reminder.id },
        data: { sent: true, sentAt: new Date() },
      });
      dispatched += 1;
      if (!result.sent) {
        queued += 1;
      }
    }
  }

  return { dispatched, queued };
}