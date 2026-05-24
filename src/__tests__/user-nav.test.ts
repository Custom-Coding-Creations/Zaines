import { describe, expect, it } from "vitest";

import { buildSignInHref } from "@/components/user-nav";

describe("buildSignInHref", () => {
  it("falls back to the custom sign-in page when no pathname is available", () => {
    expect(buildSignInHref(null)).toBe("/auth/signin");
  });

  it("preserves the current pathname as the callback target", () => {
    expect(buildSignInHref("/dashboard/bookings")).toBe(
      "/auth/signin?callbackUrl=%2Fdashboard%2Fbookings",
    );
  });
});