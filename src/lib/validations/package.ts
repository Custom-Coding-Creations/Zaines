import { z } from 'zod';

export const bookingPackageSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['daycare_pass', 'boarding_bundle', 'monthly_unlimited']),
  totalSessions: z.number().int().min(1),
  price: z.number().min(0),
  validDays: z.number().int().min(1).max(3650),
  description: z.string().max(2000).optional(),
  isActive: z.boolean().default(true),
});

export const customerPackageSchema = z.object({
  userId: z.string().min(1),
  packageId: z.string().min(1),
  purchaseDate: z.string().datetime().optional(),
  expiresAt: z.string().datetime(),
  sessionsUsed: z.number().int().min(0).default(0),
  sessionsRemaining: z.number().int().min(0),
  status: z.enum(['active', 'expired', 'fully_used', 'cancelled']).default('active'),
  stripePaymentId: z.string().optional(),
});

export type BookingPackageInput = z.infer<typeof bookingPackageSchema>;
export type CustomerPackageInput = z.infer<typeof customerPackageSchema>;
