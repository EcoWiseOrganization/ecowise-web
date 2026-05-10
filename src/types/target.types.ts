export type CarbonTargetStatus = "Active" | "Achieved" | "Failed" | "Archived";

export interface CarbonTarget {
  id: string;
  user_id: string | null;
  org_id: string | null;
  name: string;
  baseline_co2e: number;
  target_co2e: number;
  start_date: string;
  end_date: string;
  status: CarbonTargetStatus;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface CreateCarbonTargetInput {
  name: string;
  baseline_co2e: number;
  target_co2e: number;
  start_date: string;
  end_date: string;
  notes?: string;
}

export interface CarbonTargetWithProgress extends CarbonTarget {
  /** Sum of CO2e logged inside the target window (so far) */
  current_co2e: number;
  /** Days elapsed inside the window (clamped to [0, total]) */
  elapsed_days: number;
  /** Total days in the window */
  total_days: number;
  /**
   * Progress towards the *reduction* goal. Computed as
   * (baseline - current) / (baseline - target). Clamped to [-1, 1+].
   */
  progress_pct: number;
  /** True when current ≤ target (goal already met within window). */
  on_track: boolean;
}
