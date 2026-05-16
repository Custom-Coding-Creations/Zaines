import { z } from 'zod';

export const playGroupSchema = z.object({
  name: z.string().min(1).max(120),
  date: z.string().datetime(),
  timeSlot: z.string().min(1),
  location: z.enum(['yard_a', 'yard_b', 'indoor']),
  maxCapacity: z.number().int().min(1).max(100),
  sizeCategory: z.enum(['small', 'medium', 'large', 'mixed']),
  energyLevel: z.enum(['calm', 'moderate', 'high']),
  staffMemberId: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const playGroupAssignmentSchema = z.object({
  playGroupId: z.string().min(1),
  petId: z.string().min(1),
  bookingId: z.string().optional(),
  behaviorNotes: z.string().max(1000).optional(),
});

export type PlayGroupInput = z.infer<typeof playGroupSchema>;
export type PlayGroupAssignmentInput = z.infer<typeof playGroupAssignmentSchema>;
