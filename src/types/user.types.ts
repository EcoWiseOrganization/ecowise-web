/**
 * `User.status` is constrained at the DB level (CHECK in migration 001
 * / 006). Promoting it to a string union catches typos like `if
 * (user.status === "Active")` at compile time instead of letting them
 * silently mis-match the lowercase DB values.
 *
 * Rows ingested from the wild (audit dumps, test fixtures, old data)
 * may carry unexpected values — service-layer code should still handle
 * a fallback gracefully rather than crash on type assertion.
 */
export type UserStatus = "active" | "pending" | "deleted";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  user_name: string | null;
  is_admin: boolean;
  status: UserStatus;
  green_points: number;
  created_at: string;
  // Phase 1 additions (migration 006)
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
  deleted_at: string | null;
}

export interface UpdateProfileInput {
  full_name?: string;
  user_name?: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
}

/** Aggregated sustainability stats shown on the profile screen. */
export interface SustainabilityStats {
  /** Total CO2e logged by this user across all orgs (kg). */
  totalCo2eKg: number;
  /** Number of activity logs created by this user. */
  totalLogs: number;
  /** Green points balance. */
  greenPoints: number;
  /** Tier label derived from green_points (Bronze/Silver/Gold/Platinum). */
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
}
