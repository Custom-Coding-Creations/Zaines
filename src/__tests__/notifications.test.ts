import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs/promises";
import path from "path";

import {
  sendBookingConfirmation,
  sendOwnerBookingNotification,
  sendPaymentNotification,
} from "@/lib/notifications";

const QUEUE_PATH = path.resolve(process.cwd(), "tmp", "email-queue.log");

type TestBooking = {
  id?: string;
  bookingNumber?: string;
  status?: string;
  user?: { email: string; name?: string };
};

async function rmQueue() {
  try {
    await fs.unlink(QUEUE_PATH);
  } catch {
    // ignore
  }
}

describe("notifications helper (dev queue)", () => {
  beforeEach(async () => {
    delete process.env.RESEND_API_KEY;
    await rmQueue();
  });

  afterEach(async () => {
    await rmQueue();
  });

  it("writes booking confirmation to dev queue when RESEND_API_KEY is not set", async () => {
    const booking: TestBooking = {
      id: "b_test_1",
      bookingNumber: "PB-TEST-0001",
      status: "pending",
      user: { email: "test@example.com", name: "Test User" },
    };

    const res = await sendBookingConfirmation(booking);
    expect(res.provider).toBe("dev-queue");

    const contents = await fs.readFile(QUEUE_PATH, "utf8");
    expect(contents).toContain("booking_confirmation");
    expect(contents).toContain("PB-TEST-0001");
  });

  it("writes owner booking notification to dev queue when RESEND_API_KEY is not set", async () => {
    const booking: TestBooking = {
      id: "b_test_owner",
      bookingNumber: "PB-TEST-OWNER-0001",
      status: "confirmed",
      user: { email: "customer@example.com", name: "Customer Name" },
    };

    const res = await sendOwnerBookingNotification(booking);
    expect(res.provider).toBe("dev-queue");

    const contents = await fs.readFile(QUEUE_PATH, "utf8");
    expect(contents).toContain("owner_booking_notification");
    expect(contents).toContain("PB-TEST-OWNER-0001");
    expect(contents).toContain("New Booking");
  });

  it("writes payment notification to dev queue when RESEND_API_KEY is not set", async () => {
    const booking: TestBooking = {
      id: "b_test_2",
      bookingNumber: "PB-TEST-0002",
      user: { email: "pay@example.com" },
    };
    const res = await sendPaymentNotification("b_test_2", "success", booking);
    expect(res.provider).toBe("dev-queue");

    const contents = await fs.readFile(QUEUE_PATH, "utf8");
    expect(contents).toContain("payment_notification");
    expect(contents).toContain("PB-TEST-0002");
  });
});
