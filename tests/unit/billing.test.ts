import { describe, it, expect } from "vitest";
import {
  buildMockQrPayload,
  generateInvoiceNumber,
  isTrialActive,
  paymentIntentExpiry,
  periodEnd,
  quotaRemaining,
} from "@/lib/billing";

describe("generateInvoiceNumber", () => {
  it("matches INV-YYYYMMDD-XXXXXXXX format", () => {
    const n = generateInvoiceNumber(new Date("2026-05-11T00:00:00Z"));
    expect(n).toMatch(/^INV-20260511-[0-9A-Z]{8}$/);
  });

  it("two consecutive numbers differ", () => {
    const a = generateInvoiceNumber();
    const b = generateInvoiceNumber();
    expect(a).not.toBe(b);
  });
});

describe("periodEnd", () => {
  const start = new Date("2026-01-15T00:00:00Z");
  it("monthly default count = 1", () => {
    const e = periodEnd(start, "Monthly");
    expect(e.toISOString()).toBe("2026-02-15T00:00:00.000Z");
  });
  it("annual", () => {
    const e = periodEnd(start, "Annual");
    expect(e.toISOString()).toBe("2027-01-15T00:00:00.000Z");
  });
  it("count param", () => {
    const e = periodEnd(start, "Monthly", 3);
    expect(e.toISOString()).toBe("2026-04-15T00:00:00.000Z");
  });
});

describe("quotaRemaining", () => {
  it("unlimited when max null", () => {
    const r = quotaRemaining(50, null);
    expect(r.unlimited).toBe(true);
    expect(r.blocked).toBe(false);
    expect(r.remaining).toBe(Number.POSITIVE_INFINITY);
  });
  it("blocked when at max", () => {
    expect(quotaRemaining(10, 10).blocked).toBe(true);
  });
  it("over max stays blocked + remaining 0", () => {
    expect(quotaRemaining(15, 10)).toEqual({
      remaining: 0,
      blocked: true,
      unlimited: false,
    });
  });
  it("normal usage", () => {
    expect(quotaRemaining(5, 10).remaining).toBe(5);
    expect(quotaRemaining(5, 10).blocked).toBe(false);
  });
});

describe("isTrialActive", () => {
  it("null trial → false", () => {
    expect(isTrialActive(null)).toBe(false);
  });
  it("future trial → true", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(isTrialActive(future)).toBe(true);
  });
  it("past trial → false", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(isTrialActive(past)).toBe(false);
  });
});

describe("paymentIntentExpiry", () => {
  it("15 minutes after now", () => {
    const now = new Date("2026-05-11T00:00:00Z");
    const exp = paymentIntentExpiry(now);
    expect(exp.getTime() - now.getTime()).toBe(15 * 60 * 1000);
  });
});

describe("buildMockQrPayload", () => {
  it("encodes invoice + amount + currency", () => {
    expect(
      buildMockQrPayload({
        invoiceNumber: "INV-001",
        amount: 49,
        currency: "USD",
      })
    ).toBe("MOCK|INV-001|49.00|USD");
  });
});
