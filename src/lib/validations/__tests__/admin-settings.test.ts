import { describe, expect, it } from "vitest";

import { fullSettingsPartialSchema } from "../admin-settings";

describe("fullSettingsPartialSchema", () => {
  it("preserves services payload fields used by admin settings updates", () => {
    const payload = {
      serviceSettings: {
        serviceTiers: [
          {
            id: "standard-suite",
            name: "Standard Suite",
            description: "Comfortable and cozy suite with basic amenities",
            baseNightlyRate: 65,
            capacity: 3,
            imageUrl: "/images/suites/standard-suite-default.webp",
            isActive: true,
            displayOrder: 1,
          },
        ],
      },
      addOnsSettings: {
        addOns: [
          {
            id: "premium-treats",
            name: "Premium Treats Package",
            description: "Special premium treats and snacks throughout stay",
            price: 15,
            applicableTiers: ["standard-suite"],
            isActive: true,
          },
        ],
      },
      testimonialsSettings: {
        testimonials: [
          {
            id: "testimonial-1",
            author: "Sarah M.",
            petName: "Max",
            rating: 5,
            date: "2 weeks ago",
            text: "Max had an amazing stay. The owner sent us photos every day and he looked genuinely happy.",
            serviceLabel: "Standard Suite",
            isActive: true,
            displayOrder: 0,
          },
        ],
      },
    };

    const parsed = fullSettingsPartialSchema.safeParse(payload);

    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      throw new Error("Expected schema parse to succeed");
    }

    expect(parsed.data).toMatchObject(payload);
  });
});
