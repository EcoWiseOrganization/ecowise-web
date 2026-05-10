/**
 * Public event-form schema + CO₂e estimator (Phase 5).
 *
 * The estimator is intentionally simple — it uses default emission factors
 * derived from DEFRA averages so guest submissions land in the org's
 * emission log without requiring the org to maintain factors per category.
 * It is overridable in the future when Phase 11 adds per-org or
 * per-event factor selection.
 */

// ── Default field schema (UC-33) ──────────────────────────────────────────

export type TransportMode =
  | "flight_economy"
  | "flight_business"
  | "car_petrol"
  | "car_ev"
  | "bus"
  | "train"
  | "motorbike"
  | "walk_bike";

export type Diet = "standard" | "vegetarian" | "vegan" | "none";

/** Submission shape — matches the default schema. */
export interface PublicFormSubmission {
  attendee_email?: string;
  transport_mode: TransportMode;
  distance_km: number;
  round_trip: boolean;
  diet: Diet;
  meals_count: number;
  hotel_nights?: number;
}

/** Field descriptor — used by the form builder to render UI. */
export interface FormFieldDescriptor {
  key: keyof PublicFormSubmission | string;
  type: "text" | "email" | "number" | "select" | "checkbox";
  labelKey: string;
  required?: boolean;
  options?: { value: string; labelKey: string }[];
  default?: string | number | boolean;
}

export const DEFAULT_PUBLIC_FORM_FIELDS: FormFieldDescriptor[] = [
  {
    key: "attendee_email",
    type: "email",
    labelKey: "publicForm.field.email",
    required: false,
  },
  {
    key: "transport_mode",
    type: "select",
    labelKey: "publicForm.field.transport",
    required: true,
    options: [
      { value: "flight_economy", labelKey: "publicForm.transport.flightEconomy" },
      { value: "flight_business", labelKey: "publicForm.transport.flightBusiness" },
      { value: "car_petrol", labelKey: "publicForm.transport.carPetrol" },
      { value: "car_ev", labelKey: "publicForm.transport.carEv" },
      { value: "bus", labelKey: "publicForm.transport.bus" },
      { value: "train", labelKey: "publicForm.transport.train" },
      { value: "motorbike", labelKey: "publicForm.transport.motorbike" },
      { value: "walk_bike", labelKey: "publicForm.transport.walkBike" },
    ],
  },
  {
    key: "distance_km",
    type: "number",
    labelKey: "publicForm.field.distance",
    required: true,
    default: 0,
  },
  {
    key: "round_trip",
    type: "checkbox",
    labelKey: "publicForm.field.roundTrip",
    default: true,
  },
  {
    key: "diet",
    type: "select",
    labelKey: "publicForm.field.diet",
    required: true,
    options: [
      { value: "standard", labelKey: "publicForm.diet.standard" },
      { value: "vegetarian", labelKey: "publicForm.diet.vegetarian" },
      { value: "vegan", labelKey: "publicForm.diet.vegan" },
      { value: "none", labelKey: "publicForm.diet.none" },
    ],
  },
  {
    key: "meals_count",
    type: "number",
    labelKey: "publicForm.field.meals",
    default: 1,
  },
  {
    key: "hotel_nights",
    type: "number",
    labelKey: "publicForm.field.hotelNights",
    default: 0,
  },
];

// ── Default emission factors (kg CO₂e per unit) ───────────────────────────

const TRANSPORT_FACTOR_PER_KM: Record<TransportMode, number> = {
  flight_economy: 0.255,
  flight_business: 0.43,
  car_petrol: 0.171,
  car_ev: 0.053,
  bus: 0.027,
  train: 0.041,
  motorbike: 0.103,
  walk_bike: 0,
};

const DIET_FACTOR_PER_MEAL: Record<Diet, number> = {
  standard: 2.5,
  vegetarian: 1.4,
  vegan: 0.9,
  none: 0,
};

const HOTEL_FACTOR_PER_NIGHT_KG = 13.5;

// ── Validation + estimation ───────────────────────────────────────────────

export interface ValidationResult {
  ok: boolean;
  errorCode?:
    | "REQUIRED_FIELD"
    | "INVALID_FORMAT"
    | "DISTANCE_RANGE"
    | "MEALS_RANGE"
    | "NIGHTS_RANGE";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSubmission(
  s: Partial<PublicFormSubmission>
): ValidationResult {
  if (!s.transport_mode) return { ok: false, errorCode: "REQUIRED_FIELD" };
  if (!s.diet) return { ok: false, errorCode: "REQUIRED_FIELD" };

  if (typeof s.distance_km !== "number" || s.distance_km < 0 || s.distance_km > 50000) {
    return { ok: false, errorCode: "DISTANCE_RANGE" };
  }
  if (
    typeof s.meals_count !== "number" ||
    s.meals_count < 0 ||
    s.meals_count > 100
  ) {
    return { ok: false, errorCode: "MEALS_RANGE" };
  }
  if (s.hotel_nights !== undefined) {
    if (
      typeof s.hotel_nights !== "number" ||
      s.hotel_nights < 0 ||
      s.hotel_nights > 365
    ) {
      return { ok: false, errorCode: "NIGHTS_RANGE" };
    }
  }
  if (s.attendee_email && !EMAIL_RE.test(s.attendee_email)) {
    return { ok: false, errorCode: "INVALID_FORMAT" };
  }
  return { ok: true };
}

/**
 * Estimate total CO₂e in kg for a public submission. Pure: easy to test.
 * Returns 0 for impossible/empty inputs.
 */
export function estimateCo2eKg(s: PublicFormSubmission): number {
  const transportFactor = TRANSPORT_FACTOR_PER_KM[s.transport_mode] ?? 0;
  const distance = (s.distance_km ?? 0) * (s.round_trip ? 2 : 1);
  const transportKg = transportFactor * distance;

  const dietFactor = DIET_FACTOR_PER_MEAL[s.diet] ?? 0;
  const mealsKg = dietFactor * (s.meals_count ?? 0);

  const hotelKg = HOTEL_FACTOR_PER_NIGHT_KG * (s.hotel_nights ?? 0);

  const total = transportKg + mealsKg + hotelKg;
  // Clamp to non-negative + round to 2 decimals.
  if (!Number.isFinite(total) || total < 0) return 0;
  return Math.round(total * 100) / 100;
}

/**
 * Returns the GHG scope that this submission predominantly belongs to. Used
 * when persisting the auto-generated EmissionLog. Travel + accommodation =
 * Scope 3 by GHG Protocol.
 */
export function scopeForSubmission(): "Scope 1" | "Scope 2" | "Scope 3" {
  return "Scope 3";
}
