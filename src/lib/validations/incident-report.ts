import { z } from 'zod';

export const incidentReportSchema = z.object({
  bookingId: z.string().optional(),
  petId: z.string().min(1),
  reportedByStaffId: z.string().optional(),
  type: z.enum([
    'injury',
    'aggression',
    'health_event',
    'escape_attempt',
    'property_damage',
  ]),
  severity: z.enum(['minor', 'moderate', 'serious', 'critical']),
  description: z.string().min(1).max(4000),
  actionTaken: z.string().max(2000).optional(),
  vetReferral: z.boolean().default(false),
  vetDetails: z.string().max(2000).optional(),
  ownerNotified: z.boolean().default(false),
  followUpRequired: z.boolean().default(false),
  followUpNotes: z.string().max(2000).optional(),
  photos: z.array(z.string().min(1)).default([]),
  witnessNames: z.array(z.string().min(1)).default([]),
});

export type IncidentReportInput = z.infer<typeof incidentReportSchema>;
