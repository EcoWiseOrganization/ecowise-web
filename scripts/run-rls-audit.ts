import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

function loadDotenv(path: string) {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[line.slice(0, eq).trim()] = v;
  }
  return out;
}

const env = loadDotenv(resolve(process.cwd(), ".env.local"));
const url = (process.env.DATABASE_URL ?? (env as Record<string, string>).DATABASE_URL) as string;

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();

  const sql = readFileSync(
    resolve(process.cwd(), "scripts/audit-rls.sql"),
    "utf8"
  );
  // Split the script on the comment marker for the 2nd statement, run both.
  const [first, second] = sql.split("-- 2)");
  const r1 = await client.query(first);
  console.log("=== Per-table RLS summary ===");
  console.table(r1.rows);

  if (second) {
    const r2 = await client.query("-- 2)" + second);
    console.log(`\n=== Detailed policies (${r2.rows.length} total) ===`);
    for (const row of r2.rows) {
      console.log(`  [${row.tablename}] ${row.policyname} (${row.cmd}) — roles=${row.roles}`);
    }
  }

  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
