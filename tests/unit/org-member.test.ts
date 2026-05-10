import { describe, it, expect, vi, beforeEach } from "vitest";
import { ROLE_ADMIN_ID, ROLE_MEMBER_ID } from "@/lib/roles";

interface Filter {
  col: string;
  val: unknown;
  op: "eq" | "neq" | "in";
}

interface DbState {
  /** member row to be returned by .select(...).eq("id",...).maybeSingle() */
  targetMember?: {
    user_id: string;
    role_id: string;
    status: string;
  } | null;
  /** count returned for the head-count query (other admins in the org) */
  otherAdminCount?: number;
  updateError?: { message: string } | null;
  deleteError?: { message: string } | null;
}

function makeStub(state: DbState) {
  return {
    from(table: string) {
      const filters: Filter[] = [];
      const builder: Record<string, unknown> = {};
      Object.assign(builder, {
        select: () => builder,
        update: () => builder,
        delete: () => builder,
        eq: (col: string, val: unknown) => {
          filters.push({ col, val, op: "eq" });
          return builder;
        },
        neq: (col: string, val: unknown) => {
          filters.push({ col, val, op: "neq" });
          return builder;
        },
        in: (col: string, val: unknown) => {
          filters.push({ col, val, op: "in" });
          return builder;
        },
        maybeSingle: async () => {
          if (table === "OrganizationMembers") {
            // .eq("id", memberId).eq("org_id", orgId) → return targetMember
            return { data: state.targetMember ?? null, error: null };
          }
          return { data: null, error: null };
        },
        single: async () => ({ data: null, error: null }),
        then: (resolve: (v: unknown) => void) => {
          if (table === "OrganizationMembers") {
            const isHeadCount = filters.some((f) => f.op === "neq" && f.col === "user_id");
            if (isHeadCount) {
              return resolve({
                data: null,
                error: null,
                count: state.otherAdminCount ?? 0,
              });
            }
            // update / delete terminal awaits
            const isUpdate = filters.some((f) => f.col === "id");
            if (isUpdate) {
              return resolve({
                data: null,
                error: state.updateError ?? state.deleteError ?? null,
              });
            }
          }
          return resolve({ data: null, error: null });
        },
      });
      return builder;
    },
  };
}

async function loadService(state: DbState) {
  vi.resetModules();
  const stub = makeStub(state);
  vi.doMock("@/lib/supabase/service", () => ({
    createServiceClient: () => stub,
  }));
  return await import("@/services/org-member.service");
}

describe("wouldLeaveOrgWithoutAdmin", () => {
  beforeEach(() => vi.resetModules());

  it("returns false when target is not admin", async () => {
    const svc = await loadService({
      targetMember: { user_id: "u1", role_id: ROLE_MEMBER_ID, status: "Active" },
    });
    expect(await svc.wouldLeaveOrgWithoutAdmin("o1", "u1")).toBe(false);
  });

  it("returns true when last active admin", async () => {
    const svc = await loadService({
      targetMember: { user_id: "u1", role_id: ROLE_ADMIN_ID, status: "Active" },
      otherAdminCount: 0,
    });
    expect(await svc.wouldLeaveOrgWithoutAdmin("o1", "u1")).toBe(true);
  });

  it("returns false when other admins exist", async () => {
    const svc = await loadService({
      targetMember: { user_id: "u1", role_id: ROLE_ADMIN_ID, status: "Active" },
      otherAdminCount: 2,
    });
    expect(await svc.wouldLeaveOrgWithoutAdmin("o1", "u1")).toBe(false);
  });
});

describe("removeMember (BR-26)", () => {
  it("blocks removal of last admin with MSG26", async () => {
    const svc = await loadService({
      targetMember: { user_id: "u1", role_id: ROLE_ADMIN_ID, status: "Active" },
      otherAdminCount: 0,
    });
    await expect(svc.removeMember("o1", "m1")).rejects.toThrow("MSG26");
  });

  it("allows removal of standard member", async () => {
    const svc = await loadService({
      targetMember: { user_id: "u1", role_id: ROLE_MEMBER_ID, status: "Active" },
    });
    await expect(svc.removeMember("o1", "m1")).resolves.toBeUndefined();
  });

  it("throws MEMBER_NOT_FOUND when missing", async () => {
    const svc = await loadService({ targetMember: null });
    await expect(svc.removeMember("o1", "m1")).rejects.toThrow("MEMBER_NOT_FOUND");
  });
});

describe("updateMemberRole (BR-26)", () => {
  it("blocks demoting last admin", async () => {
    const svc = await loadService({
      targetMember: { user_id: "u1", role_id: ROLE_ADMIN_ID, status: "Active" },
      otherAdminCount: 0,
    });
    await expect(
      svc.updateMemberRole("o1", "m1", "Standard Member")
    ).rejects.toThrow("MSG26");
  });

  it("allows promoting member to admin", async () => {
    const svc = await loadService({
      targetMember: { user_id: "u1", role_id: ROLE_MEMBER_ID, status: "Active" },
    });
    await expect(
      svc.updateMemberRole("o1", "m1", "Organization Admin")
    ).resolves.toBeUndefined();
  });
});

describe("setMemberStatus (BR-26)", () => {
  it("blocks deactivating last admin", async () => {
    const svc = await loadService({
      targetMember: { user_id: "u1", role_id: ROLE_ADMIN_ID, status: "Active" },
      otherAdminCount: 0,
    });
    await expect(svc.setMemberStatus("o1", "m1", "Inactive")).rejects.toThrow(
      "MSG26"
    );
  });

  it("allows pending → active", async () => {
    const svc = await loadService({
      targetMember: { user_id: "u1", role_id: ROLE_MEMBER_ID, status: "Pending" },
    });
    await expect(svc.setMemberStatus("o1", "m1", "Active")).resolves.toBeUndefined();
  });
});

describe("roleIdFromLabel", () => {
  it("maps Organization Admin", async () => {
    const svc = await loadService({});
    expect(svc.roleIdFromLabel("Organization Admin")).toBe(ROLE_ADMIN_ID);
  });
  it("maps Standard Member", async () => {
    const svc = await loadService({});
    expect(svc.roleIdFromLabel("Standard Member")).toBe(ROLE_MEMBER_ID);
  });
});
