/**
 * Pure rule-based eco-recommendation engine (Phase 4).
 * Maps the user's top emission categories to actionable suggestions. The
 * suggestion text is i18n-keyed so the UI can translate.
 */

export interface CategoryShare {
  /** Category name (matches "EmissionCategories"."name"). */
  name: string;
  /** Aggregated CO₂e share for this category. */
  co2eKg: number;
}

export interface Recommendation {
  /** Stable id used as React key. */
  id: string;
  /** i18n key for the suggestion title. */
  titleKey: string;
  /** i18n key for the body text. */
  bodyKey: string;
  /** Emission category that triggered this recommendation. */
  category: string;
  /** Estimated annual saving (kg CO₂e) — rough heuristic. */
  estimatedSavingKg: number;
}

/**
 * Heuristics: top 3 emission-bearing categories generate one or two tailored
 * suggestions each. If no logs exist, return a single onboarding tip.
 */
export function buildRecommendations(
  shares: CategoryShare[]
): Recommendation[] {
  if (shares.length === 0) {
    return [
      {
        id: "onboarding",
        titleKey: "reco.onboarding.title",
        bodyKey: "reco.onboarding.body",
        category: "—",
        estimatedSavingKg: 0,
      },
    ];
  }

  const top = [...shares]
    .filter((c) => c.co2eKg > 0)
    .sort((a, b) => b.co2eKg - a.co2eKg)
    .slice(0, 3);

  const result: Recommendation[] = [];
  for (const c of top) {
    const lower = c.name.toLowerCase();
    if (lower.includes("electric") || lower.includes("điện")) {
      result.push({
        id: `electric-${c.name}`,
        category: c.name,
        titleKey: "reco.electric.title",
        bodyKey: "reco.electric.body",
        estimatedSavingKg: c.co2eKg * 0.2,
      });
    } else if (
      lower.includes("travel") ||
      lower.includes("transport") ||
      lower.includes("di chuyển")
    ) {
      result.push({
        id: `travel-${c.name}`,
        category: c.name,
        titleKey: "reco.travel.title",
        bodyKey: "reco.travel.body",
        estimatedSavingKg: c.co2eKg * 0.3,
      });
    } else if (lower.includes("fuel") || lower.includes("nhiên liệu")) {
      result.push({
        id: `fuel-${c.name}`,
        category: c.name,
        titleKey: "reco.fuel.title",
        bodyKey: "reco.fuel.body",
        estimatedSavingKg: c.co2eKg * 0.15,
      });
    } else if (
      lower.includes("food") ||
      lower.includes("diet") ||
      lower.includes("ăn")
    ) {
      result.push({
        id: `diet-${c.name}`,
        category: c.name,
        titleKey: "reco.diet.title",
        bodyKey: "reco.diet.body",
        estimatedSavingKg: c.co2eKg * 0.25,
      });
    } else {
      result.push({
        id: `general-${c.name}`,
        category: c.name,
        titleKey: "reco.general.title",
        bodyKey: "reco.general.body",
        estimatedSavingKg: c.co2eKg * 0.1,
      });
    }
  }
  return result;
}
