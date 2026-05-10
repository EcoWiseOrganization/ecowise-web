export interface User {
  id: string;
  email: string;
  full_name: string | null;
  user_name: string | null;
  is_admin: boolean;
  status: string;
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
