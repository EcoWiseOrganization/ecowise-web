import { describe, it, expect, vi, beforeEach } from "vitest";

type Captured = {
  inserts: unknown[];
  selectArgs: unknown[];
};

function buildSupabaseMock(opts: {
  insertError?: { message: string } | null;
  searchData?: unknown[];
  searchCount?: number;
  searchError?: { message: string } | null;
  captured: Captured;
}) {
  return {
    from(table: string) {
      const builder = {
        insert: (payload: unknown) => {
          opts.captured.inserts.push({ table, payload });
          return {
            select: () => ({
              single: async () => ({
                data: opts.insertError ? null : { id: "audit-1" },
                error: opts.insertError ?? null,
              }),
            }),
          };
        },
        select: (...args: unknown[]) => {
          opts.captured.selectArgs.push({ table, args });
          const chain = {
            order: () => chain,
            range: async () => ({
              data: opts.searchData ?? [],
              error: opts.searchError ?? null,
              count: opts.searchCount ?? 0,
            }),
            gte: () => chain,
            lte: () => chain,
            eq: () => chain,
          };
          return chain;
        },
      };
      return builder;
    },
  };
}

async function loadAuditServiceWith(state: {
  insertError?: { message: string } | null;
  searchData?: unknown[];
  searchCount?: number;
  searchError?: { message: string } | null;
}): Promise<{
  mod: typeof import("@/services/audit.service");
  captured: Captured;
}> {
  vi.resetModules();
  const captured: Captured = { inserts: [], selectArgs: [] };
  const stub = buildSupabaseMock({ ...state, captured });

  vi.doMock("@/lib/supabase/service", () => ({
    createServiceClient: () => stub,
  }));

  const mod = await import("@/services/audit.service");
  return { mod, captured };
}

describe("writeAuditLog", () => {
  beforeEach(() => vi.resetModules());

  it("inserts a row with defaults", async () => {
    const { mod, captured } = await loadAuditServiceWith({});
    const id = await mod.writeAuditLog({
      action: "create_organization",
      resourceType: "organization",
      resourceId: "org-1",
    });
    expect(id).toBe("audit-1");
    expect(captured.inserts).toHaveLength(1);
    const inserted = captured.inserts[0] as { table: string; payload: Record<string, unknown> };
    expect(inserted.table).toBe("AuditLogs");
    expect(inserted.payload.status).toBe("success");
    expect(inserted.payload.action).toBe("create_organization");
    expect(inserted.payload.resource_type).toBe("organization");
    expect(inserted.payload.resource_id).toBe("org-1");
  });

  it("returns null when insert fails (does not throw)", async () => {
    const { mod } = await loadAuditServiceWith({
      insertError: { message: "boom" },
    });
    const id = await mod.writeAuditLog({
      action: "x",
      resourceType: "auth",
    });
    expect(id).toBeNull();
  });

  it("captures actor + status + error message", async () => {
    const { mod, captured } = await loadAuditServiceWith({});
    await mod.writeAuditLog({
      action: "login_failed",
      resourceType: "auth",
      actorUserId: "u1",
      actorRole: "individual",
      status: "failure",
      errorMessage: "invalid credentials",
      ipAddress: "1.2.3.4",
      userAgent: "vitest",
    });
    const inserted = captured.inserts[0] as { payload: Record<string, unknown> };
    expect(inserted.payload.actor_user_id).toBe("u1");
    expect(inserted.payload.actor_role).toBe("individual");
    expect(inserted.payload.status).toBe("failure");
    expect(inserted.payload.error_message).toBe("invalid credentials");
    expect(inserted.payload.ip_address).toBe("1.2.3.4");
    expect(inserted.payload.user_agent).toBe("vitest");
  });
});

describe("writeAuthAuditLog", () => {
  it("defaults actor_role to guest when no userId", async () => {
    const { mod, captured } = await loadAuditServiceWith({});
    await mod.writeAuthAuditLog({
      action: "login_failed",
      email: "x@y.io",
    });
    const inserted = captured.inserts[0] as { payload: Record<string, unknown> };
    expect(inserted.payload.resource_type).toBe("auth");
    expect(inserted.payload.actor_role).toBe("guest");
    expect(inserted.payload.actor_user_id).toBeNull();
  });

  it("uses provided userId as both actor and resource_id", async () => {
    const { mod, captured } = await loadAuditServiceWith({});
    await mod.writeAuthAuditLog({
      action: "logout",
      userId: "u9",
    });
    const inserted = captured.inserts[0] as { payload: Record<string, unknown> };
    expect(inserted.payload.actor_user_id).toBe("u9");
    expect(inserted.payload.resource_id).toBe("u9");
  });
});

describe("searchAuditLogs", () => {
  it("returns mocked rows + count", async () => {
    const { mod } = await loadAuditServiceWith({
      searchData: [{ id: "a1", action: "login" }],
      searchCount: 1,
    });
    const r = await mod.searchAuditLogs({ pageSize: 10 });
    expect(r.count).toBe(1);
    expect(r.data).toHaveLength(1);
  });

  it("throws on db error", async () => {
    const { mod } = await loadAuditServiceWith({
      searchError: { message: "db boom" },
    });
    await expect(mod.searchAuditLogs({})).rejects.toThrow("db boom");
  });
});
