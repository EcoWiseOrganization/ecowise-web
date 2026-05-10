import { describe, it, expect } from "vitest";
import { exceedsLimit } from "@/lib/rate-limit";

const ts = (offsetSecFromNow: number) => new Date(Date.now() + offsetSecFromNow * 1000);

describe("exceedsLimit", () => {
  const cfg = { windowSec: 900, max: 5 };

  it("allows under max", () => {
    const now = new Date();
    const stamps = [-100, -200, -300, -400].map(ts);
    expect(exceedsLimit(stamps, now, cfg)).toBe(false);
  });

  it("rejects at max", () => {
    const now = new Date();
    const stamps = [-100, -200, -300, -400, -500].map(ts);
    expect(exceedsLimit(stamps, now, cfg)).toBe(true);
  });

  it("ignores stamps outside window", () => {
    const now = new Date();
    const stamps = [-100, -200, -300, -1000, -2000].map(ts);
    // -1000 and -2000 are outside the 900s window → only 3 inside
    expect(exceedsLimit(stamps, now, cfg)).toBe(false);
  });

  it("exact-window boundary inclusive", () => {
    const now = new Date();
    const stamps = [-cfg.windowSec, -cfg.windowSec + 1, -1, -2, -3].map(ts);
    // 5 stamps, all >= cutoff → at limit
    expect(exceedsLimit(stamps, now, cfg)).toBe(true);
  });
});
