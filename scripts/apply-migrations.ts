/**
 * Apply Phase 0 migrations (004, 005) to a Supabase Postgres instance.
 *
 * Usage:
 *   DATABASE_URL='postgres://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres' \
 *   npx tsx scripts/apply-migrations.ts
 *
 * Or pass the URL explicitly via --url=<connection_string>.
 *
 * The script applies migrations idempotently — running twice is a no-op.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

function getArg(name: string): string | undefined {
  const flag = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(flag));
  return found ? found.slice(flag.length) : undefined;
}

/** Minimal .env parser — handles unquoted values with spaces and `=` signs. */
function loadDotenv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const raw = readFileSync(path, "utf8");
  const out: Record<string, string> = {};
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/**
 * Normalize a Postgres connection URI by percent-encoding any literal `@`
 * inside the password portion (Supabase users sometimes paste passwords
 * containing `@` without encoding). Idempotent for already-encoded inputs.
 */
function normalizeDbUrl(raw: string): string {
  // postgresql://USER:PASSWORD@HOST[:PORT]/DB?...
  const m = /^(postgres(?:ql)?:\/\/)([^:]+):(.+)@([^@]+)$/i.exec(raw);
  if (!m) return raw;
  const [, scheme, user, pwd, hostPart] = m;
  // Percent-encode `@` (and `:` `/` `#` `?`) inside password if not already.
  const safe = encodeURIComponent(decodeURIComponent(pwd));
  return `${scheme}${user}:${safe}@${hostPart}`;
}

async function main() {
  const dotenv = loadDotenv(resolve(process.cwd(), ".env.local"));
  for (const [k, v] of Object.entries(dotenv)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }

  const rawUrl = getArg("url") ?? process.env.DATABASE_URL;
  const url = rawUrl ? normalizeDbUrl(rawUrl) : undefined;
  if (!url) {
    console.error(
      "Missing DATABASE_URL env or --url=<conn> flag. Get the URI from Supabase Dashboard → Project Settings → Database → Connection string (URI)."
    );
    process.exit(2);
  }

  const files = [
    "supabase/migrations/004_audit_logs.sql",
    "supabase/migrations/005_emission_log_constraints.sql",
  ];

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log("Connected to Postgres.");
    for (const f of files) {
      const path = resolve(process.cwd(), f);
      const sql = readFileSync(path, "utf8");
      console.log(`\n→ Applying ${f} (${sql.length} bytes)…`);
      try {
        await client.query(sql);
        console.log(`  ✓ ${f} applied.`);
      } catch (err) {
        console.error(`  ✗ ${f} failed:`, err instanceof Error ? err.message : err);
        throw err;
      }
    }
    console.log("\nAll migrations applied successfully.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
