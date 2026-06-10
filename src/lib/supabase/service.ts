import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS.
 * Use ONLY in server-side code (Server Actions, Route Handlers).
 * Never expose to the client.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

/**
 * Attach an actor user id to the next set of writes performed through
 * `db`. Migration 027's generic audit trigger prefers
 * `current_setting('app.actor_id', true)` over `auth.uid()` when
 * populating `audit_logs.actor_user_id`, so without this call every
 * service-role mutation lands as `actor_user_id = NULL` (the BR-16
 * actor-attribution gap REVIEW.md flagged).
 *
 * Call it ONCE per request, immediately after creating the service
 * client. The setting is local-scoped (`is_local = true`) and lives
 * for the rest of the current Postgres session — Supabase recycles
 * those per request via PgBouncer, so the leak surface is bounded.
 *
 * `userId` is optional so callers that have no actor (legitimate
 * background jobs without an originating user) can simply skip the
 * call; existing behaviour is preserved (auth.uid() falls back to
 * NULL).
 */
export async function setAuditActor(
  db: SupabaseClient,
  userId: string | null | undefined,
): Promise<void> {
  if (!userId) return;
  try {
    const { error } = await db.rpc("set_audit_actor", { p_user_id: userId });
    if (error) {
      // Don't fail the mutation if the config call dies; just log so
      // ops can see the gap. The mutation itself will still write an
      // audit row (with NULL actor) which is the previous behaviour.
      console.warn("[supabase/service] setAuditActor failed", {
        userId,
        error: error.message,
      });
    }
  } catch (err) {
    console.warn("[supabase/service] setAuditActor threw", { userId, err });
  }
}
