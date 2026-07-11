/**
 * Top the "User" table up to a target headcount (default 410) by inserting
 * fresh, clean registered users whose registration dates are spread EVENLY
 * across a window (default 2026-07-04 00:00 +07 → now).
 *
 * Behaviour:
 *   1. Count current public."User" rows (all rows, admin included).
 *   2. needed = max(0, TARGET - current). If 0 → nothing to do.
 *   3. Generate `needed` users with:
 *        • pretty Vietnamese full names (gender-aware họ + đệm + tên),
 *        • organic-looking fake emails (ascii, unique, mostly @gmail.com),
 *        • user_name = email local part (matches the 043 seed convention),
 *        • DiceBear avatar_url,
 *        • created_at spread evenly over the window (+ light jitter),
 *        • last_login_at a few minutes after created_at.
 *   4. Insert into auth.users + auth.identities + public."User" (same shape as
 *      migration 043), inside ONE transaction, with trg_audit_user disabled
 *      (AuditLogs is immutable → can't backdate audit rows).
 *
 * Every new account logs in with the shared password: EcoWise@2026
 *
 * Idempotent-ish: re-running only adds the shortfall back up to TARGET, and
 * never reuses an email/user_name already present in the DB.
 *
 * Usage:
 *   npx tsx scripts/seed-users-to-410.ts            # up to 410
 *   npx tsx scripts/seed-users-to-410.ts --target=450
 *   npx tsx scripts/seed-users-to-410.ts --dry-run  # preview, no writes
 *
 * Required env (from .env.local): DIRECT_URL or DATABASE_URL
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Client } from "pg";

// ── config ──────────────────────────────────────────────────────────────────
const TARGET = intArg("target", 410);
const DRY_RUN = process.argv.includes("--dry-run");
const PASSWORD = "EcoWise@2026";
// Window start: 04/07/2026 00:00 Vietnam time. End = DB now() (fetched below).
const WINDOW_START_ISO = "2026-07-04T00:00:00+07:00";

// ── env ─────────────────────────────────────────────────────────────────────
function loadDotenv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
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
function intArg(name: string, dflt: number): number {
  const f = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!f) return dflt;
  const n = parseInt(f.split("=")[1], 10);
  return Number.isFinite(n) ? n : dflt;
}

const env = loadDotenv(resolve(process.cwd(), ".env.local"));
const DB_URL =
  process.env.DIRECT_URL ?? env.DIRECT_URL ?? process.env.DATABASE_URL ?? env.DATABASE_URL;
if (!DB_URL) {
  console.error("Missing DIRECT_URL / DATABASE_URL in env or .env.local");
  process.exit(2);
}

// ── name pools ──────────────────────────────────────────────────────────────
const SURNAMES = [
  "Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng",
  "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý", "Đinh", "Đào", "Đoàn", "Mai",
  "Trịnh", "Tô", "Lương", "Cao", "Tạ", "Chu", "Hà", "Vương", "Kiều", "Phùng",
];
const MALE_MIDDLE = [
  "Văn", "Hữu", "Đức", "Minh", "Quang", "Công", "Xuân", "Thành", "Hoàng", "Bá",
  "Đình", "Ngọc", "Tuấn", "Hải", "Trọng", "Anh", "Gia", "Nhật", "Duy", "Quốc",
  "Mạnh", "Thế", "Việt", "Trung", "Bảo",
];
const FEMALE_MIDDLE = [
  "Thị", "Ngọc", "Thu", "Thanh", "Kim", "Hồng", "Phương", "Diệu", "Thùy", "Khánh",
  "Mỹ", "Yến", "Bích", "Lan", "Hà", "Quỳnh", "Gia", "Bảo", "Hải", "Nhã",
  "Minh", "Anh", "Hoài", "Cẩm", "Tuyết",
];
const MALE_GIVEN = [
  "An", "Bình", "Cường", "Dũng", "Đạt", "Hùng", "Khoa", "Long", "Nam", "Phong",
  "Quân", "Sơn", "Tài", "Thắng", "Trí", "Vinh", "Bách", "Khôi", "Lâm", "Huy",
  "Kiên", "Phúc", "Tú", "Đăng", "Hiếu", "Nghĩa", "Toàn", "Duy", "Hoàng", "Kha",
];
const FEMALE_GIVEN = [
  "Anh", "Chi", "Dung", "Giang", "Hạnh", "Hoa", "Hương", "Lan", "Linh", "Mai",
  "My", "Ngân", "Nhung", "Oanh", "Phương", "Quyên", "Thảo", "Trang", "Trâm", "Uyên",
  "Vy", "Yến", "Ngọc", "Thu", "Hân", "Nhi", "Diệp", "Khuê", "Ánh", "Thùy",
];
const AVATAR_STYLES = [
  "thumbs", "miniavs", "micah", "adventurer", "lorelei", "fun-emoji",
  "personas", "bottts", "big-smile", "notionists", "avataaars",
];
const PROVIDERS: Array<{ d: string; w: number }> = [
  { d: "gmail.com", w: 74 },
  { d: "fpt.edu.vn", w: 10 },
  { d: "outlook.com", w: 9 },
  { d: "yahoo.com", w: 7 },
];

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;
function pickProvider(): string {
  const total = PROVIDERS.reduce((s, p) => s + p.w, 0);
  let r = Math.random() * total;
  for (const p of PROVIDERS) {
    if ((r -= p.w) <= 0) return p.d;
  }
  return "gmail.com";
}
/** Strip Vietnamese diacritics → tidy ascii for user_name / email. */
function deburr(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]/g, "");
}
function rand8(): string {
  const c = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

interface NewUser {
  id: string;
  full_name: string;
  email: string;
  user_name: string;
  avatar_url: string;
  created_at: Date;
  last_login_at: Date;
}

/** Build a display name + its ascii pieces (surname, given). */
function makeName(): { full: string; ho: string; ten: string } {
  const male = chance(0.5);
  const ho = pick(SURNAMES);
  const dem = pick(male ? MALE_MIDDLE : FEMALE_MIDDLE);
  const ten = pick(male ? MALE_GIVEN : FEMALE_GIVEN);
  const full = chance(0.15) ? `${ho} ${ten}` : `${ho} ${dem} ${ten}`;
  return { full, ho: deburr(ho).toLowerCase(), ten: deburr(ten).toLowerCase() };
}

/** Generate one organic-looking, unique email + matching user_name. */
function makeEmail(
  ho: string,
  ten: string,
  usedEmails: Set<string>,
  usedNames: Set<string>
): { email: string; user_name: string } {
  for (let attempt = 0; attempt < 60; attempt++) {
    const num = chance(0.85)
      ? String(Math.floor(Math.random() * 90) + 10) +
        (chance(0.4) ? String(Math.floor(Math.random() * 90) + 10) : "")
      : "";
    const shape = Math.floor(Math.random() * 5);
    let local: string;
    switch (shape) {
      case 0: local = `${ten}${ho}${num}`; break;
      case 1: local = `${ho}${ten}${num}`; break;
      case 2: local = `${ten}.${ho}${num}`; break;
      case 3: local = `${ho}.${ten}${num}`; break;
      default: local = `${ten}${ho}${num || String(Math.floor(Math.random() * 900) + 100)}`;
    }
    // On later attempts, force a distinguishing suffix to guarantee progress.
    if (attempt > 6) local += rand8().slice(0, 3);
    const email = `${local}@${pickProvider()}`;
    const un = local;
    if (!usedEmails.has(email) && !usedNames.has(un)) {
      usedEmails.add(email);
      usedNames.add(un);
      return { email, user_name: un };
    }
  }
  // Last-resort unique fallback.
  const local = `${ten}${ho}${rand8()}`;
  const email = `${local}@gmail.com`;
  usedEmails.add(email);
  usedNames.add(local);
  return { email, user_name: local };
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  try {
    const nowRow = (await client.query("select now() as now")).rows[0];
    const windowEnd: Date = new Date(nowRow.now);
    const windowStart = new Date(WINDOW_START_ISO);

    const current: number = (
      await client.query('select count(*)::int as n from public."User"')
    ).rows[0].n;
    const needed = Math.max(0, TARGET - current);

    console.log(`Current "User" rows : ${current}`);
    console.log(`Target              : ${TARGET}`);
    console.log(`To add              : ${needed}`);
    console.log(
      `Window              : ${windowStart.toISOString()} → ${windowEnd.toISOString()}\n`
    );
    if (needed === 0) {
      console.log("Already at/above target — nothing to add.");
      return;
    }
    if (windowEnd <= windowStart) throw new Error("Window end is before start.");

    // Existing emails / user_names → guarantee no collision.
    const usedEmails = new Set<string>();
    const usedNames = new Set<string>();
    for (const r of (
      await client.query('select lower(email) e, lower(user_name) u from public."User"')
    ).rows) {
      if (r.e) usedEmails.add(r.e);
      if (r.u) usedNames.add(r.u);
    }
    for (const r of (
      await client.query("select lower(email) e from auth.users where email is not null")
    ).rows) {
      if (r.e) usedEmails.add(r.e);
    }

    // Evenly-spaced timestamps across the window (+ light jitter, kept sorted).
    const span = windowEnd.getTime() - windowStart.getTime();
    const step = span / needed;
    const users: NewUser[] = [];
    for (let i = 0; i < needed; i++) {
      const { full, ho, ten } = makeName();
      const { email, user_name } = makeEmail(ho, ten, usedEmails, usedNames);
      const base = windowStart.getTime() + (i + 0.5) * step;
      const jitter = (Math.random() - 0.5) * step * 0.6; // stays within its slot
      let createdMs = Math.min(base + jitter, windowEnd.getTime() - 1000);
      createdMs = Math.max(createdMs, windowStart.getTime() + 1000);
      const created = new Date(createdMs);
      const loginDelayMs = (5 + Math.floor(Math.random() * 40)) * 60_000;
      const login = new Date(Math.min(createdMs + loginDelayMs, windowEnd.getTime()));
      const style = pick(AVATAR_STYLES);
      const seed = `${encodeURIComponent(full.replace(/\s+/g, "-"))}-${rand8()}`;
      users.push({
        id: randomUUID(),
        full_name: full,
        email,
        user_name,
        avatar_url: `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`,
        created_at: created,
        last_login_at: login,
      });
    }
    users.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());

    console.log("Preview (first 5 / last 5):");
    for (const u of [...users.slice(0, 5), ...users.slice(-5)]) {
      console.log(
        `  ${u.created_at.toISOString().slice(0, 16)}  ${u.email.padEnd(34)} ${u.full_name}`
      );
    }
    console.log();

    if (DRY_RUN) {
      console.log(`Dry run — no rows written. Would insert ${users.length} users.`);
      return;
    }

    // ── insert (one transaction, audit trigger disabled) ─────────────────────
    await client.query("BEGIN");
    await client.query('ALTER TABLE public."User" DISABLE TRIGGER trg_audit_user');
    try {
      for (const u of users) {
        // 1) auth.users
        await client.query(
          `INSERT INTO auth.users (
             instance_id, id, aud, role, email, encrypted_password,
             email_confirmed_at, confirmation_sent_at, last_sign_in_at,
             raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
             confirmation_token, recovery_token, email_change_token_new,
             email_change, email_change_token_current, phone_change,
             phone_change_token, reauthentication_token, is_sso_user
           ) VALUES (
             '00000000-0000-0000-0000-000000000000', $1, 'authenticated',
             'authenticated', $2, extensions.crypt($3, extensions.gen_salt('bf')),
             $4::timestamptz, $4::timestamptz - INTERVAL '2 minutes', $5::timestamptz,
             '{"provider":"email","providers":["email"]}'::jsonb,
             jsonb_build_object('full_name', $6::text, 'email_verified', true),
             $4::timestamptz, $5::timestamptz, '', '', '', '', '', '', '', '', false
           )`,
          [u.id, u.email, PASSWORD, u.created_at, u.last_login_at, u.full_name]
        );
        // 2) auth.identities
        await client.query(
          `INSERT INTO auth.identities (
             id, user_id, provider_id, identity_data, provider,
             last_sign_in_at, created_at, updated_at
           ) VALUES (
             gen_random_uuid(), $1::uuid, $1::text,
             jsonb_build_object('sub', $1::text, 'email', $2::text,
                                'email_verified', true, 'phone_verified', false),
             'email', $3::timestamptz, $3::timestamptz, $3::timestamptz
           )`,
          [u.id, u.email, u.created_at]
        );
        // 3) public."User" (handle_new_user trigger may have created it → upsert)
        await client.query(
          `INSERT INTO public."User" (
             id, email, user_name, full_name, is_admin, status, green_points,
             avatar_url, created_at, last_login_at
           ) VALUES ($1, $2, $3, $4, false, 'active', 0, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             email = EXCLUDED.email, user_name = EXCLUDED.user_name,
             full_name = EXCLUDED.full_name, avatar_url = EXCLUDED.avatar_url,
             created_at = EXCLUDED.created_at, last_login_at = EXCLUDED.last_login_at`,
          [u.id, u.email, u.user_name, u.full_name, u.avatar_url, u.created_at, u.last_login_at]
        );
      }
      await client.query('ALTER TABLE public."User" ENABLE TRIGGER trg_audit_user');
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }

    const finalCount: number = (
      await client.query('select count(*)::int n from public."User"')
    ).rows[0].n;
    const inWindow: number = (
      await client.query(
        "select count(*)::int n from public.\"User\" where created_at >= $1",
        [windowStart]
      )
    ).rows[0].n;
    console.log(`\n✓ Inserted ${users.length} users (password: ${PASSWORD}).`);
    console.log(`"User" rows now      : ${finalCount} (target ${TARGET}).`);
    console.log(`Rows on/after 04/07  : ${inWindow}.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("\nFAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
