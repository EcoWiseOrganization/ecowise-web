import { describe, it, expect } from "vitest";
import {
  targetProgress,
  exceedsDailyLogLimit,
  PERSONAL_DAILY_LOG_LIMIT,
} from "@/lib/targets";

const start = new Date("2026-01-01");
const end = new Date("2026-12-31");
const mid = new Date("2026-07-02");

describe("targetProgress", () => {
  it("0% when current equals baseline", () => {
    const r = targetProgress({
      baseline: 1000,
      target: 500,
      current: 1000,
      startDate: start,
      endDate: end,
      now: mid,
    });
    expect(r.progressPct).toBeCloseTo(0);
    expect(r.onTrack).toBe(false);
  });

  it("100% when current equals target", () => {
    const r = targetProgress({
      baseline: 1000,
      target: 500,
      current: 500,
      startDate: start,
      endDate: end,
      now: mid,
    });
    expect(r.progressPct).toBeCloseTo(1);
    expect(r.onTrack).toBe(true);
  });

  it("can exceed 100% when over-achieving", () => {
    const r = targetProgress({
      baseline: 1000,
      target: 500,
      current: 100,
      startDate: start,
      endDate: end,
      now: mid,
    });
    expect(r.progressPct).toBeGreaterThan(1);
    expect(r.onTrack).toBe(true);
  });

  it("clamps lower bound at -1 when way over baseline", () => {
    const r = targetProgress({
      baseline: 1000,
      target: 500,
      current: 99999,
      startDate: start,
      endDate: end,
      now: mid,
    });
    expect(r.progressPct).toBe(-1);
  });

  it("baseline equals target → 1 if met, 0 otherwise", () => {
    const met = targetProgress({
      baseline: 100,
      target: 100,
      current: 90,
      startDate: start,
      endDate: end,
      now: mid,
    });
    expect(met.progressPct).toBe(1);
    const notMet = targetProgress({
      baseline: 100,
      target: 100,
      current: 110,
      startDate: start,
      endDate: end,
      now: mid,
    });
    expect(notMet.progressPct).toBe(0);
  });

  it("elapsed/total counted in days", () => {
    const r = targetProgress({
      baseline: 100,
      target: 50,
      current: 75,
      startDate: start,
      endDate: end,
      now: mid,
    });
    expect(r.totalDays).toBe(364);
    expect(r.elapsedDays).toBeGreaterThan(180);
    expect(r.elapsedDays).toBeLessThan(190);
  });
});

describe("exceedsDailyLogLimit", () => {
  it("default limit", () => {
    expect(exceedsDailyLogLimit(0)).toBe(false);
    expect(exceedsDailyLogLimit(PERSONAL_DAILY_LOG_LIMIT - 1)).toBe(false);
    expect(exceedsDailyLogLimit(PERSONAL_DAILY_LOG_LIMIT)).toBe(true);
    expect(exceedsDailyLogLimit(PERSONAL_DAILY_LOG_LIMIT + 1)).toBe(true);
  });

  it("custom limit", () => {
    expect(exceedsDailyLogLimit(4, 5)).toBe(false);
    expect(exceedsDailyLogLimit(5, 5)).toBe(true);
  });
});
