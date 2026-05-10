import { describe, it, expect } from "vitest";
import { isEmail, isHoneypotClean, trimToMax } from "@/lib/validators";

describe("isEmail", () => {
  it("accepts standard", () => {
    expect(isEmail("a@b.io")).toBe(true);
    expect(isEmail("first.last+tag@sub.example.com")).toBe(true);
  });
  it("rejects malformed", () => {
    expect(isEmail("plain")).toBe(false);
    expect(isEmail("a@b")).toBe(false);
    expect(isEmail("@b.io")).toBe(false);
    expect(isEmail("a b@c.io")).toBe(false);
  });
});

describe("isHoneypotClean", () => {
  it("empty/undefined are clean", () => {
    expect(isHoneypotClean(undefined)).toBe(true);
    expect(isHoneypotClean(null)).toBe(true);
    expect(isHoneypotClean("")).toBe(true);
    expect(isHoneypotClean("   ")).toBe(true);
  });
  it("populated is dirty", () => {
    expect(isHoneypotClean("https://spam")).toBe(false);
    expect(isHoneypotClean("anything")).toBe(false);
  });
});

describe("trimToMax", () => {
  it("trims surrounding whitespace", () => {
    expect(trimToMax("  hi  ", 100)).toBe("hi");
  });
  it("respects max", () => {
    expect(trimToMax("abcdefg", 3)).toBe("abc");
  });
});
