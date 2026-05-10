import { describe, it, expect } from "vitest";
import {
  buildCategoryShares,
  buildGhgChecklist,
  buildLogRows,
  buildMonthlyTrend,
  buildSummary,
  type RawLogRow,
} from "@/lib/report-aggregator";
import type { EmissionReportData } from "@/types/report.types";

const rows: RawLogRow[] = [
  {
    id: "1",
    activity_name: "Office electricity",
    scope: "Scope 2",
    reporting_date: "2026-01-12",
    quantity: 100,
    unit: "kWh",
    co2e_result: 55.71,
    status: "Verified",
    category_name: "Electricity",
    created_by_email: "alice@test.io",
  },
  {
    id: "2",
    activity_name: "Business flight",
    scope: "Scope 3",
    reporting_date: "2026-01-25",
    quantity: 1000,
    unit: "km",
    co2e_result: 255,
    status: "Pending",
    category_name: "Business Travel",
    created_by_email: "bob@test.io",
  },
  {
    id: "3",
    activity_name: "Plant fuel",
    scope: "Scope 1",
    reporting_date: "2026-02-03",
    quantity: 200,
    unit: "L",
    co2e_result: 480,
    status: "Verified",
    category_name: "Fuel Combustion",
    created_by_email: "carol@test.io",
  },
];

describe("buildSummary", () => {
  it("totals + per-scope + status counts", () => {
    const s = buildSummary(rows);
    expect(s.totalCo2eKg).toBeCloseTo(55.71 + 255 + 480, 2);
    expect(s.scope1Kg).toBe(480);
    expect(s.scope2Kg).toBeCloseTo(55.71, 2);
    expect(s.scope3Kg).toBe(255);
    expect(s.logCount).toBe(3);
    expect(s.verifiedCount).toBe(2);
    expect(s.pendingCount).toBe(1);
    expect(s.completenessPct).toBe(67); // 2/3
  });

  it("empty rows", () => {
    const s = buildSummary([]);
    expect(s.totalCo2eKg).toBe(0);
    expect(s.completenessPct).toBe(0);
  });

  it("Published/Exported count as verified", () => {
    const s = buildSummary([
      { ...rows[0], status: "Published" },
      { ...rows[1], status: "Exported" },
    ]);
    expect(s.verifiedCount).toBe(2);
    expect(s.pendingCount).toBe(0);
  });
});

describe("buildMonthlyTrend", () => {
  it("groups by YYYY-MM and sorts", () => {
    const t = buildMonthlyTrend(rows);
    expect(t).toHaveLength(2);
    expect(t[0].month).toBe("2026-01");
    expect(t[0].total_co2e_kg).toBeCloseTo(55.71 + 255, 2);
    expect(t[0].log_count).toBe(2);
    expect(t[1].month).toBe("2026-02");
    expect(t[1].total_co2e_kg).toBe(480);
  });

  it("empty", () => {
    expect(buildMonthlyTrend([])).toEqual([]);
  });
});

describe("buildCategoryShares", () => {
  it("computes share % to one decimal", () => {
    const c = buildCategoryShares(rows);
    expect(c).toHaveLength(3);
    const total = 55.71 + 255 + 480;
    const fuel = c.find((x) => x.name === "Fuel Combustion")!;
    expect(fuel.co2e_kg).toBe(480);
    expect(fuel.share_pct).toBe(Math.round((480 / total) * 1000) / 10);
  });

  it("zero total → empty", () => {
    expect(
      buildCategoryShares([{ ...rows[0], co2e_result: 0 }])
    ).toEqual([]);
  });

  it("falls back category to Other", () => {
    const c = buildCategoryShares([
      { ...rows[0], category_name: null },
    ]);
    expect(c[0].name).toBe("Other");
  });
});

describe("buildLogRows", () => {
  it("rounds co2e to 2 decimals + preserves order", () => {
    const out = buildLogRows(rows);
    expect(out).toHaveLength(3);
    expect(out[0].co2e_result).toBeCloseTo(55.71, 2);
    expect(out[1].activity_name).toBe("Business flight");
  });
});

describe("buildGhgChecklist", () => {
  const baseData = (over: Partial<EmissionReportData["summary"]> = {}): EmissionReportData => ({
    org: { id: "o", legal_name: "Org", org_type: null, industry: null },
    period: { start: "2026-01-01", end: "2026-12-31" },
    language: "en",
    generatedAt: "2026-01-01T00:00:00.000Z",
    generatedBy: null,
    summary: {
      totalCo2eKg: 100,
      scope1Kg: 30,
      scope2Kg: 30,
      scope3Kg: 40,
      logCount: 10,
      verifiedCount: 9,
      pendingCount: 1,
      completenessPct: 90,
      ...over,
    },
    monthlyTrend: [],
    byCategory: [],
    logs: [],
  });

  it("all pass when complete", () => {
    const c = buildGhgChecklist(baseData());
    expect(c.every((i) => i.passed)).toBe(true);
  });

  it("fails scope1/2/3 when zero", () => {
    const c = buildGhgChecklist(
      baseData({ scope1Kg: 0, scope2Kg: 0, scope3Kg: 0 })
    );
    expect(c.find((i) => i.id === "scope1")!.passed).toBe(false);
    expect(c.find((i) => i.id === "scope2")!.passed).toBe(false);
    expect(c.find((i) => i.id === "scope3")!.passed).toBe(false);
  });

  it("fails completeness when < 80%", () => {
    const c = buildGhgChecklist(baseData({ completenessPct: 50 }));
    expect(c.find((i) => i.id === "completeness")!.passed).toBe(false);
  });
});
