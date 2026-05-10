import { describe, it, expect } from "vitest";
import {
  estimateCo2eKg,
  scopeForSubmission,
  validateSubmission,
  DEFAULT_PUBLIC_FORM_FIELDS,
  type PublicFormSubmission,
} from "@/lib/event-form";

const base: PublicFormSubmission = {
  transport_mode: "flight_economy",
  distance_km: 1000,
  round_trip: true,
  diet: "standard",
  meals_count: 2,
  hotel_nights: 1,
};

describe("estimateCo2eKg", () => {
  it("flights: doubles for round-trip", () => {
    const oneWay = estimateCo2eKg({ ...base, round_trip: false });
    const round = estimateCo2eKg(base);
    // round-trip distance is 2x, so transport contribution doubles. Diet+hotel unchanged.
    const oneWayTransport = 1000 * 0.255;
    const roundTransport = 2000 * 0.255;
    expect(round - oneWay).toBeCloseTo(roundTransport - oneWayTransport, 1);
  });

  it("walk/bike → 0 transport contribution", () => {
    const v = estimateCo2eKg({
      transport_mode: "walk_bike",
      distance_km: 500,
      round_trip: true,
      diet: "standard",
      meals_count: 0,
      hotel_nights: 0,
    });
    expect(v).toBe(0);
  });

  it("vegan + walk + 0 nights → 0", () => {
    const v = estimateCo2eKg({
      transport_mode: "walk_bike",
      distance_km: 0,
      round_trip: false,
      diet: "vegan",
      meals_count: 0,
      hotel_nights: 0,
    });
    expect(v).toBe(0);
  });

  it("monotonic by meals_count for standard diet", () => {
    const a = estimateCo2eKg({ ...base, meals_count: 0 });
    const b = estimateCo2eKg({ ...base, meals_count: 5 });
    expect(b).toBeGreaterThan(a);
  });

  it("hotel nights add 13.5 kg per night", () => {
    const a = estimateCo2eKg({ ...base, hotel_nights: 0 });
    const b = estimateCo2eKg({ ...base, hotel_nights: 2 });
    expect(b - a).toBeCloseTo(2 * 13.5, 1);
  });

  it("rounds to 2 decimals", () => {
    const v = estimateCo2eKg(base);
    expect(Number.isFinite(v)).toBe(true);
    expect(Number(v.toFixed(2))).toBeCloseTo(v, 2);
  });
});

describe("validateSubmission", () => {
  it("rejects missing transport_mode", () => {
    const r = validateSubmission({ ...base, transport_mode: undefined as unknown as PublicFormSubmission["transport_mode"] });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("REQUIRED_FIELD");
  });

  it("rejects missing diet", () => {
    const r = validateSubmission({ ...base, diet: undefined as unknown as PublicFormSubmission["diet"] });
    expect(r.ok).toBe(false);
    expect(r.errorCode).toBe("REQUIRED_FIELD");
  });

  it("rejects out-of-range distance", () => {
    expect(validateSubmission({ ...base, distance_km: -5 }).errorCode).toBe(
      "DISTANCE_RANGE"
    );
    expect(validateSubmission({ ...base, distance_km: 1_000_000 }).errorCode).toBe(
      "DISTANCE_RANGE"
    );
  });

  it("rejects out-of-range meals", () => {
    expect(validateSubmission({ ...base, meals_count: 999 }).errorCode).toBe(
      "MEALS_RANGE"
    );
  });

  it("rejects out-of-range hotel nights", () => {
    expect(validateSubmission({ ...base, hotel_nights: 9999 }).errorCode).toBe(
      "NIGHTS_RANGE"
    );
  });

  it("rejects malformed email", () => {
    expect(
      validateSubmission({ ...base, attendee_email: "not-an-email" }).errorCode
    ).toBe("INVALID_FORMAT");
  });

  it("accepts valid submission", () => {
    expect(validateSubmission(base).ok).toBe(true);
  });
});

describe("scopeForSubmission", () => {
  it("always Scope 3", () => {
    expect(scopeForSubmission()).toBe("Scope 3");
  });
});

describe("DEFAULT_PUBLIC_FORM_FIELDS", () => {
  it("has 7 default fields", () => {
    expect(DEFAULT_PUBLIC_FORM_FIELDS).toHaveLength(7);
    expect(DEFAULT_PUBLIC_FORM_FIELDS.map((f) => f.key)).toEqual([
      "attendee_email",
      "transport_mode",
      "distance_km",
      "round_trip",
      "diet",
      "meals_count",
      "hotel_nights",
    ]);
  });
});
