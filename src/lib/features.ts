import "server-only";
import { getCurrentSubscription } from "@/services/subscription.service";

/**
 * Feature gating for B2C subscriptions.
 *
 * Each subscription plan (migration 012) carries a `features` JSON array
 * shaped like `[{ key: "advanced_reports", label: "…" }, ...]`. A user
 * "has" a feature if their currently-active subscription's plan includes
 * the matching key. Users without an active sub are treated as Free.
 *
 * Per PENDING.md §6 the product gating policy isn't fully decided yet —
 * this helper is the single source of truth so any gate added later just
 * passes a new key and the code path becomes consistent.
 *
 * Known gated keys (per the seed plans):
 *   - personal_logs      (B2C_FREE + B2C_PLUS)
 *   - basic_targets      (B2C_FREE + B2C_PLUS)
 *   - advanced_reports   (B2C_PLUS only — PDF/Excel/CSV export)
 *   - recommendations    (B2C_PLUS only — personalised tips)
 *
 * Returns `true` when the user is entitled. Conservatively returns `false`
 * on any lookup failure so a transient DB blip never up-grades a Free
 * user into a Plus feature.
 */
export async function userHasFeature(
  userId: string,
  featureKey: string,
): Promise<boolean> {
  try {
    const sub = await getCurrentSubscription("User", userId);
    if (!sub?.plan) return false;
    const features = (sub.plan.features ?? []) as Array<{ key?: unknown }>;
    return features.some((f) => typeof f?.key === "string" && f.key === featureKey);
  } catch (err) {
    console.warn("[features] lookup failed", { userId, featureKey, err });
    return false;
  }
}

/** Throwable wrapper for use inside server actions / route handlers. */
export class FeatureRequiredError extends Error {
  code = "PLAN_FEATURE_REQUIRED" as const;
  constructor(public featureKey: string) {
    super(`Feature ${featureKey} requires an upgraded plan`);
  }
}

export async function requireFeature(
  userId: string,
  featureKey: string,
): Promise<void> {
  const ok = await userHasFeature(userId, featureKey);
  if (!ok) throw new FeatureRequiredError(featureKey);
}
