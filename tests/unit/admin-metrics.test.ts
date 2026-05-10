import { describe, it, expect } from "vitest";
import { auditLogsToCsv, bucketByMonth } from "@/lib/admin-metrics";

describe("bucketByMonth", () => {
  const end = new Date(Date.UTC(2026, 4, 11)); // 2026-05-11

  it("creates N buckets ending at end's month", () => {
    const out = bucketByMonth({ months: 3, end, rows: [] });
    expect(out.map((b) => b.month)).toEqual(["2026-03", "2026-04", "2026-05"]);
  });

  it("counts rows into matching bucket only", () => {
    const out = bucketByMonth({
      months: 3,
      end,
      rows: [
        { created_at: "2026-05-01T00:00:00Z", kind: "newUsers" },
        { created_at: "2026-04-15T00:00:00Z", kind: "newOrganizations" },
        { created_at: "2026-04-20T00:00:00Z", kind: "newEmissionLogs" },
        { created_at: "2026-04-21T00:00:00Z", kind: "newEmissionLogs" },
        // outside window — ignored
        { created_at: "2025-12-01T00:00:00Z", kind: "newUsers" },
      ],
    });
    expect(out[0].newUsers).toBe(0);
    expect(out[1].newOrganizations).toBe(1);
    expect(out[1].newEmissionLogs).toBe(2);
    expect(out[2].newUsers).toBe(1);
  });
});

describe("auditLogsToCsv", () => {
  it("emits header + escaped rows", () => {
    const csv = auditLogsToCsv([
      {
        created_at: "2026-05-11T00:00:00Z",
        actor_user_id: "u1",
        actor_role: "system_admin",
        action: "login",
        resource_type: "auth",
        resource_id: null,
        org_id: null,
        status: "success",
        error_message: null,
        ip_address: "1.2.3.4",
      },
      {
        created_at: "2026-05-11T00:01:00Z",
        actor_user_id: null,
        actor_role: null,
        action: "comma,test",
        resource_type: "test",
        resource_id: null,
        org_id: null,
        status: "failure",
        error_message: 'multi"line\nerror',
        ip_address: null,
      },
    ]);
    expect(csv.startsWith("created_at,")).toBe(true);
    // Comma in action should be quoted
    expect(csv).toContain('"comma,test"');
    // Newline-containing error must be wrapped in quotes + double-quote escaped
    expect(csv).toContain('"multi""line\nerror"');
    // Both data rows present
    expect(csv).toContain("login");
    expect(csv).toContain("comma,test");
  });

  it("empty rows still has header", () => {
    expect(auditLogsToCsv([])).toMatch(/^created_at,/);
  });
});
