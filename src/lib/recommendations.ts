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
 * Category→recommendation matcher table. Each entry pairs a list of
 * lowercase substring aliases (EN + VI) with the recommendation
 * template + an empirical savings ratio. Order matters: the first
 * matching alias wins — put more specific aliases above generic ones
 * (e.g. "refrigerant" before "supply").
 *
 * Aliases cover the seeded EmissionCategories from migrations 002
 * (Electricity, Business Travel, Fuel Combustion, Supply Chain
 * Spend) plus reasonable future expansions an Org Admin might add
 * under Phase 11 (Waste, Water, Heat, Refrigerants, Food / Diet).
 * Anything still unmatched falls through to the general bucket so
 * recommendations are at least present for every top category.
 */
interface MatcherRule {
  id: string;
  aliases: string[];
  titleKey: string;
  bodyKey: string;
  savingFraction: number;
}

const MATCHERS: MatcherRule[] = [
  {
    id: "electric",
    aliases: ["electric", "electricity", "grid", "điện"],
    titleKey: "reco.electric.title",
    bodyKey: "reco.electric.body",
    savingFraction: 0.2,
  },
  {
    id: "travel",
    aliases: [
      "travel",
      "transport",
      "commute",
      "flight",
      "vehicle",
      "di chuyển",
      "chuyến bay",
      "đi lại",
    ],
    titleKey: "reco.travel.title",
    bodyKey: "reco.travel.body",
    savingFraction: 0.3,
  },
  {
    id: "fuel",
    aliases: ["fuel", "combustion", "gasoline", "petrol", "diesel", "nhiên liệu", "xăng dầu"],
    titleKey: "reco.fuel.title",
    bodyKey: "reco.fuel.body",
    savingFraction: 0.15,
  },
  {
    id: "diet",
    aliases: ["food", "diet", "meal", "meat", "ăn", "thực phẩm", "bữa ăn"],
    titleKey: "reco.diet.title",
    bodyKey: "reco.diet.body",
    savingFraction: 0.25,
  },
  // "refrigerant" before "supply" so a category named "Refrigerant
  // Supply" matches the more specific rule.
  {
    id: "refrigerant",
    aliases: ["refrigerant", "hfc", "leak", "môi chất"],
    titleKey: "reco.refrigerant.title",
    bodyKey: "reco.refrigerant.body",
    savingFraction: 0.2,
  },
  {
    id: "waste",
    aliases: ["waste", "landfill", "trash", "rác", "chất thải"],
    titleKey: "reco.waste.title",
    bodyKey: "reco.waste.body",
    savingFraction: 0.15,
  },
  {
    id: "water",
    aliases: ["water", "wastewater", "nước"],
    titleKey: "reco.water.title",
    bodyKey: "reco.water.body",
    savingFraction: 0.1,
  },
  {
    id: "heat",
    aliases: ["heat", "steam", "boiler", "natural gas", "nhiệt", "gas"],
    titleKey: "reco.heat.title",
    bodyKey: "reco.heat.body",
    savingFraction: 0.15,
  },
  {
    id: "supply",
    aliases: ["supply", "procurement", "spend", "vendor", "chuỗi cung", "mua sắm"],
    titleKey: "reco.supply.title",
    bodyKey: "reco.supply.body",
    savingFraction: 0.1,
  },
];

function findMatcher(categoryName: string): MatcherRule | null {
  const lower = categoryName.toLowerCase();
  for (const rule of MATCHERS) {
    if (rule.aliases.some((alias) => lower.includes(alias))) return rule;
  }
  return null;
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

  return top.map((c) => {
    const matched = findMatcher(c.name);
    if (matched) {
      return {
        id: `${matched.id}-${c.name}`,
        category: c.name,
        titleKey: matched.titleKey,
        bodyKey: matched.bodyKey,
        estimatedSavingKg: c.co2eKg * matched.savingFraction,
      };
    }
    return {
      id: `general-${c.name}`,
      category: c.name,
      titleKey: "reco.general.title",
      bodyKey: "reco.general.body",
      estimatedSavingKg: c.co2eKg * 0.1,
    };
  });
}
