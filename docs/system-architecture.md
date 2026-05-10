# EcoWise — System Architecture

## High-level diagram (text)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  Browsers (Guest, Individual, Employee, Org Admin, System Admin)             │
└──────────┬─────────────────────────────────────────────────────────┬─────────┘
           │                                                         │
           ▼                                                         ▼
┌──────────────────────────────────────────┐         ┌────────────────────────────┐
│  Next.js (App Router, server-rendered)   │         │  Public form (no auth)     │
│  ─ Public marketing pages                │         │  /event-form/[token]       │
│  ─ Auth flows (Supabase + OTP via SMTP)  │         │  POST /api/public/...      │
│  ─ Dashboard (role-aware tabs)           │         └─────────────┬──────────────┘
│  ─ Admin console                         │                       │
│  ─ Server actions + API route handlers   │                       │
└──────────┬───────────────┬───────────────┘                       │
           │               │                                       │
           │ service-role  │ user JWT (cookie)                     │
           ▼               ▼                                       ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ Supabase Postgres                                                            │
│  ─ RLS on every app table                                                    │
│  ─ Triggers: BR-06 frozen factor, BR-07 published lock,                      │
│    BR-12 GreenPointLogs append-only, BR-16 AuditLogs immutable               │
│  ─ Atomic RPCs: redeem_reward, earn_green_points                             │
│ Supabase Auth   ─ email/password, Google OAuth, OTP table                    │
│ Supabase Storage ─ emission-evidence, avatars, report-archives               │
└────────────────┬─────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ External services (env-gated, optional)                                      │
│  ─ Gmail SMTP (Nodemailer)  →  branded transactional emails                  │
│  ─ Anthropic Claude vision  →  /api/ocr/extract                              │
│  ─ Vercel Cron              →  POST /api/cron/billing daily (BR-10)          │
│  ─ Mock payment             →  /api/payments/mock/[intentId]/confirm         │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Request flow examples

### Org Admin verifies an emission log (Phase 3 + Phase 9 wired)
1. Browser → `reviewEmissionLogAction(orgId, logId, "Verified")`.
2. `requireOrgRole(orgId, { adminOnly: true })` checks `OrganizationMembers`.
3. Service-role updates `EmissionLogs.status = 'Verified'`, `reviewed_by`, `reviewed_at`.
4. Trigger `audit_table_change('emission_log')` writes to `AuditLogs`.
5. Action queries the log's `created_by` and calls `awardPointsForVerifiedLog` → `earn_green_points` RPC → `User.green_points` += 10 + new `GreenPointLogs` row.
6. `revalidatePath` rerenders the review queue + overview.

### Guest submits event form (Phase 5, BR-08)
1. Browser POSTs JSON to `/api/public/event-form/[token]`.
2. Token + status check. Per-IP rate limit (`EventPublicFormRateLimits`). Honeypot.
3. CO₂e estimated by `estimateCo2eKg` (pure helper).
4. Insert `EmissionLogs` (Pending) + `EventPublicSubmissions` (links to the log).
5. `writeAuditLog({ action: "event_public_form_submitted", actor_role: "guest" })`.

### Subscription renewal cron (Phase 8)
1. Vercel Cron (or external scheduler) hits `POST /api/cron/billing` with `Authorization: Bearer ${CRON_SECRET}`.
2. `runLifecycleTick()` loads candidates, calls `decideLifecycleAction` for each.
3. Renewal_due → `attemptRenewal` (mock branch). Success → `Active`, +Invoice (Paid). Fail → `PastDue`, retry_count++, +Invoice (PendingPayment), +PaymentIntent.
4. `force_terminate` after 3 failures → `Canceled` + email.
5. Trial reminder 3 days before `trial_end` (deduped via `trial_reminder_sent_at`).

### OCR receipt scan (Phase 11)
1. Activity Logger uploads file to `/api/ocr/extract`.
2. `requireSession()` + MIME + size check (5MB).
3. If `ANTHROPIC_API_KEY` set → POST base64 image to `https://api.anthropic.com/v1/messages` with the OCR prompt.
4. `extractFields` parses JSON response, `fieldsToSuggestion` coerces canonical fields (date, quantity, unit, vendor, amount).
5. Returns `{ provider, fields, suggestion }`. Hook applies suggestion to form state.

## Trust boundaries

| Layer | Trust |
|---|---|
| Browser | Untrusted; never receive SUPABASE_SERVICE_ROLE_KEY |
| Server action / route handler | Trusted; runs `require*` then service-role queries |
| Supabase RLS | Last line of defense — every app table has policies |
| DB triggers | Enforce immutability (BR-16, BR-12), published lock (BR-07), audit logging |

## Multi-tenant isolation

- Every org-scoped table contains `org_id`. Server actions always pass `requireOrgRole(orgId)` before mutating.
- `is_emission_org_member(p_org_id)` and `is_emission_org_admin(p_org_id)` SECURITY DEFINER helpers used inside RLS policies, avoiding recursion.
- Reports + invoices subject-scoped via `subject_type` ENUM (`Org` | `User`).
- Personal logs use `org_id IS NULL AND created_by = auth.uid()`.

## Background processing

- **Daily cron** (`vercel.json` schedule `0 2 * * *`) → `POST /api/cron/billing`. Renews due subscriptions, terminates after BR-10 cap, sends trial reminders.
- **No queue / worker dyno** — Phase 8 chose synchronous lifecycle scan because volumes are small. Add Inngest / Cloud Tasks if it grows.

## Frontend conventions

- **Server components by default**, client islands only where state is needed.
- **Tabs** are client components inside the parent route group (e.g., `[orgId]/_components/OrgTabs.tsx`) to keep `usePathname` interactive.
- **Forms** dispatch through server actions returning `{ ok, data, error }` shape.
- **Errors** use `MSG` codes from `lib/messages.ts`; the UI looks them up in i18n via `t(\`error.${code}\`)`.
- **Downloads** use `lib/download.triggerBase64Download` to convert server-action base64 payloads to Blob URLs (PDF/XLSX/CSV exports).

## Performance notes (Phase 11)

Indexes added in migration 015:
- `EmissionLogs(created_by)`, `EmissionLogs(org_id, status)`
- `AuditLogs(org_id, created_at DESC)`
- `ContactMessages(status, created_at DESC)`
- `Subscriptions(status, current_period_end)` — speeds the lifecycle scan
- `Invoices(status, paid_at DESC)`
- `GreenPointLogs(action, created_at DESC)` — leaderboard window
- `Challenges(org_id, status)`, `Rewards(status, points_cost)`, `Redemptions(user_id, created_at DESC)`

PDF reports use `renderToBuffer`, which is fine for typical report sizes; switch to `renderToStream` if reports grow past a few hundred logs.

## Failure modes & graceful degradation

| Subsystem | What happens if it fails |
|---|---|
| Gmail SMTP | Email send returns `false`; DB state unaffected. |
| Anthropic OCR | Endpoint returns 502; UI surfaces `OCR_PROVIDER_ERROR`. Mock fallback when key missing. |
| Mock payment | Confirm idempotent. Failed network leaves intent `Pending` until retry. |
| Cron worker | Designed idempotent; rerunning is safe. Errors collected in report.errors[]. |
