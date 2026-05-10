import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * The profile actions are server actions ("use server"). To unit-test them
 * we mock the Supabase client + auth helpers and import via vi.resetModules.
 */

type Membership = { user_id: string; role_id: string; status: string; org_id: string };

function makeStub(opts: {
  user?: { id: string; is_admin: boolean; email: string } | null;
  /** rows returned for OrganizationMembers SELECT (admin queries) */
  adminMemberships?: Membership[];
  /** count returned for OrganizationMembers HEAD count queries (other admins) */
  otherAdminCount?: number;
  /** simulate User table update success */
  updateUserError?: { message: string } | null;
  /** simulate User row read */
  userRow?: Record<string, unknown> | null;
  /** simulate logs read */
  logsRows?: Array<{ co2e_result: number | null }>;
}) {
  type Filter = { col: string; val: unknown; op: "eq" | "neq" };
  return {
    from(table: string) {
      const filters: Filter[] = [];
      // Single self-referencing builder so chained .select().eq().eq() preserves
      // the thenable used by `await`.
      const builder: Record<string, unknown> = {};
      Object.assign(builder, {
        select: () => builder,
        update: () => builder,
        insert: () => builder,
        eq: (col: string, val: unknown) => {
          filters.push({ col, val, op: "eq" });
          return builder;
        },
        neq: (col: string, val: unknown) => {
          filters.push({ col, val, op: "neq" });
          return builder;
        },
        single: async () => {
          if (table === "User") {
            return {
              data: opts.userRow ?? null,
              error: opts.userRow ? null : { message: "Not found" },
            };
          }
          return { data: null, error: null };
        },
        maybeSingle: async () => ({ data: null, error: null }),
        then: (resolve: (v: unknown) => void) => {
          if (table === "OrganizationMembers") {
            const isHeadCount = filters.some(
              (f) => f.op === "neq" && f.col === "user_id"
            );
            if (isHeadCount) {
              return resolve({
                data: null,
                error: null,
                count: opts.otherAdminCount ?? 0,
              });
            }
            return resolve({
              data: opts.adminMemberships ?? [],
              error: null,
            });
          }
          if (table === "EmissionLogs") {
            return resolve({
              data: opts.logsRows ?? [],
              error: null,
              count: (opts.logsRows ?? []).length,
            });
          }
          if (table === "User") {
            return resolve({
              data: opts.userRow ?? null,
              error: opts.updateUserError ?? null,
            });
          }
          return resolve({ data: null, error: null });
        },
      });
      return builder;
    },
    auth: {
      getUser: async () => ({
        data: {
          user: opts.user ? { id: opts.user.id, email: opts.user.email } : null,
        },
      }),
    },
  };
}

async function loadActions(state: Parameters<typeof makeStub>[0]) {
  vi.resetModules();
  const stub = makeStub(state);

  vi.doMock("@/lib/supabase/server", () => ({
    createClient: async () => stub,
  }));
  vi.doMock("@/lib/supabase/service", () => ({
    createServiceClient: () => stub,
  }));
  vi.doMock("@/lib/supabase/admin", () => ({
    createAdminClient: () => ({
      auth: {
        admin: {
          deleteUser: async () => ({ error: null }),
        },
      },
    }),
  }));
  // Avoid revalidatePath / headers calls failing in test
  vi.doMock("next/cache", () => ({ revalidatePath: () => {} }));
  vi.doMock("next/headers", () => ({
    headers: async () => new Map<string, string>(),
    cookies: async () => ({ getAll: () => [], set: () => {} }),
  }));
  vi.doMock("@/services/audit.service", () => ({
    writeAuditLog: async () => "audit-id",
    writeAuthAuditLog: async () => "audit-id",
    searchAuditLogs: async () => ({ data: [], count: 0 }),
  }));

  return await import("@/app/actions/profile.actions");
}

describe("isOnlyAdminOfAnyOrg via deleteMyAccountAction", () => {
  beforeEach(() => vi.resetModules());

  it("blocks when last admin", async () => {
    const actions = await loadActions({
      user: { id: "u1", is_admin: false, email: "x@y.io" },
      adminMemberships: [
        { user_id: "u1", role_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", status: "Active", org_id: "org-1" },
      ],
      otherAdminCount: 0,
    });
    const res = await actions.deleteMyAccountAction({ confirmEmail: "x@y.io" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("MSG26");
    expect(res.blockedOrgIds).toEqual(["org-1"]);
  });

  it("rejects wrong email confirm", async () => {
    const actions = await loadActions({
      user: { id: "u1", is_admin: false, email: "x@y.io" },
    });
    const res = await actions.deleteMyAccountAction({ confirmEmail: "WRONG@y.io" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("MSG02");
  });

  it("requires session", async () => {
    const actions = await loadActions({ user: null });
    const res = await actions.deleteMyAccountAction({ confirmEmail: "x@y.io" });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("AUTH_REQUIRED");
  });
});

describe("changePasswordAction validation", () => {
  it("rejects mismatch", async () => {
    const actions = await loadActions({
      user: { id: "u1", is_admin: false, email: "x@y.io" },
    });
    const res = await actions.changePasswordAction({
      oldPassword: "abc",
      newPassword: "Aa1aa1aa",
      confirmPassword: "different1",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("MSG22B");
  });

  it("rejects weak policy", async () => {
    const actions = await loadActions({
      user: { id: "u1", is_admin: false, email: "x@y.io" },
    });
    const res = await actions.changePasswordAction({
      oldPassword: "abc",
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("MSG20");
  });

  it("requires session", async () => {
    const actions = await loadActions({ user: null });
    const res = await actions.changePasswordAction({
      oldPassword: "abc",
      newPassword: "Abcdef12",
      confirmPassword: "Abcdef12",
    });
    expect(res.ok).toBe(false);
    expect(res.error).toBe("AUTH_REQUIRED");
  });
});

describe("updateMyProfileAction validation", () => {
  it("rejects bad phone", async () => {
    const actions = await loadActions({
      user: { id: "u1", is_admin: false, email: "x@y.io" },
    });
    const res = await actions.updateMyProfileAction({ phone: "12" });
    expect(res.error).toBe("MSG02");
  });
});
