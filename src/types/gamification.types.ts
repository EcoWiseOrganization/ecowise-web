export type ChallengeStatus =
  | "Draft"
  | "Upcoming"
  | "Active"
  | "Completed"
  | "Archived";

export type ChallengeVerification = "Photo" | "Honor" | "Auto";

export type UserChallengeStatus =
  | "Joined"
  | "InProgress"
  | "PendingReview"
  | "Completed"
  | "Failed";

export type RewardStatus = "Active" | "LowStock" | "Inactive";
export type RewardFulfillment = "Digital" | "Physical" | "Donation";
export type RedemptionStatus = "Pending" | "Fulfilled" | "Canceled";
export type GreenPointAction = "Earn" | "Spend" | "Adjust";

export interface Challenge {
  id: string;
  org_id: string | null;
  name: string;
  category: string;
  target_audience: string;
  description: string | null;
  rules: Record<string, unknown>;
  points_reward: number;
  duration_days: number;
  verification_method: ChallengeVerification;
  status: ChallengeStatus;
  start_date: string;
  end_date: string;
  image_url?: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface UpsertChallengeInput {
  name: string;
  category: string;
  target_audience?: string;
  description?: string;
  rules?: Record<string, unknown>;
  points_reward: number;
  duration_days: number;
  verification_method?: ChallengeVerification;
  status?: ChallengeStatus;
  start_date: string;
  end_date: string;
  image_url?: string | null;
  org_id?: string | null;
}

export interface UserChallenge {
  id: string;
  user_id: string;
  challenge_id: string;
  status: UserChallengeStatus;
  progress: Record<string, unknown>;
  joined_at: string;
  completed_at: string | null;
  evidence_url?: string | null;
}

export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  criteria: Record<string, unknown>;
  created_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface Reward {
  id: string;
  name: string;
  category: string | null;
  sku: string | null;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  total_stock: number;
  fulfillment: RewardFulfillment;
  status: RewardStatus;
  created_at: string;
}

export interface UpsertRewardInput {
  name: string;
  category?: string;
  sku?: string;
  description?: string;
  image_url?: string;
  points_cost: number;
  total_stock: number;
  fulfillment?: RewardFulfillment;
  status?: RewardStatus;
}

export interface Redemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: RedemptionStatus;
  fulfillment_data: Record<string, unknown>;
  created_at: string;
}

export interface GreenPointLog {
  id: string;
  user_id: string;
  action: GreenPointAction;
  points: number;
  reason: string | null;
  related_id: string | null;
  related_type: string | null;
  created_at: string;
}

export interface LeaderboardRow {
  user_id: string;
  display_name: string;
  email: string;
  total_points: number;
  rank: number;
}
