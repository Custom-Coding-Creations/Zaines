import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BOOKING_POLICY_ACKNOWLEDGMENT,
  CANCELLATION_POLICY_COPY,
  FORBIDDEN_TRUST_COPY_PATTERNS,
  PRICING_TRUST_DISCLOSURE,
  PRIVACY_SECURITY_DISCLOSURE,
  SAFETY_STANDARDS_COPY,
  TRUST_EVIDENCE_CLAIM,
  TRUST_PROFILE_EVIDENCE,
} from "@/config/trust-copy";
import { BOOKING_PRICING_DISCLOSURE } from "@/lib/booking/pricing";
import { stepWaiverSchema } from "@/lib/validations/booking-wizard";

const trustCriticalFiles = [
  "src/app/pricing/page.tsx",
  "src/app/book/page.tsx",
  "src/app/book/components/StepWaiver.tsx",
  "src/app/book/components/StepPayment.tsx",
  "src/app/terms/page.tsx",
  "src/app/privacy/page.tsx",
  "src/app/policies/page.tsx",
  "src/app/page.tsx",
  "src/app/api/bookings/route.ts",
  "src/lib/booking/pricing.ts",
  "src/lib/validations/booking-wizard.ts",
];

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Issue #64 trust and safety evidence layer", () => {
  it("keeps key trust claims aligned to the business owner profile", () => {
    expect(TRUST_PROFILE_EVIDENCE.source).toContain(
      "business_owner_profile.zaine.yaml",
    );
    expect(TRUST_EVIDENCE_CLAIM.toLowerCase()).toContain("private suites");
    expect(TRUST_EVIDENCE_CLAIM).toContain("owner onsite");
    expect(TRUST_EVIDENCE_CLAIM).toContain("camera-monitored safety");
    expect(TRUST_EVIDENCE_CLAIM).toContain("no harsh chemicals");
    expect(TRUST_EVIDENCE_CLAIM).toContain(
      "same-family dogs can stay together when approved",
    );
  });

  it("uses one pricing disclosure contract across marketing and booking APIs", () => {
    expect(BOOKING_PRICING_DISCLOSURE).toBe(PRICING_TRUST_DISCLOSURE);
    expect(PRICING_TRUST_DISCLOSURE).toContain("before confirmation");
    expect(PRICING_TRUST_DISCLOSURE).toContain("Premium");
    expect(PRICING_TRUST_DISCLOSURE).toContain("No hidden fees");
    expect(PRICING_TRUST_DISCLOSURE).toContain("no surprise add-ons");
    expect(PRICING_TRUST_DISCLOSURE).toContain("undisclosed charges");
  });

  it("keeps cancellation windows aligned with the cancellation route contract", () => {
    expect(CANCELLATION_POLICY_COPY.fullRefund).toBe(
      "48+ hours before check-in: full refund.",
    );
    expect(CANCELLATION_POLICY_COPY.partialRefund).toBe(
      "24-48 hours before check-in: 50% refund.",
    );
    expect(CANCELLATION_POLICY_COPY.noRefund).toBe(
      "Less than 24 hours before check-in: no refund.",
    );
    expect(read("src/app/api/bookings/[id]/cancel/route.ts")).toContain(
      'policyWindow: "partial_refund"',
    );
  });

  it("requires explicit policy acknowledgement before checkout", () => {
    const validWaiver = {
      liabilityAccepted: true,
      medicalAuthorizationAccepted: true,
      photoReleaseAccepted: true,
      policyAcknowledgmentAccepted: true,
      reuseExistingWaivers: false,
      signature: "data:image/png;base64,signature",
      timestamp: new Date("2026-05-05T00:00:00.000Z"),
    } as const;

    expect(stepWaiverSchema.safeParse(validWaiver).success).toBe(true);
    expect(
      stepWaiverSchema.safeParse({
        ...validWaiver,
        policyAcknowledgmentAccepted: false,
      }).success,
    ).toBe(false);
    expect(BOOKING_POLICY_ACKNOWLEDGMENT).toContain("Terms");
    expect(BOOKING_POLICY_ACKNOWLEDGMENT).toContain("Privacy Policy");
    expect(BOOKING_POLICY_ACKNOWLEDGMENT).toContain("cancellation policy");
    expect(BOOKING_POLICY_ACKNOWLEDGMENT).toContain("vaccination requirements");
  });

  it("anchors safety standards to vaccine, supervision, and emergency protocols", () => {
    expect(SAFETY_STANDARDS_COPY.requiredVaccines).toEqual(
      expect.arrayContaining([
        "Rabies",
        expect.stringContaining("DHPP"),
        "Bordetella",
      ]),
    );
    expect(SAFETY_STANDARDS_COPY.vaccineRecordTiming).toContain(
      "before confirmation",
    );
    expect(SAFETY_STANDARDS_COPY.supervisionProtocol).toContain(
      "Owner-on-site supervision",
    );
    expect(SAFETY_STANDARDS_COPY.supervisionProtocol).toContain(
      "camera-monitored safety",
    );
    expect(SAFETY_STANDARDS_COPY.emergencyProtocol).toContain(
      "veterinary care",
    );
  });

  it("prevents unsupported or contradictory trust-critical copy from returning", () => {
    const source = trustCriticalFiles.map(read).join("\n").toLowerCase();

    for (const forbiddenCopy of FORBIDDEN_TRUST_COPY_PATTERNS) {
      expect(source).not.toContain(forbiddenCopy.toLowerCase());
    }
  });

  it("keeps privacy security language evidence-backed instead of absolute", () => {
    expect(PRIVACY_SECURITY_DISCLOSURE).toContain("Stripe");
    expect(PRIVACY_SECURITY_DISCLOSURE).toContain(
      "does not store card numbers",
    );
    expect(PRIVACY_SECURITY_DISCLOSURE).not.toContain("guarantee");
  });
});
