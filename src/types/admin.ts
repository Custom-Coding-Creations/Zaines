/**
 * Admin Types - Centralized types for admin pages and operations
 * Single source of truth for admin domain models
 */

// ============================================================================
// SETTINGS
// ============================================================================

export interface BusinessHours {
  monday: { openTime: string; closeTime: string; isClosed: boolean };
  tuesday: { openTime: string; closeTime: string; isClosed: boolean };
  wednesday: { openTime: string; closeTime: string; isClosed: boolean };
  thursday: { openTime: string; closeTime: string; isClosed: boolean };
  friday: { openTime: string; closeTime: string; isClosed: boolean };
  saturday: { openTime: string; closeTime: string; isClosed: boolean };
  sunday: { openTime: string; closeTime: string; isClosed: boolean };
}

export interface AvailabilityRules {
  minNightsPerBooking: number;
  maxNightsPerBooking: number;
  advanceBookingWindowDays: number; // How many days ahead customers can book
  minimumLeadTimeDays: number; // Minimum days before check-in to allow booking
}

export interface BlackoutDate {
  id: string; // UUID, generated client-side
  date: string; // ISO date "YYYY-MM-DD"
  reason: string;
  blockType: 'full_day' | 'check_in_only' | 'check_out_only';
}

export interface SeasonalPricingRule {
  id: string; // UUID, generated client-side
  name: string; // e.g., "Holiday Weekend", "Summer Peak"
  startDate: string; // ISO date "YYYY-MM-DD"
  endDate: string; // ISO date "YYYY-MM-DD"
  priceMultiplier: number; // e.g., 1.25 = 25% surcharge, 0.9 = 10% discount
  isActive: boolean;
}

export interface PricingSettings {
  currency: string; // ISO code, e.g. "USD"
  standardNightlyRate: number;
  deluxeNightlyRate: number;
  luxuryNightlyRate: number;
  taxRatePercent: number; // e.g. 10 for 10%
  twoPetDiscountPercent: number; // e.g. 15 for 15%
  threePlusPetsDiscountPercent: number; // e.g. 20 for 20%
}

export interface CancellationPolicySettings {
  fullRefundHours: number; // e.g. 48 means full refund at >=48h before check-in
  partialRefundHours: number; // e.g. 24 means partial refund at >=24h and <fullRefundHours
  partialRefundPercent: number; // e.g. 50 means 50% refund
  noShowRefundPercent: number; // e.g. 0 means no-show gets no refund
}

export interface BusinessProfileSettings {
  businessName: string;
  socialLinks: {
    facebook: string;
    instagram: string;
    twitter: string;
  };
}

export interface WebsiteProfileSettings {
  siteUrl: string;
  siteDescription: string;
  ogImageUrl: string;
  ownerImageUrl: string;
  logoImageUrl: string;
  serviceArea: string[];
  tagline?: string; // Optional tagline for display in footer/marketing
}

export interface TrustCopySettings {
  pricingDisclosure: string;
  cancellationProcessing: string;
  privacySecurityDisclosure: string;
  trustEvidenceClaim: string;
}

export interface ServiceTier {
  id: string; // UUID, generated client-side
  name: string; // e.g., "Standard Suite", "Deluxe Suite", "Luxury Suite"
  description: string;
  baseNightlyRate: number; // Base price per night for this tier
  capacity?: number; // Maximum pets/slots available for this service tier
  imageUrl: string; // Public URL for suite/service image
  isActive: boolean;
  displayOrder: number; // For sorting in UI
}

export interface AddOn {
  id: string; // UUID, generated client-side
  name: string; // e.g., "Premium Treats", "Extra Playtime", "Training Session"
  description: string;
  price: number; // Price per occurrence or per booking
  applicableTiers: string[]; // Array of service tier IDs this add-on applies to
  isActive: boolean;
}

export interface ServiceTiersSettings {
  serviceTiers: ServiceTier[];
}

export interface AddOnsSettings {
  addOns: AddOn[];
}

export interface TestimonialItem {
  id: string;
  author: string;
  petName: string;
  rating: number;
  date: string;
  text: string;
  serviceLabel: string;
  isActive: boolean;
  displayOrder: number;
}

export interface TestimonialsSettings {
  testimonials: TestimonialItem[];
}

export interface StripeCapabilityFlags {
  billingSubscriptionsEnabled: boolean;
  customerPortalEnabled: boolean;
  savedPaymentMethodsEnabled: boolean;
  oneClickRebookingEnabled: boolean;
  autopayEnabled: boolean;
  taxEnabled: boolean;
  disputesEnabled: boolean;
  radarReviewEnabled: boolean;
  connectEnabled: boolean;
  treasuryEnabled: boolean;
  issuingEnabled: boolean;
  financialConnectionsEnabled: boolean;
  identityEnabled: boolean;
  terminalEnabled: boolean;
  premiumCheckoutReassuranceEnabled: boolean;
  premiumCheckoutCopyEnabled: boolean;
  premiumCheckoutTrustIndicatorsEnabled: boolean;
  premiumCheckoutLoadingExperienceEnabled: boolean;
}

export interface SmsSettings {
  enabled: boolean;
  fromNumber: string;
}

export interface SmsBudgetSettings {
  monthlyBudgetLimit: number;
  currentMonthSpend: number;
  budgetAlertThreshold: number;
  pauseWhenExceeded: boolean;
}

export interface PackageExpirationSettings {
  autoForfeitUnusedSessions: boolean;
  allowAdminManualExtension: boolean;
  defaultExtensionDays: number;
}

export interface HolidaySurchargeRule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  surchargeType: 'flat' | 'percentage';
  surchargeAmount: number;
  appliesTo: 'boarding' | 'daycare' | 'all';
  isActive: boolean;
}

export interface ReminderSettings {
  bookingReminder24hEnabled: boolean;
  pickupReminderEnabled: boolean;
  rebookNudgeEnabled: boolean;
  rebookNudgeDaysAfterCheckout: number;
  vaccineReminderEnabled: boolean;
  vaccineReminderDaysBeforeExpiry: number[];
  assessmentReminderEnabled: boolean;
  assessmentReminderDaysBeforeExpiry: number[];
}

export interface RequiredVaccineSettings {
  requiredVaccines: string[];
  blockBookingsOnExpiredVaccines: boolean;
}

export interface AdminSettings {
  // Operational Preferences
  autoConfirmBookings: boolean;
  photoNotificationType: 'instant' | 'daily_batch';
  photoNotificationTime?: string; // HH:mm format, e.g., "17:00"
  dashboardDateRange: 'today' | 'today_tomorrow' | 'this_week';
  stripeCapabilityFlags: StripeCapabilityFlags;
  smsSettings: SmsSettings;
  smsBudgetSettings: SmsBudgetSettings;
  packageExpirationSettings: PackageExpirationSettings;
  reminderSettings: ReminderSettings;
  requiredVaccineSettings: RequiredVaccineSettings;
  holidaySurcharges: HolidaySurchargeRule[];
  
  // Phase 1: Business Hours & Contact Info
  businessHours: BusinessHours;
  contactPhone: string;
  contactEmail: string;
  address: string;
  city: string;
  state: string;
  zip: string;

  // Phase 3: Availability & Scheduling Rules
  availabilityRules: AvailabilityRules;

  // Phase 4: Blackout Dates & Seasonal Pricing
  blackoutDates: BlackoutDate[];
  seasonalPricingRules: SeasonalPricingRule[];

  // Phase 5: Pricing & Fees Configuration
  pricingSettings: PricingSettings;

  // Phase 6: Cancellation Policy Configuration
  cancellationPolicySettings: CancellationPolicySettings;

  // Phase 7: Business Profile & Social Links
  businessProfileSettings: BusinessProfileSettings;

  // Phase 8: Website Profile & Service Area
  websiteProfileSettings: WebsiteProfileSettings;

  // Phase 9: Trust Copy Settings
  trustCopySettings: TrustCopySettings;

  // Phase 10: Service Tiers & Add-Ons Configuration
  serviceSettings: ServiceTiersSettings;
  addOnsSettings: AddOnsSettings;

  // Phase 11: Testimonials Configuration
  testimonialsSettings: TestimonialsSettings;
}

// ============================================================================
// PHASE 1 DOMAIN TYPES
// ============================================================================

export interface StaffMemberRecord {
  id: string;
  userId: string;
  role: 'handler' | 'groomer' | 'manager';
  phone?: string | null;
  hireDate?: Date | null;
  certifications: string[];
  emergencyContact?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportCardRecord {
  id: string;
  bookingId: string;
  petId: string;
  staffMemberId?: string | null;
  date: Date;
  overallMood: 'excellent' | 'good' | 'fair' | 'low';
  energyLevel: 1 | 2 | 3 | 4 | 5;
  appetiteLevel: 'ate_all' | 'ate_some' | 'didnt_eat';
  socialization: 'loved_it' | 'warming_up' | 'preferred_alone';
  bathroomNotes?: string | null;
  playHighlights?: string | null;
  behaviorNotes?: string | null;
  staffNotes?: string | null;
  sentToOwner: boolean;
  sentAt?: Date | null;
}

export interface IncidentReportRecord {
  id: string;
  bookingId?: string | null;
  petId: string;
  reportedByStaffId?: string | null;
  type:
    | 'injury'
    | 'aggression'
    | 'health_event'
    | 'escape_attempt'
    | 'property_damage';
  severity: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  actionTaken?: string | null;
  vetReferral: boolean;
  vetDetails?: string | null;
  ownerNotified: boolean;
  ownerNotifiedAt?: Date | null;
  followUpRequired: boolean;
  followUpNotes?: string | null;
  followUpCompletedAt?: Date | null;
  photos: string[];
  witnessNames: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingsRecord {
  key: string;
  value: string;
  updatedAt: Date;
}

export interface AdminQueueItem {
  id:
    | 'check_ins_today'
    | 'check_outs_today'
    | 'pending_confirmations'
    | 'unresolved_messages'
    | 'failed_payments'
    | 'pending_reminders'
    | 'low_stock_items'
    | 'expiring_packages'
    | 'unassigned_play_groups'
    | 'unscheduled_staff_today'
    | 'staffed_groups_without_shift'
    | 'reconciliation_exceptions'
    | 'dispute_deadlines';
  label: string;
  count: number;
  href: string;
  description: string;
  severity: 'normal' | 'attention' | 'critical';
  capabilityBlocked?: boolean;
}

export interface AdminOperationsQueueResponse {
  generatedAt: string;
  items: AdminQueueItem[];
}

// ============================================================================
// BOOKING MANAGEMENT
// ============================================================================

export interface AdminBookingFormData {
  customerId: string;
  petIds: string[];
  suiteId: string;
  checkInDate: string; // ISO date
  checkOutDate: string; // ISO date
  specialRequests?: string;
  autoConfirm?: boolean;
}

export interface AdminBookingResponse {
  id: string;
  bookingNumber: string;
  checkInDate: Date;
  checkOutDate: Date;
  status: string;
  total: number;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  suite: {
    id: string;
    name: string;
  };
  bookingPets: Array<{
    pet: {
      id: string;
      name: string;
      breed: string;
    };
  }>;
}

export interface BookingListFilters {
  status?: string;
  suiteId?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

// ============================================================================
// CHECK-IN WORKFLOW
// ============================================================================

export interface CheckInData {
  bookingId: string;
  waiversSigned: boolean;
  vaccinesCurrent: boolean;
  medicationsReviewed: boolean;
  specialRequestsAcknowledged: boolean;
  notes?: string;
}

export interface WaiverStatus {
  type: 'liability' | 'medical' | 'photo_release';
  signed: boolean;
  signedAt?: Date;
  signature?: string;
}

export interface PetHealthStatus {
  petId: string;
  petName: string;
  vaccinesCurrent: boolean;
  vaccineExpiry?: Date;
  hasActiveMedications: boolean;
  activeMedications: Array<{
    name: string;
    frequency: string;
  }>;
  specialNeeds?: string;
}

// ============================================================================
// DASHBOARD & KPIS
// ============================================================================

export interface DashboardKPI {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'normal' | 'warning' | 'critical';
  action?: {
    label: string;
    href: string;
  };
}

export interface DashboardMetrics {
  todayCheckIns: number;
  todayCheckOuts: number;
  currentOccupancyPercent: number;
  totalOccupiedSuites: number;
  totalSuites: number;
  pendingConfirmations: number;
  alerts: Array<{
    type: 'info' | 'warning' | 'critical';
    message: string;
  }>;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// CUSTOMERS (For CRM integration - Phase 1 but typings ready)
// ============================================================================

export interface CustomerProfile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  pets: Array<{
    id: string;
    name: string;
    breed: string;
  }>;
  totalBookings: number;
  totalSpent: number;
  lastBookingDate?: Date;
  createdAt: Date;
}

// ============================================================================
// PETS (For Phase 1 but typings ready)
// ============================================================================

export interface PetProfile {
  id: string;
  name: string;
  breed: string;
  age: number;
  weight: number;
  gender: string;
  temperament?: string;
  specialNeeds?: string;
  vaccines: Array<{
    name: string;
    expiryDate: Date;
    status: 'current' | 'expiring_soon' | 'expired';
  }>;
}
