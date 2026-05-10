import { describe, it, expect } from "vitest";
import { MSG, ok, fail } from "@/lib/messages";

describe("MSG codes", () => {
  it("exposes BR-related codes", () => {
    expect(MSG.PUBLISHED_LOCK).toBe("MSG12");
    expect(MSG.LAST_ADMIN_BLOCK).toBe("MSG26");
    expect(MSG.SUBSCRIPTION_LIMIT_EMPLOYEES).toBe("MSG24");
    expect(MSG.SUBSCRIPTION_LIMIT_EVENTS).toBe("MSG25");
    expect(MSG.ANTI_SPAM_LIMIT).toBe("MSG30");
  });

  it("exposes Phase 0 auth codes", () => {
    expect(MSG.NOT_AUTHENTICATED).toBe("AUTH_REQUIRED");
    expect(MSG.NOT_SYSTEM_ADMIN).toBe("FORBIDDEN_SYSTEM_ADMIN");
    expect(MSG.NOT_ORG_MEMBER).toBe("FORBIDDEN_ORG_MEMBER");
    expect(MSG.NOT_ORG_ADMIN).toBe("FORBIDDEN_ORG_ADMIN");
  });
});

describe("ServiceResult helpers", () => {
  it("ok wraps data", () => {
    const r = ok({ a: 1 });
    expect(r.ok).toBe(true);
    expect(r.data).toEqual({ a: 1 });
    expect(r.code).toBeUndefined();
  });

  it("fail wraps code + message", () => {
    const r = fail(MSG.NOT_AUTHENTICATED, "no session");
    expect(r.ok).toBe(false);
    expect(r.code).toBe("AUTH_REQUIRED");
    expect(r.message).toBe("no session");
  });
});
