import { describe, it, expect, vi, beforeEach } from "vitest";
import { ROLE_ADMIN_ID, ROLE_MEMBER_ID } from "@/lib/roles";

// Build a tiny chainable mock for the supabase service client.
type Row = Record<string, unknown> | null;

function makeServiceMock(opts: {
  user?: { id: string; is_admin: boolean } | null;
  membership?: { role_id: string; status: string } | null;
  membershipError?: { message: string } | null;
}) {
  const supabaseStub = {
    from(table: string) {
      const result: { data: Row; error: Row } = { data: null, error: null };
      if (table === "User") {
        result.data = opts.user ? { is_admin: opts.user.is_admin } : null;
      } else if (table === "OrganizationMembers") {
        result.data = opts.membership ?? null;
        result.error = opts.membershipError ?? null;
      }
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: () => Promise.resolve(result),
        single: () => Promise.resolve(result),
      };
      return builder;
    },
    auth: {
      getUser: async () =>
        ({
          data: {
            user: opts.user ? { id: opts.user.id, email: "test@x.io" } : null,
          },
        }),
    },
  };
  return supabaseStub;
}

// We reset the modules between tests so we can re-mock with different impls.
async function loadRolesWith(state: {
  user?: { id: string; is_admin: boolean } | null;
  membership?: { role_id: string; status: string } | null;
  membershipError?: { message: string } | null;
}) {
  vi.resetModules();
  const stub = makeServiceMock(state);

  vi.doMock("@/lib/supabase/server", () => ({
    createClient: async () => stub,
  }));
  vi.doMock("@/lib/supabase/service", () => ({
    createServiceClient: () => stub,
  }));

  return await import("@/lib/auth/roles");
}

describe("requireSession", () => {
  beforeEach(() => vi.resetModules());

  it("throws AuthError when no session", async () => {
    const roles = await loadRolesWith({ user: null });
    await expect(roles.requireSession()).rejects.toMatchObject({
      code: "AUTH_REQUIRED",
      httpStatus: 401,
    });
  });

  it("returns context when authenticated", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: false },
    });
    const ctx = await roles.requireSession();
    expect(ctx.userId).toBe("u1");
    expect(ctx.isSystemAdmin).toBe(false);
  });
});

describe("requireSystemAdmin", () => {
  it("throws when not admin", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: false },
    });
    await expect(roles.requireSystemAdmin()).rejects.toMatchObject({
      code: "FORBIDDEN_SYSTEM_ADMIN",
    });
  });

  it("passes when is_admin true", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: true },
    });
    const ctx = await roles.requireSystemAdmin();
    expect(ctx.isSystemAdmin).toBe(true);
  });
});

describe("requireOrgRole", () => {
  it("throws when no orgId", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: false },
    });
    await expect(roles.requireOrgRole("")).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });

  it("throws when no membership", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: false },
      membership: null,
    });
    await expect(roles.requireOrgRole("org-1")).rejects.toMatchObject({
      code: "FORBIDDEN_ORG_MEMBER",
    });
  });

  it("throws when membership Pending", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: false },
      membership: { role_id: ROLE_MEMBER_ID, status: "Pending" },
    });
    await expect(roles.requireOrgRole("org-1")).rejects.toMatchObject({
      code: "FORBIDDEN_ORG_MEMBER",
    });
  });

  it("returns context for active member", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: false },
      membership: { role_id: ROLE_MEMBER_ID, status: "Active" },
    });
    const ctx = await roles.requireOrgRole("org-1");
    expect(ctx.isOrgAdmin).toBe(false);
    expect(ctx.status).toBe("Active");
  });

  it("rejects member when adminOnly", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: false },
      membership: { role_id: ROLE_MEMBER_ID, status: "Active" },
    });
    await expect(
      roles.requireOrgRole("org-1", { adminOnly: true })
    ).rejects.toMatchObject({ code: "FORBIDDEN_ORG_ADMIN" });
  });

  it("accepts admin when adminOnly", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: false },
      membership: { role_id: ROLE_ADMIN_ID, status: "Active" },
    });
    const ctx = await roles.requireOrgRole("org-1", { adminOnly: true });
    expect(ctx.isOrgAdmin).toBe(true);
  });

  it("allowSystemAdmin bypass without membership", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: true },
      membership: null,
    });
    const ctx = await roles.requireOrgRole("org-1", {
      allowSystemAdmin: true,
    });
    expect(ctx.isSystemAdmin).toBe(true);
    expect(ctx.isOrgAdmin).toBe(true);
  });

  it("does NOT bypass for system admin without flag", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: true },
      membership: null,
    });
    await expect(roles.requireOrgRole("org-1")).rejects.toMatchObject({
      code: "FORBIDDEN_ORG_MEMBER",
    });
  });
});

describe("actor role labels", () => {
  it("guest when no session", async () => {
    const roles = await loadRolesWith({ user: null });
    expect(roles.actorRoleFromUser(null)).toBe("guest");
  });

  it("system_admin", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: true },
    });
    expect(
      roles.actorRoleFromUser({
        userId: "u1",
        email: null,
        isSystemAdmin: true,
      })
    ).toBe("system_admin");
  });

  it("individual default", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: false },
    });
    expect(
      roles.actorRoleFromUser({
        userId: "u1",
        email: null,
        isSystemAdmin: false,
      })
    ).toBe("individual");
  });

  it("org_admin from membership", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: false },
    });
    expect(
      roles.actorRoleFromMembership({
        userId: "u1",
        email: null,
        isSystemAdmin: false,
        orgId: "o1",
        roleId: ROLE_ADMIN_ID,
        isOrgAdmin: true,
        status: "Active",
      })
    ).toBe("org_admin");
  });

  it("employee from membership", async () => {
    const roles = await loadRolesWith({
      user: { id: "u1", is_admin: false },
    });
    expect(
      roles.actorRoleFromMembership({
        userId: "u1",
        email: null,
        isSystemAdmin: false,
        orgId: "o1",
        roleId: ROLE_MEMBER_ID,
        isOrgAdmin: false,
        status: "Active",
      })
    ).toBe("employee");
  });
});
