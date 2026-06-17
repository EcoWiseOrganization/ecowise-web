/**
 * Prune the OLDEST "User" rows down to a target of 129, and fully remove the
 * deleted users (auth + app data).
 *
 * Keeps: the 22 recently-managed accounts, the 2 personal accounts the owner
 * asked to spare (dangkhanha1 / khanhnvd.work), and any admin.
 *
 * Per victim, in order:
 *   1. Reassign event_assignments.assigned_by → an admin (NOT NULL + NO ACTION
 *      FK to auth.users — the blocker behind "Database error deleting user").
 *   2. Delete their Subscriptions (subject_id is not an FK → no cascade).
 *   3. Delete the "User" profile row ("User".id → auth.users is NO ACTION).
 *   4. Delete the auth user (cascades the rest).
 *
 * Resilient: logs per-victim failures and continues. Re-runnable.
 *
 * Usage: npx tsx scripts/delete-old-users.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function loadDotenv(path: string) {
  if (!existsSync(path)) return {} as Record<string, string>;
  const out: Record<string, string> = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[line.slice(0, eq).trim()] = v;
  }
  return out;
}
const env = loadDotenv(resolve(process.cwd(), ".env.local"));
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
const db: SupabaseClient = createClient(URL!, KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TARGET = 129;

const KEEP = new Set(
  [
    "dgkhanh1516@gmail.com", "minh47857@gmail.com", "tongtranbinh30082005@gmail.com",
    "linhling05@gmail.com", "sevenghost47@gmail.com", "kingyorn55@gmail.com",
    "giaomercurious@gmail.com", "gomsudongduong1516@gmail.com", "c2by-tuan0101@thachthat.edu.vn",
    "nguyenhung12111@gmail.com", "ausi.oine@gmail.com", "phuonganht381@gmail.com",
    "hoanglehuonggiang2005@gmail.com", "ngochiendieu@gmail.com", "lananhgg3008@gmail.com",
    "thummhs180584@fpt.edu.vn", "han954200@gmail.com", "tranduyanhdz@gmail.com",
    "doductrung@gmail.com",
    "minhkhoi.pham99@gmail.com", "vuthimai2103@gmail.com", "lequanghuy1808@gmail.com",
    "dangkhanha1@gmail.com", "khanhnvd.work@gmail.com",
  ].map((e) => e.toLowerCase())
);

// Auth account orphaned by an earlier partial run (profile already deleted).
const ORPHAN_EMAILS = ["tranminhlong20105@gmail.com"];

async function loadAuthByEmail() {
  const m = new Map<string, string>();
  for (let p = 1; p <= 50; p++) {
    const { data, error } = await db.auth.admin.listUsers({ page: p, perPage: 1000 });
    if (error) throw new Error(error.message);
    for (const u of data.users) if (u.email) m.set(u.email.toLowerCase(), u.id);
    if (data.users.length < 1000) break;
  }
  return m;
}

async function purge(id: string, label: string, adminId: string): Promise<string | null> {
  // 1) Best-effort: clear event_assignments.assigned_by (NO-ACTION FK). The
  //    table isn't exposed via PostgREST, so ignore "not found" — we'll only
  //    hit the FK if this victim actually assigned an event.
  await db.from("event_assignments").update({ assigned_by: adminId }).eq("assigned_by", id);

  // 2) Subscriptions (subject_id not an FK).
  const { error: subErr } = await db
    .from("Subscriptions")
    .delete()
    .eq("subject_type", "User")
    .eq("subject_id", id);
  if (subErr) return `subs ${label}: ${subErr.message}`;

  // 3) Profile row.
  const { error: pErr } = await db.from("User").delete().eq("id", id);
  if (pErr) return `profile ${label}: ${pErr.message}`;

  // 4) Auth user.
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return `deleteUser ${label}: ${error.message}`;
  return null;
}

async function main() {
  const { data: adminRow } = await db
    .from("User")
    .select("id")
    .eq("is_admin", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  const adminId = adminRow!.id as string;

  const authByEmail = await loadAuthByEmail();

  const { data: users, count } = await db
    .from("User")
    .select("id, email, full_name, is_admin, created_at", { count: "exact" })
    .order("created_at", { ascending: true });
  const rows = (users ?? []) as Array<{
    id: string; email: string | null; full_name: string | null;
    is_admin: boolean; created_at: string;
  }>;

  const toDelete = Math.max(0, (count ?? 0) - TARGET);
  console.log(`"User" rows: ${count} → deleting ${toDelete} to reach ${TARGET}\n`);

  const victims = rows
    .filter((r) => !r.is_admin && !KEEP.has((r.email ?? "").toLowerCase()))
    .slice(0, toDelete);

  const failures: string[] = [];
  for (const v of victims) {
    const err = await purge(v.id, v.email ?? v.id, adminId);
    if (err) {
      failures.push(err);
      console.log(`  ⚠ FAILED ${v.email}: ${err}`);
    } else {
      console.log(`  ✗ deleted ${v.created_at.slice(0, 10)}  ${v.email}  (${v.full_name})`);
    }
  }

  // Clean orphaned auth accounts from the earlier partial run.
  for (const email of ORPHAN_EMAILS) {
    const id = authByEmail.get(email.toLowerCase());
    if (!id) continue;
    const err = await purge(id, email, adminId);
    console.log(err ? `  ⚠ orphan ${email}: ${err}` : `  ✗ orphan auth removed ${email}`);
    if (err) failures.push(err);
  }

  const { count: finalCount } = await db
    .from("User")
    .select("id", { count: "exact", head: true });
  console.log(`\n"User" rows now: ${finalCount} (target ${TARGET}). Failures: ${failures.length}`);
}

main().catch((e) => {
  console.error("\nFAILED:", e.message);
  process.exit(1);
});
