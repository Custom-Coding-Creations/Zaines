import { z } from 'zod';

export const recurringBookingSchema = z.object({
  userId: z.string().min(1),
  suiteId: z.string().optional(),
  serviceType: z.enum(['daycare', 'boarding']),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  specialRequests: z.string().max(2000).optional(),
});

export type RecurringBookingInput = z.infer<typeof recurringBookingSchema>;
