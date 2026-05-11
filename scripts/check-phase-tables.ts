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

const EXPECTED = [
  "AuditLogs",
  "ContactMessages",
  "ContactRateLimits",
  "CarbonTargets",
  "DailyLogCounters",
  "EventPublicForms",
  "EventPublicSubmissions",
  "EventPublicFormRateLimits",
  "ReportArchives",
  "SubscriptionPlans",
  "Subscriptions",
  "Invoices",
  "PaymentMethods",
  "PaymentIntents",
  "Challenges",
  "UserChallenges",
  "Badges",
  "UserBadges",
  "Rewards",
  "Redemptions",
  "GreenPointLogs",
];

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  for (const name of EXPECTED) {
    const r = await client.query(
      `SELECT COUNT(*)::int AS c FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [name]
    );
    const c = r.rows[0].c as number;
    const flag = c === 0 ? "✓ not created" : `⚠ exists (${c} cols)`;
    console.log(`  ${name.padEnd(28)} ${flag}`);
  }
  await client.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
