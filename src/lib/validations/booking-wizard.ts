import { z } from "zod";

/**
 * Validation schemas for the 6-step booking wizard
 */

function isAbsoluteOrRootRelativeUrl(value: string): boolean {
  if (value.startsWith("/")) {
    return true;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

const vaccineFileUrlSchema = z.string().refine(isAbsoluteOrRootRelativeUrl, {
  message: "Invalid file URL",
});

// Step 1: Date & Service Selection
export const stepDatesSchema = z
  .object({
    checkIn: z.string().min(1, "Check-in date is required"),
    checkOut: z.string().min(1, "Check-out date is required"),
    dropoffTimeSlot: z.string().optional(),
    pickupTimeSlot: z.string().optional(),
    serviceType: z.enum(["boarding"]),
    petCount: z
      .number()
      .min(1, "At least 1 pet is required")
      .max(10, "Maximum 10 pets per booking"),
  })
  .refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
    message: "Check-out date must be after check-in date",
    path: ["checkOut"],
  });

// Step 2: Suite & Add-Ons
export const stepSuitesSchema = z.object({
  suiteType: z.enum(["standard", "deluxe", "luxury"]),
  addOns: z
    .array(
      z.object({
        id: z.string(),
        quantity: z.number().min(1).max(99),
      }),
    )
    .default([]),
});

// Step 3: Account (handled by NextAuth)
export const stepAccountSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
});

// Step 3: Account for Guest Checkout (minimal validation)
export const stepAccountGuestSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Step 4: Pet Profiles
export const newPetSchema = z.object({
  name: z.string().min(1, "Pet name is required").max(100),
  breed: z.string().min(1, "Breed is required").max(100),
  age: z
    .number()
    .min(0, "Age must be 0 or greater")
    .max(30, "Please enter a valid age"),
  weight: z
    .number()
    .min(1, "Weight must be greater than 0")
    .max(300, "Please enter a valid weight"),
  gender: z.enum(["male", "female"]),
  temperament: z
    .enum(["friendly", "shy", "energetic", "calm", "anxious"])
    .optional(),
  specialNeeds: z
    .string()
    .max(1000, "Special needs description too long")
    .optional(),
  feedingInstructions: z
    .string()
    .max(1000, "Feeding instructions too long")
    .optional(),
});

export const stepPetsSchema = z
  .object({
    selectedPetIds: z.array(z.string()).default([]),
    newPets: z.array(newPetSchema).default([]),
    vaccines: z
      .array(
        z.object({
          petId: z.string(),
          fileUrl: vaccineFileUrlSchema,
          fileName: z.string(),
          fileSize: z.number(),
        }),
      )
      .default([]),
  })
  .refine((data) => data.selectedPetIds.length + data.newPets.length > 0, {
    message: "Please select or add at least one pet",
    path: ["selectedPetIds"],
  })
  .refine(
    (data) => {
      // Ensure all selected pets (existing + new) have vaccines uploaded
      const totalPets = data.selectedPetIds.length + data.newPets.length;
      return data.vaccines.length >= totalPets;
    },
    {
      message: "All pets must have vaccine records uploaded",
      path: ["vaccines"],
    },
  );

// Step 5: Waiver & E-Signature
export const stepWaiverSchema = z.object({
  liabilityAccepted: z.boolean().default(false),
  medicalAuthorizationAccepted: z.boolean().default(false),
  photoReleaseAccepted: z.boolean().default(false),
  policyAcknowledgmentAccepted: z.boolean().default(false),
  reuseExistingWaivers: z.boolean().default(true),
  signature: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(10, "Please provide a signature").optional(),
  ),
  ipAddress: z
    .string()
    .regex(
      /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$/,
      "Invalid IP address",
    )
    .optional(),
  userAgent: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
}).superRefine((data, context) => {
    // If reusing saved waivers, checkboxes are optional (already accepted when waivers were originally signed)
    // If not reusing, require all checkboxes checked AND a new signature
    if (!data.reuseExistingWaivers) {
      if (!data.liabilityAccepted) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "You must accept the liability waiver",
          path: ["liabilityAccepted"],
        });
      }
      if (!data.medicalAuthorizationAccepted) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "You must authorize emergency medical treatment",
          path: ["medicalAuthorizationAccepted"],
        });
      }
      if (!data.photoReleaseAccepted) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "You must consent to photo/video use",
          path: ["photoReleaseAccepted"],
        });
      }
      if (!data.policyAcknowledgmentAccepted) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "You must acknowledge the booking policies",
          path: ["policyAcknowledgmentAccepted"],
        });
      }
      if (!data.signature) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please provide a signature",
          path: ["signature"],
        });
      }
    }
  });

// Step 6: Payment
export const stepPaymentSchema = z.object({
  paymentOption: z.enum(["full", "deposit"]),
  amount: z.number().positive("Amount must be greater than 0"),
});

// Complete booking creation schema (server-side)
export const createBookingSchema = z.object({
  // Step 1 data
  checkIn: z.string(),
  checkOut: z.string(),
  dropoffTimeSlot: z.string().optional(),
  pickupTimeSlot: z.string().optional(),
  serviceType: z.string(),
  petCount: z.number(),

  // Step 2 data
  suiteType: z.string(),
  addOns: z
    .array(z.object({ id: z.string(), quantity: z.number() }))
    .optional(),

  // Step 4 data
  petIds: z.array(z.string()).optional(),
  newPets: z.array(newPetSchema).optional(),
  vaccines: z
    .array(
      z.object({
        petId: z.string(),
        fileUrl: z.string(),
        fileName: z.string(),
      }),
    )
    .optional(),
  reuseExistingWaivers: z.boolean().optional(),

  // Step 5 data
  waiver: z.object({
    signature: z.string().optional(),
    liabilityAccepted: z.boolean(),
    medicalAuthorizationAccepted: z.boolean(),
    photoReleaseAccepted: z.boolean(),
    policyAcknowledgmentAccepted: z.boolean(),
    reuseExistingWaivers: z.boolean().optional(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
  }),

  // Contact info (from session or form)
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),

  // Additional
  specialRequests: z.string().optional(),
  isDeposit: z.boolean().default(false),
});

export type StepDatesData = z.infer<typeof stepDatesSchema>;
export type StepSuitesData = z.infer<typeof stepSuitesSchema>;
export type StepAccountData = z.infer<typeof stepAccountSchema>;
export type StepPetsData = z.infer<typeof stepPetsSchema>;
export type StepWaiverData = z.infer<typeof stepWaiverSchema>;
export type StepPaymentData = z.infer<typeof stepPaymentSchema>;
export type NewPetData = z.infer<typeof newPetSchema>;
export type CreateBookingData = z.infer<typeof createBookingSchema>;
