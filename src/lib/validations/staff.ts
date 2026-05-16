import { z } from 'zod';

export const staffRoleSchema = z.enum(['handler', 'groomer', 'manager']);

export const staffMemberSchema = z.object({
  userId: z.string().min(1),
  role: staffRoleSchema,
  phone: z.string().max(30).optional(),
  hireDate: z.string().datetime().optional(),
  certifications: z.array(z.string().min(1)).default([]),
  emergencyContact: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  isActive: z.boolean().default(true),
});

export const staffScheduleSchema = z
  .object({
    staffMemberId: z.string().min(1),
    date: z.string().datetime(),
    shiftStart: z.string().regex(/^\d{2}:\d{2}$/),
    shiftEnd: z.string().regex(/^\d{2}:\d{2}$/),
    breakMinutes: z.number().int().min(0).max(240).default(0),
    notes: z.string().max(1000).optional(),
  })
  .refine((data) => data.shiftStart < data.shiftEnd, {
    path: ['shiftEnd'],
    message: 'Shift end must be after shift start',
  });

export type StaffMemberInput = z.infer<typeof staffMemberSchema>;
export type StaffScheduleInput = z.infer<typeof staffScheduleSchema>;
