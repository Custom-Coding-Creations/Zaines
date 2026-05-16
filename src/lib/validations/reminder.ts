import { z } from 'zod';

export const automatedReminderSchema = z.object({
  type: z.enum([
    'booking_reminder',
    'pickup_reminder',
    'rebook_nudge',
    'vaccine_expiry',
    'assessment_due',
  ]),
  recipientUserId: z.string().min(1),
  recipientEmail: z.string().email(),
  bookingId: z.string().optional(),
  petId: z.string().optional(),
  scheduledFor: z.string().datetime(),
  channel: z.enum(['email', 'sms']),
  sent: z.boolean().default(false),
});

export const timeSlotConfigSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  slotStart: z.string().regex(/^\d{2}:\d{2}$/),
  slotEnd: z.string().regex(/^\d{2}:\d{2}$/),
  maxCapacity: z.number().int().min(1).max(100),
  serviceType: z.enum(['dropoff', 'pickup', 'both']),
  isActive: z.boolean().default(true),
});

export const holidaySurchargeSchema = z.object({
  name: z.string().min(1).max(120),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  surchargeType: z.enum(['flat', 'percentage']),
  surchargeAmount: z.number().min(0),
  appliesTo: z.enum(['boarding', 'daycare', 'all']),
  isActive: z.boolean().default(true),
});

export type AutomatedReminderInput = z.infer<typeof automatedReminderSchema>;
export type TimeSlotConfigInput = z.infer<typeof timeSlotConfigSchema>;
export type HolidaySurchargeInput = z.infer<typeof holidaySurchargeSchema>;
