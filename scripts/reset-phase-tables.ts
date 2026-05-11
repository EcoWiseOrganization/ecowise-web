/**
 * One-shot DROP of any Phase 0-11 tables/types that may exist with a
 * stale schema, then re-run apply-migrations.
 *
 * USE ONCE. After this, never run again unless you intentionally want to
 * wipe gamification + subscription + audit data.
 */
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

const DROP_TABLES = [
  // Phase 0-11 tables only — do NOT include 001-003 base tables.
  "AuditLogs",
  "ContactRateLimits",
  "ContactMessages",
  "DailyLogCounters",
  "CarbonTargets",
  "EventPublicFormRateLimits",
  "EventPublicSubmissions",
  "EventPublicForms",
  "ReportArchives",
  "PaymentIntents",
  "PaymentMethods",
  "Invoices",
  "Subscriptions",
  "SubscriptionPlans",
  "GreenPointLogs",
  "Redemptions",
  "Rewards",
  "UserBadges",
  "Badges",
  "UserChallenges",
  "Challenges",
];

const DROP_TYPES = [
  "audit_log_status",
  "contact_message_status",
  "carbon_target_status",
  "event_public_form_status",
  "report_format",
  "report_kind",
  "subscription_target",
  "subscription_billing_cycle",
  "subscription_plan_status",
  "subscription_subject_type",
  "subscription_status",
  "invoice_status",
  "payment_intent_status",
  "challenge_status",
  "challenge_verification",
  "user_challenge_status",
  "reward_status",
  "reward_fulfillment",
  "redemption_status",
  "green_point_action",
];

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  console.log("Connected. Dropping stale tables + types…\n");

  for (const t of DROP_TABLES) {
    try {
      await client.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
      console.log(`  ✓ DROP TABLE ${t}`);
    } catch (err) {
      console.error(`  ✗ ${t}:`, err instanceof Error ? err.message : err);
    }
  }
  for (const ty of DROP_TYPES) {
    try {
      await client.query(`DROP TYPE IF EXISTS ${ty} CASCADE`);
      console.log(`  ✓ DROP TYPE ${ty}`);
    } catch (err) {
      console.error(`  ✗ ${ty}:`, err instanceof Error ? err.message : err);
    }
  }

  // Drop optional cleanup-only functions that might collide with migration 014.
  for (const fn of ["redeem_reward", "earn_green_points"]) {
    try {
      await client.query(`DROP FUNCTION IF EXISTS public.${fn} CASCADE`);
      console.log(`  ✓ DROP FUNCTION ${fn}`);
    } catch {
      /* ignore */
    }
  }

  await client.end();
  console.log("\nDone. Now run: npx tsx scripts/apply-migrations.ts");
}
main().catch((e) => { console.error(e); process.exit(1); });
