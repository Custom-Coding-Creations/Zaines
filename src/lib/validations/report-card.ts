import { z } from 'zod';

export const reportCardSchema = z.object({
  bookingId: z.string().min(1),
  petId: z.string().min(1),
  staffMemberId: z.string().optional(),
  date: z.string().datetime(),
  overallMood: z.enum(['excellent', 'good', 'fair', 'low']),
  energyLevel: z.number().int().min(1).max(5),
  appetiteLevel: z.enum(['ate_all', 'ate_some', 'didnt_eat']),
  socialization: z.enum(['loved_it', 'warming_up', 'preferred_alone']),
  bathroomNotes: z.string().max(1000).optional(),
  playHighlights: z.string().max(1000).optional(),
  behaviorNotes: z.string().max(1000).optional(),
  staffNotes: z.string().max(1000).optional(),
  sentToOwner: z.boolean().default(false),
});

export type ReportCardInput = z.infer<typeof reportCardSchema>;
