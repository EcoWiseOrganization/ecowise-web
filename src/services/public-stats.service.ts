import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export interface PublicImpactStats {
  organizations: number;
  users: number;
  emissionLogs: number;
  totalCo2eKg: number;
}

/**
 * Aggregate counters for the /about Impact section. Read-only; safe to call
 * from any Server Component.
 */
export async function getPublicImpactStats(): Promise<PublicImpactStats> {
  const db = createServiceClient();
  const [orgs, users, logs] = await Promise.all([
    db.from("Organization").select("id", { count: "exact", head: true }),
    db
      .from("User")
      .select("id", { count: "exact", head: true })
      .neq("status", "deleted"),
    db.from("EmissionLogs").select("co2e_result", { count: "exact" }),
  ]);

  const totalCo2eKg = (logs.data ?? []).reduce(
    (sum, r) =>
      sum +
      (Number((r as { co2e_result: number | null }).co2e_result) || 0),
    0
  );

  return {
    organizations: orgs.count ?? 0,
    users: users.count ?? 0,
    emissionLogs: logs.count ?? 0,
    totalCo2eKg,
  };
}
