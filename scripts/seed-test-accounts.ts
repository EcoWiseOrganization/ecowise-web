/**
 * Create / update a batch of EcoWise test accounts.
 *
 * Behaviour per account:
 *   - If an auth user with the email already exists → reset its password to
 *     123456, mark email confirmed, and align full_name (auth metadata + the
 *     "User" profile row).
 *   - Otherwise → create the auth user (email pre-confirmed, password 123456)
 *     and upsert its "User" profile row.
 *
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   npx tsx scripts/seed-test-accounts.ts
 *
 * Required env (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ── Env loader ─────────────────────────────────────────────────────────────
function loadDotenv(path: string) {
  if (!existsSync(path)) return {} as Record<string, string>;
  const out: Record<string, string> = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    let v = line.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    out[line.slice(0, eq).trim()] = v;
  }
  return out;
}
const env = loadDotenv(resolve(process.cwd(), ".env.local"));
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const db: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "123456";

interface Account {
  full_name: string;
  email: string;
}

// 19 accounts transcribed from the provided sheet.
const FROM_SHEET: Account[] = [
  { full_name: "Đoàn Gia Khánh", email: "dgkhanh1516@gmail.com" },
  { full_name: "Trương Nguyên Minh", email: "minh47857@gmail.com" },
  { full_name: "Tống Trần Bình", email: "tongtranbinh30082005@gmail.com" },
  { full_name: "Nguyễn Thị Khánh Linh", email: "linhling05@gmail.com" },
  { full_name: "Trần Minh Anh", email: "sevenghost47@gmail.com" },
  { full_name: "Trần Đăng Huy", email: "kingyorn55@gmail.com" },
  { full_name: "Dư Thu Thủy", email: "giaomercurious@gmail.com" },
  { full_name: "Nguyễn Đông Dương", email: "gomsudongduong1516@gmail.com" },
  { full_name: "Nguyễn Anh Tuân", email: "c2by-tuan0101@thachthat.edu.vn" },
  { full_name: "Nguyễn Hùng", email: "nguyenhung12111@gmail.com" },
  { full_name: "Đặng Thị Hoa", email: "ausi.oine@gmail.com" },
  { full_name: "Trần Phương Anh", email: "phuonganht381@gmail.com" },
  { full_name: "Hoàng Lê Hương Giang", email: "hoanglehuonggiang2005@gmail.com" },
  { full_name: "Nguyễn Ngọc Hiền Diệu", email: "ngochiendieu@gmail.com" },
  { full_name: "Lê Thị Lan Anh", email: "lananhgg3008@gmail.com" },
  { full_name: "Mai Minh Thư", email: "thummhs180584@fpt.edu.vn" },
  { full_name: "Nguyễn Hồng Hà", email: "han954200@gmail.com" },
  { full_name: "Trần Duy Anh", email: "tranduyanhdz@gmail.com" },
  { full_name: "Đỗ Đức Trung", email: "doductrung@gmail.com" },
];

// 3 extra brand-new accounts (auto-generated — rename if you like).
const EXTRA: Account[] = [
  { full_name: "Phạm Minh Khôi", email: "ecowise.user01@gmail.com" },
  { full_name: "Vũ Thị Mai", email: "ecowise.user02@gmail.com" },
  { full_name: "Lê Quang Huy", email: "ecowise.user03@gmail.com" },
];

const ALL = [...FROM_SHEET, ...EXTRA];

/** Strip Vietnamese diacritics → ascii, for a tidy user_name fallback. */
function deburr(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/** Load every auth user once (paginated) → map by lowercased email. */
async function loadAuthUsersByEmail(): Promise<Map<string, string>> {
  const byEmail = new Map<string, string>();
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw new Error(`listUsers p${page}: ${error.message}`);
    for (const u of data.users) {
      if (u.email) byEmail.set(u.email.toLowerCase(), u.id);
    }
    if (data.users.length < 1000) break;
  }
  return byEmail;
}

type Outcome = "created" | "updated";

async function ensureAccount(
  acc: Account,
  existingId: string | undefined
): Promise<{ id: string; outcome: Outcome }> {
  if (existingId) {
    const { error } = await db.auth.admin.updateUserById(existingId, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: acc.full_name },
    });
    if (error) throw new Error(`update ${acc.email}: ${error.message}`);
    // Align profile name only — leave user_name / other fields untouched.
    const { error: pErr } = await db
      .from("User")
      .update({ full_name: acc.full_name })
      .eq("id", existingId);
    if (pErr) throw new Error(`update profile ${acc.email}: ${pErr.message}`);
    return { id: existingId, outcome: "updated" };
  }

  const { data, error } = await db.auth.admin.createUser({
    email: acc.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: acc.full_name },
  });
  if (error || !data.user)
    throw new Error(`create ${acc.email}: ${error?.message}`);
  const id = data.user.id;
  const userName = deburr(acc.email.split("@")[0]).toLowerCase();
  const { error: pErr } = await db.from("User").upsert(
    {
      id,
      email: acc.email,
      full_name: acc.full_name,
      user_name: userName,
      is_admin: false,
      status: "active",
      green_points: 0,
    },
    { onConflict: "id" }
  );
  if (pErr) throw new Error(`insert profile ${acc.email}: ${pErr.message}`);
  return { id, outcome: "created" };
}

async function main() {
  console.log(`Seeding ${ALL.length} test accounts (password: ${PASSWORD})…\n`);
  const byEmail = await loadAuthUsersByEmail();

  const results: Array<Account & { outcome: Outcome }> = [];
  for (const acc of ALL) {
    const { outcome } = await ensureAccount(
      acc,
      byEmail.get(acc.email.toLowerCase())
    );
    console.log(`  ${outcome === "created" ? "✓ created" : "· updated"}  ${acc.email}`);
    results.push({ ...acc, outcome });
  }

  console.log(`\n=== CREDENTIALS (password: ${PASSWORD}) ===`);
  for (const r of results) {
    console.log(
      `${r.email.padEnd(38)} | ${PASSWORD} | ${r.full_name}  (${r.outcome})`
    );
  }
  console.log(
    `\nDone. ${results.filter((r) => r.outcome === "created").length} created, ` +
      `${results.filter((r) => r.outcome === "updated").length} updated.`
  );
}

main().catch((e) => {
  console.error("\nFAILED:", e.message);
  process.exit(1);
});
