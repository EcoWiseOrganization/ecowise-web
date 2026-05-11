import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Client } from "pg";

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
    ) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

const env = loadDotenv(resolve(process.cwd(), ".env.local"));
const url = process.env.DATABASE_URL ?? env.DATABASE_URL;
const table = process.argv[2];
if (!url || !table) {
  console.error("Usage: tsx scripts/inspect-table.ts <TableName>");
  process.exit(2);
}

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  const r = await client.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  );
  console.log(`Columns in "${table}" (${r.rows.length}):`);
  for (const row of r.rows) {
    console.log(`  - ${row.column_name} : ${row.data_type}`);
  }
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
