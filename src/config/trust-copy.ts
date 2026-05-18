export const TRUST_PROFILE_EVIDENCE = {
  source:
    ".github/.system-state/model/business_owner_profile.zaine.yaml updated 2026-02-27",
  businessModel: "home-based private dog boarding in Syracuse, NY",
  capacity: "limited private suites",
  ownerPresence: "owner onsite",
  safetyMonitoring: "camera-monitored safety",
  cleaningStandard: "no harsh chemicals",
  suitePolicy: "same-family dogs can stay together when approved",
} as const;

export const TRUST_EVIDENCE_CLAIM =
  "Limited private suites, owner onsite, camera-monitored safety, no harsh chemicals, and same-family dogs can stay together when approved.";

export const PRICING_TRUST_DISCLOSURE =
  "Premium but fair pricing includes clear subtotal, applicable tax, selected care items, and total shown before confirmation. No hidden fees, no surprise add-ons, or other undisclosed charges are introduced at checkout.";

export const CANCELLATION_POLICY_COPY = {
  fullRefund: "48+ hours before check-in: full refund.",
  partialRefund: "24-48 hours before check-in: 50% refund.",
  noRefund: "Less than 24 hours before check-in: no refund.",
  noShow: "No-show: full charge applies, no refund.",
  processing:
    "Refunds are returned to the original payment method when payment processing is available.",
} as const;

export const SAFETY_STANDARDS_COPY = {
  requiredVaccines: [
    "Rabies",
    "DHPP - Distemper, Hepatitis, Parvovirus, Parainfluenza",
    "Bordetella",
  ],
  vaccineRecordTiming:
    "Vaccination records must be submitted before confirmation and kept current for every stay.",
  supervisionProtocol:
    "Owner-on-site supervision, camera-monitored safety, no overcrowded group handling, and structured rest, feeding, medication, and special-instruction routines.",
  emergencyProtocol:
    "If emergency care is needed, we contact the owner immediately when reachable and seek veterinary care when urgent treatment cannot wait.",
} as const;

export const BOOKING_POLICY_ACKNOWLEDGMENT =
  "I have reviewed the Terms, Privacy Policy, cancellation policy, vaccination requirements, emergency-care authorization, and pricing disclosure before requesting confirmation.";

export const PRIVACY_SECURITY_DISCLOSURE =
  "Payment details are processed by Stripe; Zaine's Stay & Play does not store card numbers on our servers. We use access controls and secure transmission for booking, account, pet health, and message data.";

export const FORBIDDEN_TRUST_COPY_PATTERNS = [
  "no questions asked",
  "full credit toward future visit",
  "credit available at management discretion",
  "holiday bookings may be subject to different cancellation terms",
  "all data is encrypted",
  "regular security audits and vulnerability assessments",
] as const;
