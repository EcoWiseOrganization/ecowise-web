/**
 * EcoWise demo data seeder.
 *
 * Creates a curated test dataset so the team can exercise every UI flow.
 * Re-runnable (idempotent) — looks up existing rows by natural key
 * (email, tax_code, etc.) before inserting.
 *
 * Usage:
 *   npx tsx scripts/seed-demo.ts
 *
 * Required env (from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Demo credentials (printed at end):
 *   sysadmin: demo+sysadmin@ecowise.local  / EcoWise2026!
 *   orgadmin: demo+orgadmin1@ecowise.local / EcoWise2026!
 *   ...
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ── Env loader ─────────────────────────────────────────────────────────────
function loadDotenv(path: string) {
  if (!existsSync(path)) return {};
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
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(2);
}

const db: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ROLE_ADMIN_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const ROLE_MEMBER_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

// EmissionCategories seeded by migration 002
const CAT_ELECTRICITY = "c1000000-0000-0000-0000-000000000001";
const CAT_TRAVEL = "c1000000-0000-0000-0000-000000000002";
const CAT_FUEL = "c1000000-0000-0000-0000-000000000003";

const PASSWORD = "EcoWise2026!";

// ── Personas ──────────────────────────────────────────────────────────────
const USERS = [
  // System admin
  {
    key: "sysadmin",
    email: "demo+sysadmin@ecowise.local",
    full_name: "Trần Thị Linh",
    user_name: "linh.tran",
    phone: "+84 901 111 222",
    bio: "EcoWise platform administrator.",
    is_admin: true,
  },
  // Org A (Tech Innovators VN) — admin + 2 employees
  {
    key: "tech_admin",
    email: "demo+techadmin@ecowise.local",
    full_name: "Nguyễn Văn Minh",
    user_name: "minh.nguyen",
    phone: "+84 902 222 333",
    bio: "Sustainability lead, Tech Innovators Vietnam.",
    is_admin: false,
  },
  {
    key: "tech_emp1",
    email: "demo+techemp1@ecowise.local",
    full_name: "Lê Hồng Hạnh",
    user_name: "hanh.le",
    is_admin: false,
  },
  {
    key: "tech_emp2",
    email: "demo+techemp2@ecowise.local",
    full_name: "Phạm Quang Đức",
    user_name: "duc.pham",
    is_admin: false,
  },
  // Org B (Green Manufacturing) — admin + 1 employee
  {
    key: "mfg_admin",
    email: "demo+mfgadmin@ecowise.local",
    full_name: "Vũ Đức Long",
    user_name: "long.vu",
    phone: "+84 903 333 444",
    bio: "Operations director, Green Manufacturing Co.",
    is_admin: false,
  },
  {
    key: "mfg_emp1",
    email: "demo+mfgemp1@ecowise.local",
    full_name: "Trần Bích Ngọc",
    user_name: "ngoc.tran",
    is_admin: false,
  },
  // Individual users (no org membership)
  {
    key: "indiv1",
    email: "demo+indiv1@ecowise.local",
    full_name: "Đỗ Thu Trang",
    user_name: "trang.do",
    phone: "+84 904 444 555",
    bio: "Climate-conscious individual.",
    is_admin: false,
  },
  {
    key: "indiv2",
    email: "demo+indiv2@ecowise.local",
    full_name: "Hoàng Nam Anh",
    user_name: "anh.hoang",
    is_admin: false,
  },
];

// ── Orgs ──────────────────────────────────────────────────────────────────
const ORGS = [
  {
    key: "tech",
    legal_name: "Tech Innovators Vietnam JSC",
    tax_code: "0312345678",
    org_type: "Enterprise",
    industry: "Technology",
    contact_email: "esg@techinnovators.vn",
    website_url: "https://techinnovators.vn",
    address: "12 Đường Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    verification_status: "Verified",
    admin: "tech_admin",
    employees: ["tech_emp1", "tech_emp2"],
  },
  {
    key: "mfg",
    legal_name: "Green Manufacturing Co. Ltd",
    tax_code: "0398765432",
    org_type: "SME",
    industry: "Manufacturing",
    contact_email: "operations@greenmfg.vn",
    website_url: "https://greenmfg.vn",
    address: "KCN VSIP Hải Phòng, Đường số 3, Phường Hùng Vương",
    verification_status: "Pending",
    admin: "mfg_admin",
    employees: ["mfg_emp1"],
  },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────

const ids: Record<string, string> = {};

async function ensureAuthUser(p: (typeof USERS)[number]): Promise<string> {
  const { data: list, error: listErr } = await db.auth.admin.listUsers({
    perPage: 1000,
  });
  if (listErr) throw new Error(`listUsers: ${listErr.message}`);
  const existing = list?.users.find((u) => u.email === p.email);
  if (existing) {
    console.log(`  · ${p.email} exists`);
    return existing.id;
  }
  const { data, error } = await db.auth.admin.createUser({
    email: p.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: p.full_name },
  });
  if (error || !data.user) throw new Error(`createUser ${p.email}: ${error?.message}`);
  console.log(`  ✓ created ${p.email}`);
  return data.user.id;
}

async function upsertUserProfile(userId: string, p: (typeof USERS)[number]) {
  const { error } = await db.from("User").upsert(
    {
      id: userId,
      email: p.email,
      full_name: p.full_name,
      user_name: p.user_name,
      phone: (p as { phone?: string }).phone ?? null,
      bio: (p as { bio?: string }).bio ?? null,
      is_admin: p.is_admin,
      status: "active",
      green_points: 0,
    },
    { onConflict: "id" }
  );
  if (error) throw new Error(`upsert User ${p.email}: ${error.message}`);
}

async function ensureOrg(o: (typeof ORGS)[number]): Promise<string> {
  const { data: existing } = await db
    .from("Organization")
    .select("id")
    .eq("tax_code", o.tax_code)
    .maybeSingle();
  if (existing?.id) {
    console.log(`  · ${o.legal_name} exists`);
    // patch metadata
    await db
      .from("Organization")
      .update({
        legal_name: o.legal_name,
        org_type: o.org_type,
        industry: o.industry,
        contact_email: o.contact_email,
        website_url: o.website_url,
        address: o.address,
        verification_status: o.verification_status,
      })
      .eq("id", existing.id);
    return existing.id as string;
  }
  const { data, error } = await db
    .from("Organization")
    .insert({
      legal_name: o.legal_name,
      tax_code: o.tax_code,
      org_type: o.org_type,
      industry: o.industry,
      contact_email: o.contact_email,
      website_url: o.website_url,
      address: o.address,
      verification_status: o.verification_status,
      created_by: ids[o.admin],
    })
    .select("id")
    .single();
  if (error) throw new Error(`insert org ${o.legal_name}: ${error.message}`);
  console.log(`  ✓ created ${o.legal_name}`);
  return data!.id as string;
}

async function ensureMember(opts: {
  orgId: string;
  userId: string;
  roleId: string;
  createdBy: string;
}): Promise<void> {
  const { data: existing } = await db
    .from("OrganizationMembers")
    .select("id")
    .eq("org_id", opts.orgId)
    .eq("user_id", opts.userId)
    .maybeSingle();
  if (existing) return;
  const { error } = await db.from("OrganizationMembers").insert({
    org_id: opts.orgId,
    user_id: opts.userId,
    role_id: opts.roleId,
    status: "Active",
    created_by: opts.createdBy,
  });
  if (error) throw new Error(`insert member: ${error.message}`);
}

function dateAgoDays(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

async function ensureEmissionLogs(orgKey: "tech" | "mfg") {
  const orgId = ids[`org_${orgKey}`];
  const adminId = ids[orgKey === "tech" ? "tech_admin" : "mfg_admin"];
  const empIds =
    orgKey === "tech"
      ? [ids.tech_emp1, ids.tech_emp2]
      : [ids.mfg_emp1];
  const members = [adminId, ...empIds];

  // Don't re-seed if already > 5 logs
  const { count } = await db
    .from("EmissionLogs")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  if ((count ?? 0) > 5) {
    console.log(`  · ${orgKey} already has ${count} logs, skip`);
    return;
  }

  const logs: Array<{
    activity_name: string;
    scope: "Scope 1" | "Scope 2" | "Scope 3";
    source_type_id: string;
    reporting_date: string;
    quantity: number;
    unit: string;
    co2e_result: number;
    status: "Pending" | "Verified" | "Review";
    created_by: string;
    factor_id: string;
    factor_value: number;
    factor_gwp: number;
    factor_unit: string;
    factor_version: string;
    factor_source: string;
  }> = [];

  // 6 months × 1 electricity log/month
  for (let m = 0; m < 6; m++) {
    const kwh = 1200 + Math.round(Math.random() * 800);
    logs.push({
      activity_name: `Văn phòng — Điện ${kwh} kWh`,
      scope: "Scope 2",
      source_type_id: CAT_ELECTRICITY,
      reporting_date: dateAgoDays(15 + m * 30),
      quantity: kwh,
      unit: "kWh",
      co2e_result: Math.round(kwh * 0.5571 * 100) / 100,
      status: m < 4 ? "Verified" : "Pending",
      created_by: members[m % members.length],
      factor_id: "ef000000-0000-0000-0000-000000000001",
      factor_value: 0.5571,
      factor_gwp: 1,
      factor_unit: "kgCO2e/kWh",
      factor_version: "2022",
      factor_source: "MONRE_VN",
    });
  }
  // Business travel: 3 flights
  const flights = [
    { name: "HCM → Hà Nội (công tác)", km: 1180 },
    { name: "HCM → Đà Nẵng (hội nghị)", km: 620 },
    { name: "Hà Nội → Singapore (đối tác)", km: 2200 },
  ];
  for (let i = 0; i < flights.length; i++) {
    const f = flights[i];
    logs.push({
      activity_name: f.name,
      scope: "Scope 3",
      source_type_id: CAT_TRAVEL,
      reporting_date: dateAgoDays(20 + i * 25),
      quantity: f.km,
      unit: "km",
      co2e_result: Math.round(f.km * 0.19 * 100) / 100,
      status: "Verified",
      created_by: empIds[i % empIds.length],
      factor_id: "ef000000-0000-0000-0000-000000000002",
      factor_value: 0.19,
      factor_gwp: 1,
      factor_unit: "kgCO2e/km",
      factor_version: "2022",
      factor_source: "DEFRA",
    });
  }
  // Fuel: only for manufacturing
  if (orgKey === "mfg") {
    for (let m = 0; m < 3; m++) {
      const liters = 300 + Math.round(Math.random() * 200);
      logs.push({
        activity_name: `Diesel xe tải đội ${m + 1}`,
        scope: "Scope 1",
        source_type_id: CAT_FUEL,
        reporting_date: dateAgoDays(30 + m * 30),
        quantity: liters,
        unit: "L",
        co2e_result: Math.round(liters * 2.68 * 100) / 100,
        status: "Verified",
        created_by: adminId,
        factor_id: "ef000000-0000-0000-0000-000000000002",
        factor_value: 2.68,
        factor_gwp: 1,
        factor_unit: "kgCO2e/L",
        factor_version: "2022",
        factor_source: "IPCC",
      });
    }
  }

  const { error } = await db.from("EmissionLogs").insert(
    logs.map((l) => ({ ...l, org_id: orgId }))
  );
  if (error) throw new Error(`insert logs ${orgKey}: ${error.message}`);
  console.log(`  ✓ inserted ${logs.length} logs for ${orgKey}`);
}

async function ensurePersonalLogs(userKey: "indiv1" | "indiv2") {
  const userId = ids[userKey];
  const { count } = await db
    .from("EmissionLogs")
    .select("id", { count: "exact", head: true })
    .is("org_id", null)
    .eq("created_by", userId);
  if ((count ?? 0) > 3) return;

  const logs = [
    {
      activity_name: "Hóa đơn điện chung cư tháng 4",
      scope: "Scope 2" as const,
      source_type_id: CAT_ELECTRICITY,
      reporting_date: dateAgoDays(60),
      quantity: 280,
      unit: "kWh",
      co2e_result: Math.round(280 * 0.5571 * 100) / 100,
      status: "Verified" as const,
    },
    {
      activity_name: "Hóa đơn điện chung cư tháng 5",
      scope: "Scope 2" as const,
      source_type_id: CAT_ELECTRICITY,
      reporting_date: dateAgoDays(30),
      quantity: 310,
      unit: "kWh",
      co2e_result: Math.round(310 * 0.5571 * 100) / 100,
      status: "Verified" as const,
    },
    {
      activity_name: "Đi máy bay du lịch Phú Quốc",
      scope: "Scope 3" as const,
      source_type_id: CAT_TRAVEL,
      reporting_date: dateAgoDays(45),
      quantity: 900,
      unit: "km",
      co2e_result: Math.round(900 * 0.19 * 100) / 100,
      status: "Verified" as const,
    },
  ];

  const { error } = await db.from("EmissionLogs").insert(
    logs.map((l) => ({
      ...l,
      org_id: null,
      created_by: userId,
      factor_value: l.source_type_id === CAT_ELECTRICITY ? 0.5571 : 0.19,
      factor_gwp: 1,
      factor_unit: l.source_type_id === CAT_ELECTRICITY ? "kgCO2e/kWh" : "kgCO2e/km",
      factor_version: "2022",
      factor_source: l.source_type_id === CAT_ELECTRICITY ? "MONRE_VN" : "DEFRA",
    }))
  );
  if (error) throw new Error(`personal logs ${userKey}: ${error.message}`);
  console.log(`  ✓ ${logs.length} personal logs for ${userKey}`);
}

async function ensureEvents() {
  const techOrg = ids.org_tech;
  const mfgOrg = ids.org_mfg;
  const events = [
    {
      org_id: techOrg,
      name: "Tech Innovators Green Day 2026",
      event_type: "Conference",
      status: "Active",
      start_date: dateAgoDays(-13),
      end_date: dateAgoDays(-15),
      created_by: ids.tech_admin,
    },
    {
      org_id: techOrg,
      name: "Annual ESG Webinar Q1",
      event_type: "Webinar",
      status: "Scheduled",
      start_date: dateAgoDays(-30),
      end_date: dateAgoDays(-30),
      created_by: ids.tech_admin,
    },
    {
      org_id: mfgOrg,
      name: "Workshop Đo lường phát thải xưởng",
      event_type: "Workshop",
      status: "Completed",
      start_date: dateAgoDays(45),
      end_date: dateAgoDays(45),
      created_by: ids.mfg_admin,
    },
  ];

  for (const e of events) {
    const { data: existing } = await db
      .from("Events")
      .select("id")
      .eq("org_id", e.org_id)
      .eq("name", e.name)
      .maybeSingle();
    if (existing) {
      ids[`event_${e.name}`] = existing.id as string;
      continue;
    }
    const { data, error } = await db
      .from("Events")
      .insert(e)
      .select("id")
      .single();
    if (error) throw new Error(`event ${e.name}: ${error.message}`);
    ids[`event_${e.name}`] = data!.id as string;
    console.log(`  ✓ event ${e.name}`);
  }
}

async function ensurePublicForm() {
  const eventId = ids["event_Tech Innovators Green Day 2026"];
  const orgId = ids.org_tech;
  const { data: existing } = await db
    .from("EventPublicForms")
    .select("id, token")
    .eq("event_id", eventId)
    .maybeSingle();
  let formId: string;
  let token: string;
  if (existing) {
    formId = existing.id as string;
    token = existing.token as string;
  } else {
    const fields = [
      { key: "attendee_email", type: "email", labelKey: "publicForm.field.email" },
      { key: "transport_mode", type: "select", labelKey: "publicForm.field.transport", required: true },
      { key: "distance_km", type: "number", labelKey: "publicForm.field.distance", required: true },
      { key: "round_trip", type: "checkbox", labelKey: "publicForm.field.roundTrip", default: true },
      { key: "diet", type: "select", labelKey: "publicForm.field.diet", required: true },
      { key: "meals_count", type: "number", labelKey: "publicForm.field.meals", default: 2 },
      { key: "hotel_nights", type: "number", labelKey: "publicForm.field.hotelNights", default: 0 },
    ];
    const { data, error } = await db
      .from("EventPublicForms")
      .insert({
        event_id: eventId,
        org_id: orgId,
        fields,
        welcome_message:
          "Chào mừng đến Green Day 2026! Hãy điền form để chúng tôi tính dấu chân carbon của sự kiện.",
        brand_color: "#1F8505",
        status: "Published",
        created_by: ids.tech_admin,
      })
      .select("id, token")
      .single();
    if (error) throw new Error(`public form: ${error.message}`);
    formId = data!.id as string;
    token = data!.token as string;
    console.log(`  ✓ public form token=${token}`);
  }

  // 3 sample submissions
  const { count } = await db
    .from("EventPublicSubmissions")
    .select("id", { count: "exact", head: true })
    .eq("form_id", formId);
  if ((count ?? 0) >= 3) return token;

  const submissions = [
    { transport: "flight_economy", distance: 1180, round_trip: true, diet: "standard", meals: 2, nights: 1, co2e: 1180 * 2 * 0.255 + 2 * 2.5 + 13.5 },
    { transport: "car_petrol", distance: 350, round_trip: false, diet: "vegetarian", meals: 1, nights: 0, co2e: 350 * 0.171 + 1.4 },
    { transport: "train", distance: 850, round_trip: true, diet: "vegan", meals: 2, nights: 0, co2e: 850 * 2 * 0.041 + 2 * 0.9 },
  ];
  for (const s of submissions) {
    // Create matching EmissionLog
    const { data: log } = await db
      .from("EmissionLogs")
      .insert({
        org_id: orgId,
        activity_name: `Event submission (${s.transport})`,
        scope: "Scope 3",
        reporting_date: dateAgoDays(-14),
        quantity: s.distance * (s.round_trip ? 2 : 1) || 1,
        unit: "submission",
        co2e_result: Math.round(s.co2e * 100) / 100,
        status: "Pending",
      })
      .select("id")
      .single();
    await db.from("EventPublicSubmissions").insert({
      form_id: formId,
      event_id: eventId,
      org_id: orgId,
      submitted_data: {
        transport_mode: s.transport,
        distance_km: s.distance,
        round_trip: s.round_trip,
        diet: s.diet,
        meals_count: s.meals,
        hotel_nights: s.nights,
      },
      computed_co2e: Math.round(s.co2e * 100) / 100,
      emission_log_id: log?.id,
    });
  }
  console.log(`  ✓ 3 public submissions`);
  return token;
}

async function ensureCarbonTargets() {
  // Personal target for indiv1
  const userId = ids.indiv1;
  const { data: existing } = await db
    .from("CarbonTargets")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "Active")
    .maybeSingle();
  if (!existing) {
    await db.from("CarbonTargets").insert({
      user_id: userId,
      name: "Giảm 30% CO2 cá nhân 2026",
      baseline_co2e: 1500,
      target_co2e: 1050,
      start_date: dateAgoDays(60),
      end_date: dateAgoDays(-300),
      status: "Active",
      notes: "Target reduce 30% từ baseline trung bình 2025.",
      created_by: userId,
    });
    console.log("  ✓ personal target");
  }

  // Org target for tech
  const orgId = ids.org_tech;
  const { data: orgExisting } = await db
    .from("CarbonTargets")
    .select("id")
    .eq("org_id", orgId)
    .eq("status", "Active")
    .maybeSingle();
  if (!orgExisting) {
    await db.from("CarbonTargets").insert({
      org_id: orgId,
      name: "Net Zero 2050 — Phase 1 (FY2026 -15%)",
      baseline_co2e: 12000,
      target_co2e: 10200,
      start_date: dateAgoDays(180),
      end_date: dateAgoDays(-180),
      status: "Active",
      notes: "Phase 1 lộ trình Net Zero 2050: giảm 15% trong FY2026.",
      created_by: ids.tech_admin,
    });
    console.log("  ✓ org target");
  }
}

async function ensureSubscriptions() {
  // Tech Innovators → B2B_PRO Active
  const { data: pro } = await db
    .from("SubscriptionPlans")
    .select("id, billing_cycle, base_price_usd, plan_name")
    .eq("plan_code", "B2B_PRO")
    .single();
  const { data: basic } = await db
    .from("SubscriptionPlans")
    .select("id, billing_cycle, base_price_usd, plan_name")
    .eq("plan_code", "B2B_BASIC")
    .single();
  const { data: free } = await db
    .from("SubscriptionPlans")
    .select("id, plan_name")
    .eq("plan_code", "B2C_FREE")
    .single();

  if (!pro || !basic || !free) {
    console.warn("  ⚠ subscription plans missing — run migration 012");
    return;
  }

  const subs = [
    { subject_type: "Org", subject_id: ids.org_tech, plan_id: pro.id, plan: pro, by: ids.tech_admin },
    { subject_type: "Org", subject_id: ids.org_mfg, plan_id: basic.id, plan: basic, by: ids.mfg_admin },
    { subject_type: "User", subject_id: ids.indiv1, plan_id: free.id, plan: free, by: ids.indiv1 },
  ];

  for (const s of subs) {
    const { data: existing } = await db
      .from("Subscriptions")
      .select("id")
      .eq("subject_type", s.subject_type)
      .eq("subject_id", s.subject_id)
      .in("status", ["Trial", "Active", "PastDue"])
      .maybeSingle();
    if (existing) continue;

    const start = new Date();
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const { data: sub } = await db
      .from("Subscriptions")
      .insert({
        subject_type: s.subject_type,
        subject_id: s.subject_id,
        plan_id: s.plan_id,
        status: "Active",
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
        auto_renew: true,
        billing_email:
          s.subject_type === "Org"
            ? s.subject_id === ids.org_tech
              ? "billing@techinnovators.vn"
              : "billing@greenmfg.vn"
            : "demo+indiv1@ecowise.local",
        billing_company_name:
          s.subject_id === ids.org_tech
            ? "Tech Innovators Vietnam JSC"
            : s.subject_id === ids.org_mfg
              ? "Green Manufacturing Co. Ltd"
              : null,
        created_by: s.by,
      })
      .select("id")
      .single();

    if (sub) {
      // Paid invoice
      const price = Number((s.plan as { base_price_usd?: number }).base_price_usd ?? 0);
      const invNumber = `INV-${start.toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await db.from("Invoices").insert({
        subscription_id: sub.id,
        invoice_number: invNumber,
        subject_type: s.subject_type,
        subject_id: s.subject_id,
        billing_reason: "new_subscription",
        amount: price,
        currency: "USD",
        status: price === 0 ? "Paid" : "Paid",
        issue_date: start.toISOString().slice(0, 10),
        due_date: end.toISOString().slice(0, 10),
        paid_at: start.toISOString(),
        line_items: [
          {
            description: `${(s.plan as { plan_name: string }).plan_name} (${(s.plan as { billing_cycle?: string }).billing_cycle ?? "Monthly"})`,
            quantity: 1,
            unit_price: price,
            amount: price,
          },
        ],
        created_by: s.by,
      });
      console.log(`  ✓ subscription ${(s.plan as { plan_name: string }).plan_name} for ${s.subject_id.slice(0, 8)}`);
    }
  }
}

async function ensureChallenges() {
  const challenges: Array<{
    name: string;
    category: string;
    org_id: string | null;
    description: string;
    points_reward: number;
    duration_days: number;
    verification_method: "Honor" | "Photo" | "Auto";
    status: "Active" | "Upcoming";
    start_date: string;
    end_date: string;
    rules: Record<string, number>;
    created_by: string;
  }> = [
    {
      name: "Energy Saver Week",
      category: "Energy",
      org_id: null,
      description: "Log 5 hoạt động tiết kiệm điện trong vòng 7 ngày. Hoàn thành để nhận +200 green points.",
      points_reward: 200,
      duration_days: 7,
      verification_method: "Honor",
      status: "Active",
      start_date: dateAgoDays(2),
      end_date: dateAgoDays(-5),
      rules: { required_count: 5 },
      created_by: ids.sysadmin,
    },
    {
      name: "Bike to Work Month",
      category: "Transport",
      org_id: null,
      description: "Đi xe đạp / đi bộ làm việc ít nhất 10 ngày trong tháng.",
      points_reward: 350,
      duration_days: 30,
      verification_method: "Honor",
      status: "Upcoming",
      start_date: dateAgoDays(-7),
      end_date: dateAgoDays(-37),
      rules: { required_count: 10 },
      created_by: ids.sysadmin,
    },
    {
      name: "Tech Innovators Carbon Heroes",
      category: "Office",
      org_id: ids.org_tech,
      description: "Internal challenge cho team Tech Innovators — log 3 sáng kiến giảm phát thải.",
      points_reward: 150,
      duration_days: 14,
      verification_method: "Honor",
      status: "Active",
      start_date: dateAgoDays(5),
      end_date: dateAgoDays(-9),
      rules: { required_count: 3 },
      created_by: ids.tech_admin,
    },
  ];

  for (const c of challenges) {
    const { data: existing } = await db
      .from("Challenges")
      .select("id")
      .eq("name", c.name)
      .maybeSingle();
    if (existing) {
      ids[`challenge_${c.name}`] = existing.id as string;
      continue;
    }
    const { data, error } = await db
      .from("Challenges")
      .insert(c)
      .select("id")
      .single();
    if (error) throw new Error(`challenge ${c.name}: ${error.message}`);
    ids[`challenge_${c.name}`] = data!.id as string;
    console.log(`  ✓ challenge ${c.name}`);
  }
}

async function ensureUserChallenges() {
  // indiv1 joined Energy Saver Week
  const ch1 = ids["challenge_Energy Saver Week"];
  const { data: ex1 } = await db
    .from("UserChallenges")
    .select("id")
    .eq("user_id", ids.indiv1)
    .eq("challenge_id", ch1)
    .maybeSingle();
  if (!ex1) {
    await db.from("UserChallenges").insert({
      user_id: ids.indiv1,
      challenge_id: ch1,
      status: "Joined",
      progress: { count: 2 },
    });
    console.log("  ✓ indiv1 joined Energy Saver Week");
  }

  // tech_emp1 completed Tech Innovators challenge
  const ch3 = ids["challenge_Tech Innovators Carbon Heroes"];
  const { data: ex3 } = await db
    .from("UserChallenges")
    .select("id, status")
    .eq("user_id", ids.tech_emp1)
    .eq("challenge_id", ch3)
    .maybeSingle();
  if (!ex3 || ex3.status !== "Completed") {
    await db.from("UserChallenges").upsert(
      {
        user_id: ids.tech_emp1,
        challenge_id: ch3,
        status: "Completed",
        progress: { count: 3 },
        completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,challenge_id" }
    );
    // Award points via RPC
    await db.rpc("earn_green_points", {
      p_user_id: ids.tech_emp1,
      p_points: 150,
      p_reason: "Challenge completed: Tech Innovators Carbon Heroes",
      p_related_id: ch3,
      p_related_type: "challenge",
    });
    console.log("  ✓ tech_emp1 completed challenge + 150 pts");
  }
}

async function ensurePointsFromVerifiedLogs() {
  // Award 10 pts per Verified log owned by each user (idempotent via marker reason)
  for (const userKey of ["tech_admin", "tech_emp1", "tech_emp2", "mfg_admin", "mfg_emp1", "indiv1", "indiv2"]) {
    const userId = ids[userKey];
    // count Verified logs by this user
    const { count: verifiedCount } = await db
      .from("EmissionLogs")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId)
      .eq("status", "Verified");

    // count existing earn logs from these
    const { count: existingPts } = await db
      .from("GreenPointLogs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("related_type", "emission_log");

    const toAward = Math.max(0, (verifiedCount ?? 0) - (existingPts ?? 0));
    for (let i = 0; i < toAward; i++) {
      await db.rpc("earn_green_points", {
        p_user_id: userId,
        p_points: 10,
        p_reason: "Verified emission log",
        p_related_id: null,
        p_related_type: "emission_log",
      });
    }
    if (toAward > 0)
      console.log(`  ✓ ${userKey}: +${toAward * 10} pts (${toAward} verified logs)`);
  }
}

async function ensureRedemption() {
  // Find a reward for indiv1 to redeem (using "Premium Discount Code" 150 pts)
  const { data: reward } = await db
    .from("Rewards")
    .select("id")
    .eq("sku", "CODE-PRO")
    .maybeSingle();
  if (!reward) return;
  const { data: existing } = await db
    .from("Redemptions")
    .select("id")
    .eq("user_id", ids.indiv1)
    .eq("reward_id", reward.id)
    .maybeSingle();
  if (existing) return;

  // Make sure indiv1 has enough points — top up if needed
  const { data: u } = await db
    .from("User")
    .select("green_points")
    .eq("id", ids.indiv1)
    .single();
  if ((u?.green_points ?? 0) < 200) {
    await db.rpc("earn_green_points", {
      p_user_id: ids.indiv1,
      p_points: 200,
      p_reason: "Demo seed bonus",
      p_related_id: null,
      p_related_type: "demo_seed",
    });
  }

  try {
    await db.rpc("redeem_reward", {
      p_reward_id: reward.id,
      p_user_id: ids.indiv1,
    });
    console.log("  ✓ indiv1 redeemed Premium Discount Code");
  } catch (err) {
    console.error("  ⚠ redeem failed:", err);
  }
}

async function ensureUserBadges() {
  // Award FIRST_LOG to anyone who has emission logs.
  const { data: firstLog } = await db
    .from("Badges")
    .select("id")
    .eq("code", "FIRST_LOG")
    .single();
  if (!firstLog) return;
  for (const userKey of ["tech_emp1", "tech_emp2", "mfg_emp1", "indiv1", "indiv2"]) {
    const userId = ids[userKey];
    const { count } = await db
      .from("EmissionLogs")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId);
    if ((count ?? 0) === 0) continue;
    await db.from("UserBadges").upsert(
      { user_id: userId, badge_id: firstLog.id },
      { onConflict: "user_id,badge_id" }
    );
  }
  console.log("  ✓ awarded FIRST_LOG badges");
}

async function ensureContactMessages() {
  const { count } = await db
    .from("ContactMessages")
    .select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 4) return;

  const msgs = [
    {
      name: "Trần Văn Bình",
      email: "binh.tran@example.com",
      subject: "Tư vấn gói Enterprise",
      message:
        "Chào EcoWise team, công ty chúng tôi 200 nhân viên, muốn tư vấn gói Enterprise. Liên hệ giúp.",
      status: "new",
    },
    {
      name: "Maria Nguyen",
      email: "maria@green-ngo.org",
      subject: "Partnership for NGO pricing",
      message: "We are a Vietnamese NGO working on community sustainability. Do you have NGO pricing?",
      status: "read",
    },
    {
      name: "Phạm Quốc Việt",
      email: "viet.pham@startup.vn",
      subject: "API access cho startup",
      message: "Startup 5 người, muốn dùng API EcoWise track emissions cho customer. Có sandbox không?",
      status: "new",
    },
    {
      name: "Anonymous",
      email: "noreply@spam.example",
      subject: null,
      message: "Buy cheap watches now!!!",
      status: "spam",
    },
  ];
  for (const m of msgs) {
    await db.from("ContactMessages").insert(m);
  }
  console.log(`  ✓ 4 contact messages`);
}

// ── Main orchestration ────────────────────────────────────────────────────

async function main() {
  console.log("EcoWise demo seeder\n");

  console.log("1. Auth users");
  for (const p of USERS) {
    const id = await ensureAuthUser(p);
    ids[p.key] = id;
    await upsertUserProfile(id, p);
  }

  console.log("\n2. Organizations");
  for (const o of ORGS) {
    const id = await ensureOrg(o);
    ids[`org_${o.key}`] = id;
    await ensureMember({
      orgId: id,
      userId: ids[o.admin],
      roleId: ROLE_ADMIN_ID,
      createdBy: ids[o.admin],
    });
    for (const empKey of o.employees) {
      await ensureMember({
        orgId: id,
        userId: ids[empKey],
        roleId: ROLE_MEMBER_ID,
        createdBy: ids[o.admin],
      });
    }
  }

  console.log("\n3. Org emission logs");
  await ensureEmissionLogs("tech");
  await ensureEmissionLogs("mfg");

  console.log("\n4. Personal emission logs");
  await ensurePersonalLogs("indiv1");
  await ensurePersonalLogs("indiv2");

  console.log("\n5. Events");
  await ensureEvents();

  console.log("\n6. Public form + guest submissions");
  const formToken = await ensurePublicForm();

  console.log("\n7. Carbon targets");
  await ensureCarbonTargets();

  console.log("\n8. Subscriptions + invoices");
  await ensureSubscriptions();

  console.log("\n9. Challenges");
  await ensureChallenges();

  console.log("\n10. User challenges + green points");
  await ensureUserChallenges();
  await ensurePointsFromVerifiedLogs();

  console.log("\n11. Badges + redemptions");
  await ensureUserBadges();
  await ensureRedemption();

  console.log("\n12. Contact messages");
  await ensureContactMessages();

  console.log("\n=========================================");
  console.log("Demo data seeded successfully.\n");
  console.log("Credentials (password: " + PASSWORD + "):");
  for (const u of USERS) {
    console.log(`  ${u.email.padEnd(40)} — ${u.full_name}`);
  }
  console.log("\nPublic event form (Tech Innovators Green Day 2026):");
  console.log(`  /event-form/${formToken}`);
  console.log("\nSign in at https://ecowise-red.vercel.app or http://localhost:3000");
}

main().catch((err) => {
  console.error("\n✗ Seeder failed:", err);
  process.exit(1);
});
