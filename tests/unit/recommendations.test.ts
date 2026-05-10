import { describe, it, expect } from "vitest";
import { buildRecommendations } from "@/lib/recommendations";

describe("buildRecommendations", () => {
  it("returns onboarding tip when empty", () => {
    const r = buildRecommendations([]);
    expect(r).toHaveLength(1);
    expect(r[0].titleKey).toBe("reco.onboarding.title");
  });

  it("ignores zero-share categories", () => {
    const r = buildRecommendations([{ name: "Travel", co2eKg: 0 }]);
    expect(r).toHaveLength(0);
  });

  it("matches electricity rule", () => {
    const r = buildRecommendations([{ name: "Electricity", co2eKg: 100 }]);
    expect(r[0].titleKey).toBe("reco.electric.title");
    expect(r[0].estimatedSavingKg).toBeCloseTo(20);
  });

  it("matches travel rule", () => {
    const r = buildRecommendations([{ name: "Business Travel", co2eKg: 100 }]);
    expect(r[0].titleKey).toBe("reco.travel.title");
  });

  it("matches diet rule", () => {
    const r = buildRecommendations([{ name: "Food / Diet", co2eKg: 50 }]);
    expect(r[0].titleKey).toBe("reco.diet.title");
  });

  it("falls back to general", () => {
    const r = buildRecommendations([{ name: "Random Source", co2eKg: 50 }]);
    expect(r[0].titleKey).toBe("reco.general.title");
  });

  it("returns top 3 only", () => {
    const r = buildRecommendations([
      { name: "Electricity", co2eKg: 100 },
      { name: "Business Travel", co2eKg: 80 },
      { name: "Food", co2eKg: 60 },
      { name: "Other Source", co2eKg: 40 },
    ]);
    expect(r).toHaveLength(3);
    expect(r[0].category).toBe("Electricity");
  });

  it("Vietnamese category names also match", () => {
    const r = buildRecommendations([{ name: "Tiêu thụ Điện", co2eKg: 50 }]);
    expect(r[0].titleKey).toBe("reco.electric.title");
  });
});
