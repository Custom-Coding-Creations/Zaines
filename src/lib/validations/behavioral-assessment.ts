import { z } from 'zod';

export const behavioralAssessmentSchema = z.object({
  petId: z.string().min(1),
  assessedByStaffId: z.string().optional(),
  assessmentDate: z.string().datetime(),
  reactivityLevel: z.number().int().min(1).max(5),
  resourceGuarding: z.boolean().default(false),
  leashBehavior: z.enum(['excellent', 'good', 'needs_work', 'reactive']),
  separationAnxiety: z.enum(['none', 'mild', 'moderate', 'high']),
  playStyle: z.enum(['rough', 'gentle', 'independent', 'observer']),
  sizeCompatibility: z.enum(['small_only', 'medium_and_small', 'any']),
  energyLevel: z.enum(['low', 'moderate', 'high']),
  overallResult: z.enum(['approved', 'conditional', 'denied']),
  conditions: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
  validUntil: z.string().datetime().optional(),
});

export type BehavioralAssessmentInput = z.infer<typeof behavioralAssessmentSchema>;
