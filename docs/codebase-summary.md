# EcoWise — Codebase Summary

> Snapshot taken 2026-05-11 after Phase 11. Scope: web only (mobile not implemented).

## Stack
| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (`strict: true`) |
| UI | React 19 · Tailwind CSS 4 · MUI 7 icons |
| Auth | Supabase Auth (email + OTP + Google OAuth) |
| Database | Supabase Postgres (15 migrations 001-015) with RLS everywhere |
| Storage | Supabase buckets: `emission-evidence`, `avatars`, `report-archives` |
| HTTP | Axios (legacy auth client) + native `fetch` |
| Email | Nodemailer over Gmail SMTP |
| PDF / XLSX / CSV | `@react-pdf/renderer`, `exceljs`, `papaparse` |
| Tests | Vitest 4 (`tests/unit/**`) — 151 tests, 16 files |
| Cron | Vercel Cron (`vercel.json`) → `POST /api/cron/billing` daily |
| OCR | Anthropic Claude vision (Phase 11) — env-gated, mock fallback |

## Top-level layout (relevant only)

```
src/
├── app/                                       Next App Router
│   ├── layout.tsx                             root layout (i18n + Toast providers)
│   ├── page.tsx                               landing
│   ├── (public)/                              About, Services, Contact pages
│   ├── (auth)/                                Login, Register, Forgot, Reset
│   ├── (public-form)/event-form/[token]/      Guest event submission
│   ├── (dashboard)/                           Authenticated zone
│   │   ├── (individual)/dashboard/            Individual + Org member views
│   │   │   ├── activity/                      Personal activity logger
│   │   │   ├── reports/  targets/  recommendations/  compare/
│   │   │   ├── billing/                       B2C subscription + invoices + checkout + cancel
│   │   │   ├── challenges/  rewards/  leaderboard/
│   │   │   ├── settings/{profile,password,danger}/
│   │   │   └── organization/[orgId]/          Org workspace (tabs)
│   │   │       ├── overview/  employees/  settings/
│   │   │       ├── emission-logs/{review,report}/
│   │   │       ├── billing/{,invoices,checkout/[id],cancel}/
│   │   │       ├── compliance/  challenges/
│   │   │       └── events/[eventId]/{,form-builder/}
│   │   └── admin/                             System Admin
│   │       ├── users/  emission-factors/  formula-builder/
│   │       ├── subscriptions/{,new,[id]/edit}/
│   │       ├── challenges/  rewards/{,new,[id]/edit}/
│   │       ├── system-overview/  audit-logs/
│   │       ├── organizations/{,[orgId]}/      Admin org manager
│   │       └── contact-messages/
│   ├── actions/                               Server actions ("use server")
│   └── api/                                   Route handlers
│       ├── auth/                              login, OTP, forgot, OAuth callback
│       ├── public/contact, public/event-form/[token]
│       ├── payments/mock/[intentId]/confirm   Mock gateway
│       ├── cron/billing[/simulate-fail/[id]]  Lifecycle worker
│       └── ocr/extract                        OCR provider gateway
├── components/                                Reusable UI
│   ├── shared/Header,Footer,PageHeader,...
│   ├── billing/SubscriptionCenter,CheckoutView,InvoiceList,InvoiceDetail,CancelFlow
│   ├── gamification/ChallengeForm,ChallengeList,RewardForm
│   └── ui/QrCode, Toast, ScrollReveal
├── hooks/                                     Client hooks
│   ├── useAuth, useLoginForm, useRegisterForm, useVerifyOtp,
│   │   useForgotPassword[Verify], useResetPassword
│   ├── useProfile, useChangePassword, useDeleteAccount
│   ├── usePersonalActivity, useEmployeeManager
│   ├── useOcrDataExtraction (real backend, Phase 11)
│   ├── useContactForm
│   └── useCreateOrganization, useCreateEvent
├── lib/
│   ├── supabase/{client,server,admin,service,middleware}.ts
│   ├── auth/roles.ts                          requireSession, requireSystemAdmin, requireOrgRole
│   ├── messages.ts                            MSG codes + ServiceResult helpers
│   ├── profile.ts, targets.ts, recommendations.ts
│   ├── billing.ts, subscription-lifecycle.ts
│   ├── event-form.ts                          Public form schema + CO2e estimator
│   ├── report-aggregator.ts, exporters/{csv,xlsx,pdf-templates,pdf}.tsx
│   ├── gamification.ts
│   ├── admin-metrics.ts
│   ├── ocr/{types,parser}.ts                  Phase 11
│   ├── emails.ts                              Branded transactional templates
│   ├── rate-limit.ts, validators.ts, download.ts
│   └── formula-engine.ts, roles.ts
├── services/                                  Server-only DB layer
│   ├── auth.actions.ts (server action)
│   ├── auth.service.ts (legacy axios client)
│   ├── audit.service.ts
│   ├── user.service.ts
│   ├── organization.service.ts, event.service.ts, emissionLog.service.ts
│   ├── personal-log.service.ts, targets.service.ts
│   ├── public-stats.service.ts
│   ├── event-form.service.ts
│   ├── reports.service.ts
│   ├── subscription.service.ts, subscription-lifecycle.service.ts
│   ├── gamification.service.ts
│   ├── admin-metrics.service.ts, admin-orgs.service.ts
│   ├── ocr.service.ts                         Phase 11 OCR routing
│   └── sustainability.service.ts
├── types/                                     Type-only modules
└── i18n/                                      EN + VI bundles (786 keys)
```

## Modules + responsibility

### Auth & roles
- Email + OTP + Google OAuth via Supabase. Middleware redirects `is_admin` users to `/admin` and blocks non-admins from admin routes.
- `lib/auth/roles.ts` exposes `requireSession`, `requireSystemAdmin`, `requireOrgRole(orgId, { adminOnly?, allowSystemAdmin? })`. Used in every server action and server component that needs auth.

### Audit log (BR-16)
- `AuditLogs` table with **immutable** trigger that rejects UPDATE/DELETE/TRUNCATE.
- Generic `audit_table_change` Postgres function attached to Org/Members/Events/EmissionLogs/Factors/Categories/Templates/User/CarbonTargets/EventForms/EventSubmissions/Subscriptions/Plans/Invoices/PaymentMethods/PaymentIntents/Challenges/Rewards/ContactMessages/ReportArchives.
- App layer also writes auth + non-CRUD events: `login`, `login_failed`, `logout`, `password_change`, `account_delete`, `subscribe_plan`, `confirm_mock_payment`, `cancel_subscription`, `reactivate_auto_renew`, `subscription_renewed`, `subscription_renewal_failed`, `subscription_force_canceled`, `subscription_expired`, `challenge_joined`, `challenge_completed`, `reward_redeemed`, `points_adjusted`, `export_*_report`, `org_verification_status_changed`, `contact_message_status_changed`, `contact_submitted`, `event_public_form_submitted`, `ocr_extract`.

### Carbon footprint tracking
- Org-scoped `EmissionLogs` (BR-06 frozen factor cols, BR-07 published lock at trigger level).
- Personal logs use `org_id IS NULL AND created_by = auth.uid()` (Phase 4 added RLS).
- Sustainability engine: `EmissionCategories`, `EmissionFactors`, `CalculationTemplates` + formula evaluator.
- BR-09 anti-spam B2C: `DailyLogCounters` + per-day cap.

### Organization (multi-tenant)
- `Organization` + `OrganizationMembers` (`role_id`, `status`).
- Tab layout: Overview / Detail / Employees / Review queue / Report / Compliance / Billing / Challenges / Settings.
- Helpers: `is_emission_org_member` / `is_emission_org_admin` Postgres functions.

### Subscription & billing
- 6 default plans (`B2B_TRIAL/BASIC/PRO/ENT`, `B2C_FREE/PLUS`).
- Mock payment gateway: `PaymentIntents` row + QR placeholder + `/api/payments/mock/[intentId]/confirm` button. Swap for real provider by replacing the `attemptRenewal` and `subscribeToPlan` mock branches.
- BR-09 enforced via `getInviteCapacity` reading `plan.max_users` (fallback `Organization.max_users` legacy).
- BR-10 lifecycle worker (`/api/cron/billing`): renewals (success/fail/random), force-terminate after `MAX_RENEWAL_RETRIES = 3`, expire canceled subs, trial reminders.
- BR-11 cancel keeps premium until `current_period_end`.

### Reporting & export
- PDF (React-PDF), XLSX (ExcelJS), CSV (papaparse).
- Org Emission Report, Compliance Report (GHG/GRI/TCFD), Personal report.
- After successful export the matching `EmissionLogs` rows are flipped to `Published` if the user opted in (BR-07 lock then enforced).

### Public surfaces
- `/about` `/services` `/contact` (Phase 2).
- `/event-form/[token]` guest submission (BR-08): no auth, rate-limited 10/IP/hour, honeypot. Submission auto-creates a matching `EmissionLogs` row scoped to the event's org.

### Gamification
- Challenges (global System Admin or org-scoped Org Admin), UserChallenges, Badges, Rewards, Redemptions, append-only `GreenPointLogs`.
- Atomic Postgres RPCs `redeem_reward(reward_id, user_id)` and `earn_green_points(...)` keep BR-13 transactional + BR-12 untransferable.
- Verified emission log → +10 points to creator (`org-admin.actions.reviewEmissionLogAction`).

### System Admin operations (Phase 10)
- System Overview (8 KPIs, growth trend, sector totals, recent audit).
- Audit log viewer with filter + paginated + CSV export. Read-only by design.
- Organizations Manager + per-org detail with verification status controls.
- Contact Messages inbox.

### OCR (Phase 11)
- `/api/ocr/extract` accepts multipart `file` (≤5 MB, image/jpeg|png|webp), routes to provider:
  - Anthropic Claude vision (`ANTHROPIC_API_KEY`) — primary.
  - Mock — when no key is set, returns deterministic placeholder.
- Pure parser in `lib/ocr/parser.ts` extracts fields from JSON or `key: value` text.
- Hook `useOcrDataExtraction` calls real endpoint.

## Migrations

| # | Filename | Purpose |
|---|---|---|
| 001 | organizations_events.sql | (legacy) snake_case org/events scaffolding |
| 002 | emission_engine.sql | EmissionCategories/Factors/CalculationTemplates + RLS |
| 003 | emission_logs.sql | EmissionLogs (PascalCase) |
| 004 | audit_logs.sql | AuditLogs immutable + generic audit trigger |
| 005 | emission_log_constraints.sql | Published/Exported lock + frozen factor cols |
| 006 | user_profile_fields.sql | phone, bio, avatar_url + avatars bucket |
| 007 | contact_messages.sql | ContactMessages + rate limit |
| 008 | org_metadata.sql | industry, verification_status, BR-09 default quota |
| 009 | targets_and_personal.sql | CarbonTargets + DailyLogCounters + personal RLS |
| 010 | public_event_forms.sql | EventPublicForms/Submissions + rate limit |
| 011 | report_archives.sql | report-archives bucket + ReportArchives |
| 012 | subscriptions.sql | Plans/Subscriptions/Invoices/PaymentMethods/Intents + seed |
| 013 | subscription_lifecycle.sql | cancel_reason, last_renewal_attempt, trial_reminder_sent_at |
| 014 | gamification.sql | Challenges/UserChallenges/Badges/Rewards/Redemptions/GreenPointLogs + RPCs |
| 015 | perf_indexes.sql | Phase 11 additive indexes |

## Scripts

| Script | Run | What |
|---|---|---|
| `scripts/apply-migrations.ts` | `npx tsx scripts/apply-migrations.ts` | Apply 004–015 idempotently using DATABASE_URL from `.env.local`. Needs Supabase **Session pooler** URL on free tier. |
| `scripts/audit-rls.sql` | Paste into Supabase SQL editor | Lists every RLS policy on app tables. |
| `scripts/check-i18n-coverage.ts` | `npx tsx scripts/check-i18n-coverage.ts` | Greps `t("...")` and `<T k="..." />` in `src/`, fails if any key missing in en.ts/vi.ts. |
| `npm test` | Vitest run-all | 151 unit tests. |
| `npm run build` | Next.js Turbopack build + tsc | 80 routes. |

## Environment variables

| Var | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | REST URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Browser client key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-only, bypasses RLS |
| `NEXT_PUBLIC_SITE_URL` | optional | Used by public form builder for absolute URLs |
| `DATABASE_URL` | when running migrations | Postgres URI; **must be Session pooler on free tier** |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | optional | Nodemailer SMTP. Without these, emails are no-ops (logged only). |
| `CRON_SECRET` | optional | Auth header for `/api/cron/billing`. Skipped if unset. |
| `ANTHROPIC_API_KEY` | optional | Enables Claude vision in `/api/ocr/extract`. Mock fallback if missing. |
| `ANTHROPIC_OCR_MODEL` | optional | Override model id, defaults to `claude-sonnet-4-6`. |

## Conventions
- **Server actions** (`src/app/actions/*.actions.ts`) — single entry point for client mutations. Always start with a `require*` guard. Always write `audit log` after success.
- **Server-only services** (`src/services/*.service.ts`) — wrap supabase calls. Marked with `import "server-only"`.
- **Pure helpers** (`src/lib/*.ts` without `"server-only"`) — must be importable from both client and server. Unit tested in `tests/unit/**`.
- **Pages** — server components by default; lift state into a `_components/*.tsx` client island when needed.
- **Tabs** scoped to a route group are kept in `[group]/_components/*Tabs.tsx` (e.g., OrgTabs, SettingsTabs).
- **i18n** — every user-facing string goes through `t("...")` or `<T k="..."/>`. Run `npx tsx scripts/check-i18n-coverage.ts` before committing UI work.
