import { describe, it, expect } from "vitest";
import { tierFromPoints, isValidPasswordPolicy, isValidPhone } from "@/lib/profile";

describe("tierFromPoints", () => {
  it("Bronze < 500", () => {
    expect(tierFromPoints(0)).toBe("Bronze");
    expect(tierFromPoints(499)).toBe("Bronze");
  });
  it("Silver 500-1499", () => {
    expect(tierFromPoints(500)).toBe("Silver");
    expect(tierFromPoints(1499)).toBe("Silver");
  });
  it("Gold 1500-4999", () => {
    expect(tierFromPoints(1500)).toBe("Gold");
    expect(tierFromPoints(4999)).toBe("Gold");
  });
  it("Platinum 5000+", () => {
    expect(tierFromPoints(5000)).toBe("Platinum");
    expect(tierFromPoints(99999)).toBe("Platinum");
  });
});

describe("isValidPasswordPolicy", () => {
  it("rejects short", () => {
    expect(isValidPasswordPolicy("a1b")).toBe(false);
  });
  it("rejects letter-only", () => {
    expect(isValidPasswordPolicy("abcdefgh")).toBe(false);
  });
  it("rejects digit-only", () => {
    expect(isValidPasswordPolicy("12345678")).toBe(false);
  });
  it("accepts mixed", () => {
    expect(isValidPasswordPolicy("Abcd1234")).toBe(true);
    expect(isValidPasswordPolicy("hello123")).toBe(true);
  });
  it("rejects non-string", () => {
    // @ts-expect-error testing runtime behaviour
    expect(isValidPasswordPolicy(undefined)).toBe(false);
  });
});

describe("isValidPhone", () => {
  it("empty allowed (optional)", () => {
    expect(isValidPhone("")).toBe(true);
  });
  it("9-15 digits allowed", () => {
    expect(isValidPhone("0901234567")).toBe(true);
    expect(isValidPhone("+84 901 234 567")).toBe(true);
  });
  it("rejects too few", () => {
    expect(isValidPhone("12345")).toBe(false);
  });
  it("rejects too many", () => {
    expect(isValidPhone("1234567890123456")).toBe(false);
  });
});
