import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  estimateCo2eKg,
  scopeForSubmission,
  validateSubmission,
  type PublicFormSubmission,
} from "@/lib/event-form";
import { writeAuditLog } from "@/services/audit.service";
import { readJsonBodyWithLimit } from "@/lib/json-body";
import { hashIpForStorage } from "@/lib/ip-hash";
import { MSG } from "@/lib/messages";

interface ContextParams {
  params: Promise<{ token: string }>;
}

const RATE_WINDOW_SEC = 60 * 60; // 1 hour
const RATE_MAX_PER_IP = 10;
// Public event-form submissions are small structured JSON (transport
// mode, distance, diet, etc.) — anything beyond a few KB is hostile or
// broken.
const MAX_BODY_BYTES = 16 * 1024;

function ipFrom(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null
  );
}

// GET — return the form config for the public page (no PII).
export async function GET(_req: Request, { params }: ContextParams) {
  const { token } = await params;
  const db = createServiceClient();
  const { data: form } = await db
    .from("EventPublicForms")
    .select(
      "id, event_id, org_id, fields, welcome_message, brand_color, status, expires_at",
    )
    .eq("token", token)
    .maybeSingle();

  if (!form) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (form.status !== "Published") {
    return NextResponse.json({ error: "FORM_CLOSED" }, { status: 403 });
  }
  // Expired-token check — added in migration 024. Collapse to FORM_CLOSED
  // so we never confirm "this token used to exist but now doesn't".
  if (form.expires_at && new Date(form.expires_at) < new Date()) {
    return NextResponse.json({ error: "FORM_CLOSED" }, { status: 403 });
  }

  // Pull the event name + org legal name for display only.
  const [eventRes, orgRes] = await Promise.all([
    db.from("Events").select("id, name, start_date, end_date").eq("id", form.event_id).single(),
    db.from("Organization").select("id, legal_name, logo_url").eq("id", form.org_id).single(),
  ]);

  return NextResponse.json({
    form: {
      id: form.id,
      fields: form.fields,
      welcome_message: form.welcome_message,
      brand_color: form.brand_color,
    },
    event: eventRes.data,
    organization: orgRes.data,
  });
}

// POST — submit data, persist + auto-create EmissionLog.
export async function POST(req: Request, { params }: ContextParams) {
  const { token } = await params;
  const ip = ipFrom(req);
  const ua = req.headers.get("user-agent");
  const db = createServiceClient();

  // 1. Verify token + form is Published + token hasn't expired
  const { data: form } = await db
    .from("EventPublicForms")
    .select("id, event_id, org_id, status, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!form) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (form.status !== "Published") {
    return NextResponse.json({ error: "FORM_CLOSED" }, { status: 403 });
  }
  if (form.expires_at && new Date(form.expires_at) < new Date()) {
    return NextResponse.json({ error: "FORM_CLOSED" }, { status: 403 });
  }

  // 2. Rate limit per (token, ip) — atomic via the
  // `consume_event_form_rate_limit` RPC (migration 030). The previous
  // SELECT-then-INSERT pattern was race-prone: N parallel submissions
  // could each observe count < max and then each insert a row,
  // bypassing the cap. The RPC takes a transaction-scoped advisory
  // lock keyed on (token, ip) so submissions for the same bucket
  // serialise while different buckets stay independent.
  const ipKey = ip && ip.trim().length > 0 ? ip : "anonymous";
  const { data: rlRows, error: rlErr } = await db.rpc(
    "consume_event_form_rate_limit",
    {
      p_token: token,
      p_ip: ipKey,
      p_max: RATE_MAX_PER_IP,
      p_window_sec: RATE_WINDOW_SEC,
    },
  );
  if (rlErr) {
    console.error("[event-form] rate-limit RPC failed", rlErr.message);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
  const rl = Array.isArray(rlRows) ? rlRows[0] : rlRows;
  const allowed = (rl as { allowed?: boolean } | null)?.allowed === true;
  if (!allowed) {
    const retryAfter =
      (rl as { retry_after_sec?: number } | null)?.retry_after_sec ?? RATE_WINDOW_SEC;
    return NextResponse.json(
      { error: "RATE_LIMITED", retryAfterSec: retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  // 3. Parse body + validate (with explicit size cap)
  const parsed = await readJsonBodyWithLimit(req, MAX_BODY_BYTES);
  if (!parsed.ok) {
    if (parsed.reason === "tooLarge") {
      return NextResponse.json({ error: "BODY_TOO_LARGE" }, { status: 413 });
    }
    return NextResponse.json({ error: MSG.INVALID_FORMAT }, { status: 400 });
  }
  if (!parsed.data || typeof parsed.data !== "object") {
    return NextResponse.json({ error: MSG.INVALID_FORMAT }, { status: 400 });
  }
  const raw = parsed.data as Record<string, unknown>;

  // Honeypot
  if (typeof raw.website === "string" && raw.website.trim().length > 0) {
    // Pretend success to keep bots in the dark.
    return NextResponse.json({ ok: true });
  }

  const submission: PublicFormSubmission = {
    attendee_email: typeof raw.attendee_email === "string" ? raw.attendee_email.trim() : undefined,
    transport_mode: raw.transport_mode as PublicFormSubmission["transport_mode"],
    distance_km: Number(raw.distance_km),
    round_trip: Boolean(raw.round_trip),
    diet: raw.diet as PublicFormSubmission["diet"],
    meals_count: Number(raw.meals_count ?? 0),
    hotel_nights: raw.hotel_nights !== undefined ? Number(raw.hotel_nights) : undefined,
  };

  const validation = validateSubmission(submission);
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.errorCode ?? MSG.INVALID_FORMAT },
      { status: 400 }
    );
  }

  // 4. Compute CO₂e + insert EmissionLogs row first so we can attach its id
  const co2e = estimateCo2eKg(submission);

  const { data: emissionLog, error: emissionErr } = await db
    .from("EmissionLogs")
    .insert({
      org_id: form.org_id,
      activity_name: `Event submission (${submission.transport_mode})`,
      scope: scopeForSubmission(),
      reporting_date: new Date().toISOString().slice(0, 10),
      quantity: (submission.distance_km ?? 0) * (submission.round_trip ? 2 : 1) || 1,
      unit: "submission",
      co2e_result: co2e,
      status: "Pending",
      // factor snapshot left NULL — these are public-form aggregates, not factor-driven.
    })
    .select("id")
    .single();

  if (emissionErr) {
    console.error("[event-form] emission insert failed", emissionErr.message);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  // 5. Persist submission + rate-limit row.
  //
  // Whitelist exactly the keys we expect, even though `submission` is
  // typed — the input was a `req.json()` blob and the original concern in
  // REVIEW.md was that arbitrary keys could ride along into JSONB
  // storage. Explicit object beats a typed cast for an attacker-facing
  // surface.
  const safeSubmittedData = {
    attendee_email: submission.attendee_email ?? null,
    transport_mode: submission.transport_mode,
    distance_km: submission.distance_km,
    round_trip: submission.round_trip,
    diet: submission.diet,
    meals_count: submission.meals_count,
    hotel_nights: submission.hotel_nights ?? null,
  } satisfies Record<string, unknown>;

  // Store a peppered HMAC of the IP instead of the raw address —
  // EventPublicSubmissions is retained for the lifetime of the event
  // (analytics, abuse review) and raw IPs paired with attendee_email
  // are a PII liability under most privacy regimes. The hash still
  // supports SQL-equality abuse correlation ("same hash submitting
  // across orgs"); it just stops the table from being a long-term
  // re-identification source.
  const ipHash = hashIpForStorage(ip);
  const { data: subRow, error: subErr } = await db
    .from("EventPublicSubmissions")
    .insert({
      form_id: form.id,
      event_id: form.event_id,
      org_id: form.org_id,
      submitted_by_email: submission.attendee_email ?? null,
      submitted_data: safeSubmittedData,
      computed_co2e: co2e,
      emission_log_id: (emissionLog as { id: string }).id,
      ip_address: ipHash,
      user_agent: ua,
    })
    .select("id")
    .single();

  if (subErr) {
    console.error("[event-form] submission insert failed", subErr.message);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }

  // The rate-limit row is now inserted atomically by
  // `consume_event_form_rate_limit` above — no second insert here.
  await writeAuditLog({
    action: "event_public_form_submitted",
    resourceType: "event_public_submission",
    resourceId: (subRow as { id: string }).id,
    orgId: form.org_id,
    actorRole: "guest",
    ipAddress: ipHash,
    userAgent: ua,
    newValue: { computed_co2e: co2e, transport: submission.transport_mode },
  });

  return NextResponse.json({ ok: true, computed_co2e: co2e });
}
