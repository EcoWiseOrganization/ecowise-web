import { describe, it, expect } from "vitest";
import {
  POINTS_PER_VERIFIED_LOG,
  buildLeaderboard,
  canCompleteChallenge,
  filterLogsToWindow,
  isTransferable,
} from "@/lib/gamification";
import type { GreenPointLog } from "@/types/gamification.types";

describe("POINTS_PER_VERIFIED_LOG", () => {
  it("is positive", () => {
    expect(POINTS_PER_VERIFIED_LOG).toBeGreaterThan(0);
  });
});

describe("isTransferable (BR-12)", () => {
  it("always false", () => {
    expect(isTransferable()).toBe(false);
  });
});

describe("canCompleteChallenge (BR-14)", () => {
  const challenge = {
    start_date: "2026-05-01",
    end_date: "2026-05-31",
    rules: { required_count: 3 },
  };
  it("rejects fewer than required_count", () => {
    expect(
      canCompleteChallenge({ challenge, qualifyingCount: 2 })
    ).toBe(false);
  });
  it("accepts equal to required", () => {
    expect(
      canCompleteChallenge({ challenge, qualifyingCount: 3 })
    ).toBe(true);
  });
  it("accepts more than required", () => {
    expect(
      canCompleteChallenge({ challenge, qualifyingCount: 10 })
    ).toBe(true);
  });
  it("defaults required_count to 1 when missing", () => {
    expect(
      canCompleteChallenge({
        challenge: { ...challenge, rules: {} },
        qualifyingCount: 1,
      })
    ).toBe(true);
  });
});

describe("buildLeaderboard", () => {
  const resolveName = (id: string) => ({
    display_name: `User ${id}`,
    email: `${id}@x.io`,
  });

  it("aggregates per user + sorts desc", () => {
    const rows = buildLeaderboard(
      [
        { user_id: "a", points: 10 },
        { user_id: "b", points: 60 },
        { user_id: "a", points: 20 },
        { user_id: "c", points: 50 },
      ],
      resolveName
    );
    // Totals: b=60, c=50, a=30
    expect(rows.map((r) => r.user_id)).toEqual(["b", "c", "a"]);
    expect(rows[0].total_points).toBe(60);
    expect(rows[1].total_points).toBe(50);
    expect(rows[2].total_points).toBe(30);
  });

  it("ties share rank (dense)", () => {
    const rows = buildLeaderboard(
      [
        { user_id: "a", points: 100 },
        { user_id: "b", points: 100 },
        { user_id: "c", points: 50 },
      ],
      resolveName
    );
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(1);
    expect(rows[2].rank).toBe(3);
  });

  it("empty input → empty list", () => {
    expect(buildLeaderboard([], resolveName)).toEqual([]);
  });
});

describe("filterLogsToWindow", () => {
  const logs: GreenPointLog[] = [
    {
      id: "1",
      user_id: "a",
      action: "Earn",
      points: 10,
      reason: null,
      related_id: null,
      related_type: null,
      created_at: "2026-05-01T00:00:00.000Z",
    },
    {
      id: "2",
      user_id: "a",
      action: "Earn",
      points: 5,
      reason: null,
      related_id: null,
      related_type: null,
      created_at: "2026-05-15T00:00:00.000Z",
    },
    {
      id: "3",
      user_id: "b",
      action: "Earn",
      points: 7,
      reason: null,
      related_id: null,
      related_type: null,
      created_at: "2026-04-01T00:00:00.000Z",
    },
  ];
  it("keeps only logs inside window", () => {
    const out = filterLogsToWindow(
      logs,
      "2026-05-01T00:00:00.000Z",
      "2026-05-31T23:59:59.000Z"
    );
    expect(out).toHaveLength(2);
    expect(out.map((l) => l.id).sort()).toEqual(["1", "2"]);
  });
});
