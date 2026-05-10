/**
 * Integration tests for Phase 0 DB constraints.
 *
 * Requires a running Supabase project with migrations 001-005 applied + the
 * service role key in environment. The tests are SKIPPED automatically when
 * the env vars are not present, so unit-test runs do not fail in CI without
 * DB access.
 *
 * To run locally:
 *   1. Apply migrations:    supabase db push   (or psql -f each file)
 *   2. Export env:          export NEXT_PUBLIC_SUPABASE_URL=...   \
 *                                  SUPABASE_SERVICE_ROLE_KEY=...
 *   3. npm test -- tests/integration
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasDbAccess = Boolean(SUPABASE_URL && SERVICE_ROLE);
const d = hasDbAccess ? describe : describe.skip;

let svc: SupabaseClient;

beforeAll(() => {
  if (!hasDbAccess) return;
  svc = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
    auth: { persistSession: false },
  });
});

d("AuditLogs immutability (BR-16)", () => {
  it("INSERT then UPDATE rejected by trigger", async () => {
    const action = `unit_test_update_${Date.now()}`;
    const { data: inserted, error: insertErr } = await svc
      .from("AuditLogs")
      .insert({
        action,
        resource_type: "auth",
        status: "success",
      })
      .select("id")
      .single();
    expect(insertErr).toBeNull();
    expect(inserted?.id).toBeTruthy();

    const { error: updateErr } = await svc
      .from("AuditLogs")
      .update({ status: "warning" })
      .eq("id", inserted!.id);

    expect(updateErr).toBeTruthy();
    expect((updateErr?.message ?? "").toLowerCase()).toMatch(
      /immutable|audit_log/i
    );
  });

  it("DELETE rejected by trigger", async () => {
    const action = `unit_test_delete_${Date.now()}`;
    const { data: inserted } = await svc
      .from("AuditLogs")
      .insert({
        action,
        resource_type: "auth",
        status: "success",
      })
      .select("id")
      .single();

    const { error: deleteErr } = await svc
      .from("AuditLogs")
      .delete()
      .eq("id", inserted!.id);

    expect(deleteErr).toBeTruthy();
    expect((deleteErr?.message ?? "").toLowerCase()).toMatch(
      /immutable|audit_log/i
    );
  });
});

d("Generic audit trigger writes to AuditLogs", () => {
  it("creating then deleting an Organization writes 2 audit rows", async () => {
    // The Organization table requires legal_name + tax_code. Use random tax
    // code to avoid unique constraint clash.
    const taxCode = `TEST-${Date.now()}`;
    const { data: org, error: insertErr } = await svc
      .from("Organization")
      .insert({
        legal_name: "Phase0 Test Org",
        tax_code: taxCode,
        org_type: "SMB",
      })
      .select("id")
      .single();
    expect(insertErr).toBeNull();

    const orgId = org!.id as string;

    // Expect at least one create_organization row in AuditLogs
    const { data: createLogs } = await svc
      .from("AuditLogs")
      .select("id, action, resource_id")
      .eq("resource_type", "organization")
      .eq("resource_id", orgId)
      .eq("action", "create_organization");
    expect((createLogs ?? []).length).toBeGreaterThanOrEqual(1);

    // Cleanup: delete org → audit row should appear
    const { error: deleteErr } = await svc
      .from("Organization")
      .delete()
      .eq("id", orgId);
    expect(deleteErr).toBeNull();

    const { data: deleteLogs } = await svc
      .from("AuditLogs")
      .select("id, action")
      .eq("resource_type", "organization")
      .eq("resource_id", orgId)
      .eq("action", "delete_organization");
    expect((deleteLogs ?? []).length).toBeGreaterThanOrEqual(1);
  });
});

d("EmissionLogs published lock (BR-07)", () => {
  it("UPDATE on Published log raises MSG12", async () => {
    // Need an org to satisfy FK
    const taxCode = `LOCK-${Date.now()}`;
    const { data: org } = await svc
      .from("Organization")
      .insert({
        legal_name: "Lock Test Org",
        tax_code: taxCode,
        org_type: "SMB",
      })
      .select("id")
      .single();
    expect(org).toBeTruthy();

    // Insert as Published directly via service role
    const { data: log, error: logErr } = await svc
      .from("EmissionLogs")
      .insert({
        org_id: org!.id,
        activity_name: "Phase0 lock test",
        scope: "Scope 1",
        reporting_date: new Date().toISOString().slice(0, 10),
        quantity: 100,
        unit: "kWh",
        co2e_result: 55.7,
        status: "Published",
      })
      .select("id")
      .single();
    expect(logErr).toBeNull();

    const { error: updateErr } = await svc
      .from("EmissionLogs")
      .update({ activity_name: "Hacked" })
      .eq("id", log!.id);

    expect(updateErr).toBeTruthy();
    expect((updateErr?.message ?? "").toLowerCase()).toMatch(/msg12|published/i);

    // Status not Published can be updated normally
    const { data: log2 } = await svc
      .from("EmissionLogs")
      .insert({
        org_id: org!.id,
        activity_name: "Editable",
        scope: "Scope 1",
        reporting_date: new Date().toISOString().slice(0, 10),
        quantity: 50,
        unit: "kWh",
        co2e_result: 25,
        status: "Pending",
      })
      .select("id")
      .single();

    const { error: ok } = await svc
      .from("EmissionLogs")
      .update({ activity_name: "Edited" })
      .eq("id", log2!.id);
    expect(ok).toBeNull();

    // Cleanup
    await svc.from("EmissionLogs").delete().eq("id", log2!.id);
    // Published row cannot be deleted by trigger — switch back to Pending first
    // But trigger blocks UPDATE too. So leave the row and just delete org cascade.
    await svc.from("Organization").delete().eq("id", org!.id);
  });
});
