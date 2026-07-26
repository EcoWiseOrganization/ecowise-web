# EcoWise — Carbon Footprint Management Platform

EcoWise is a **carbon footprint management SaaS platform** for individuals and
organizations (SMEs). It measures, analyzes, and helps reduce carbon
emissions with a Scope 1/2/3 emission engine, gamified engagement, audit-ready
reporting, and a full subscription billing flow — priced in **VND** for the
Vietnamese market and fully bilingual (English / Tiếng Việt).

This is the **web** app of the EcoWise product; a companion **mobile** app
(`ecowise-mobile`, Expo/React Native) shares the same Supabase backend.

Course project — **EXE1201, SU26 semester, FPT University**.
Authors: **Nguyen Vu Dang Khanh × Nguyen Dang Khoi**.

**Live demo:** https://ecowise-red.vercel.app
(see `docs/TEST_ACCOUNTS.md` for seeded demo accounts across every role)

## What EcoWise Does

EcoWise is a dual-sided product:

- **B2C (Individual)** — a person logs their own carbon-emitting activities
  (transport, energy, diet, etc.), sees a personal footprint dashboard, sets
  reduction targets, gets recommendations, and earns green points through
  gamification.
- **B2B (Organizations / SMEs)** — a company creates an org workspace, invites
  employees, runs emission-logging **events** (including public forms guests
  can submit to without an account), reviews/verifies submitted logs, and
  exports audit-ready compliance reports (GHG Protocol / GRI / TCFD style).

Both sides run on the same emission engine (admin-curated emission factors +
a formula builder) and the same subscription/billing system.

## Core User Flows

### Authentication
- **Register** → 6-digit OTP email verification → account created → redirected
  based on role (`user` → `/dashboard`, `system admin` → `/admin`).
- **Login** with email/password, or **Google OAuth** (one-click).
- **Forgot password** → OTP verification → set new password.
- Rate-limited and lockout-protected OTP endpoints; role-based redirect and
  route guarding happen at both middleware and server-action level.

### Individual Carbon Tracking (B2C)
- **Activity Logger** (`/dashboard/activity`) — add/edit/delete emission
  entries by scope/category/quantity; CO2e is computed automatically from the
  admin-curated emission factors. Evidence photos (e.g. a receipt) can be
  uploaded and are **auto-filled via OCR** (Anthropic Claude vision, with a
  mock fallback when no API key is configured). Daily entry quota applies.
- **Targets** (`/dashboard/targets`) — create reduction targets with a
  baseline/target/current value and track progress over time.
- **Recommendations** (`/dashboard/recommendations`) — server-computed
  eco-friendly suggestions based on the user's top emission categories, each
  with an estimated annual saving.
- **Compare** (`/dashboard/compare`) — compare emissions between two custom
  date ranges.
- **Reports** (`/dashboard/reports`) — period switcher (Month/Quarter/Year),
  scope breakdown, top categories, export to **PDF / Excel / CSV**.
- **Executive dashboard** (`/dashboard`) — total footprint, Scope 1/2/3 cards,
  emission hotspots, net-zero tracking, intensity metrics, recent entries.

### Organizations (B2B)
Each org gets a workspace at `/dashboard/organization/[orgId]` with tabs:
- **Overview** — KPI cards, Scope 1/2/3 breakdown, top contributors, upcoming events.
- **Members & Events** — invite/manage members, create/manage emission-logging events.
- **Employees** — role & status management (last-admin-in-an-org cannot be removed).
- **Events → Form Builder** — configure a **public, tokenized submission form**
  (welcome message, brand color, shareable link + QR code) so guests can
  submit activity data for an event **without logging in**; submissions land
  as `Pending` emission logs scoped to that org.
- **Review Logs** — admin/reviewer queue to Verify/Reject submitted logs;
  verifying awards the submitter green points.
- **Report** — audit-ready export of the org's emission data.
- **Compliance** — GHG Protocol / GRI / TCFD-style compliance checklist reports.
- **Billing** — org-level subscription, invoices, checkout, cancel (mirrors B2C billing).
- **Challenges** — org-scoped gamification challenges.
- **Settings** — org profile and verification status.

### Gamification
- **Challenges** (`/dashboard/challenges`) — browse, join, and complete
  challenges to earn green points.
- **Rewards** (`/dashboard/rewards`) — redeem green points for rewards from a
  catalog (atomic, transaction-safe redemption).
- **Leaderboard** (`/dashboard/leaderboard`) — All-time / Month / Week
  green-points ranking with top-3 highlight.
- Green points are tracked via an **append-only ledger** so history can never
  be silently altered.

### Subscriptions & Billing
- Plan catalog priced in **VND**: Monthly / Quarterly / Annual / **Lifetime**,
  separate **B2C** and **B2B** tiers (Free/Plus for individuals; Trial/Basic/
  Pro/Enterprise for organizations).
- **Mock bank-transfer QR checkout**: user scans a QR and submits an upgrade
  request → a System Admin reviews the queue and approves/rejects → on
  approval the subscription activates, an invoice is issued, and the user is
  notified (in-app + email).
- Invoice history, printable invoice detail, cancel-with-reason (keeps
  premium access until period end), re-enable auto-renew.
- A **daily cron job** (`/api/cron/billing`, Vercel Cron) handles renewals,
  trial expiry reminders, and payment-retry/lifecycle transitions.

### Notifications
In-app notification bell (badge + dropdown) plus transactional emails
(Nodemailer over Gmail SMTP) for events like plan-upgrade approval/rejection
— all localized.

### System Admin Console (`/admin`)
- **Platform Dashboard** — KPI cards (users, orgs, logs, CO2e tracked, active
  users, monthly revenue, items needing attention) + growth trend, emissions
  by scope, top sectors, log-status, and subscription-mix charts.
- **System Overview** — audit/governance view of platform health.
- **Audit Logs** — read-only, immutable log of every mutation with filters
  (action, actor role, resource, status, date) and CSV export.
- **Users** — user management, "subscribed users" filter, Excel/CSV export
  with payment info.
- **Organizations** — search/filter by verification status, per-org detail,
  verification controls (Pending/Verified/Suspended).
- **Subscriptions** — plan CRUD and the upgrade-request review queue (the
  approval side of the bank-transfer QR flow).
- **Challenges / Rewards** — global gamification catalog CRUD.
- **Emission Factors** — manage CO2/CH4/N2O components per factor; CO2e is
  auto-computed using **GWP100 (IPCC AR6)**: `co2 + ch4×27.9 + n2o×273`.
  Sources: MONRE_VN, IPCC, DEFRA, EPA, Climatiq, or Custom.
- **Formula Builder** — define calculation templates (typed input schemas)
  and write formulas evaluated in a sandboxed expression engine, with a
  special `EF_TOTAL` variable pulled from the selected emission factor.
- **Contact Messages** — inbox for the public contact form (read/archive, mailto reply).

### Public Pages
`/` (landing), `/about` (live impact stats), `/services`, `/contact`
(rate-limited, honeypot-protected), and `/event-form/[token]` (the public,
no-login event submission form described above).

## Tech Stack

| Category      | Technology                                                         |
| ------------- | -------------------------------------------------------------------|
| **Framework** | Next.js 16 (App Router, Server Actions, Turbopack)                  |
| **Language**  | TypeScript 5 (`strict: true`)                                       |
| **UI**        | React 19, Tailwind CSS 4, MUI (`@mui/material` + icons), Emotion    |
| **i18n**      | i18next / react-i18next — English + Vietnamese (1,400+ keys each)   |
| **Auth**      | Supabase Auth — Email/Password + OTP, Google OAuth                  |
| **Database**  | Supabase (PostgreSQL) with Row Level Security on every app table    |
| **Email**     | Nodemailer (Gmail SMTP) — transactional emails, no-ops if unset     |
| **OCR**       | Anthropic Claude vision API for receipt/evidence extraction (mock fallback) |
| **Exports**   | ExcelJS (.xlsx), PapaParse (.csv), @react-pdf/renderer (PDF)        |
| **Testing**   | Vitest + happy-dom (unit + DB-trigger integration tests)            |
| **Cron**      | Vercel Cron → daily subscription lifecycle worker                   |

## Architecture

```
Page / Server Component  →  Hook / Server Action  →  Service  →  Supabase
```

| Layer       | Responsibility                                      | Location          |
| ----------- | -----------------------------------------------------| ------------------ |
| **Page**    | Render UI, handle interaction                        | `app/**/page.tsx` |
| **Action**  | `"use server"` mutations + auth gating                | `app/actions/`    |
| **Hook**    | Client state + orchestration                          | `hooks/`          |
| **Service** | Data access (server-only) over Supabase                | `services/`       |
| **Lib**     | Supabase clients, billing/email/format utilities        | `lib/`             |
| **Type**    | Shared TypeScript types                                | `types/`           |

Pages never call Supabase directly for mutations — always
`Action → Service`. Authorization helpers live in `lib/auth/roles.ts`
(`requireSession`, `requireSystemAdmin`, `requireOrgRole`). Privileged
reads/writes use the service-role client (`lib/supabase/service.ts`) and
deliberately bypass RLS — always behind a `require*` guard. Every mutating
server action writes to the immutable audit log.

**Defense in depth** on every protected route: middleware role redirect →
server-side `require*` guard → Postgres RLS policy.

## Project Structure

```
src/
├── app/
│   ├── (public)/            # Landing, About, Services, Contact
│   ├── (public-form)/       # Tokenized public event submission form
│   ├── (auth)/              # Login, Register+OTP, Forgot/Reset password, OAuth callback
│   ├── (dashboard)/
│   │   ├── _components/      # Sidebar, DashboardHeader, NotificationBell, cards, charts
│   │   ├── (individual)/dashboard/   # activity, assets, targets, challenges, rewards,
│   │   │                             # leaderboard, recommendations, compare, reports,
│   │   │                             # billing (+invoices/checkout/cancel), organization, settings
│   │   └── admin/           # users, organizations, subscriptions (+upgrade-requests),
│   │                        # challenges, rewards, emission-factors, formula-builder,
│   │                        # audit-logs, contact-messages, system-overview, settings
│   ├── actions/             # Server actions (subscription, upgrade-request, notification, …)
│   └── api/                 # auth (OTP/Google), ocr, public (contact/event-form),
│                            # payments/mock, cron/billing
├── components/              # shared/ (Header, Footer, Toast, TranslatedText…) + ui/ + billing/
├── hooks/                   # useAuth, useLoginForm, useCreateOrganization, useOcrDataExtraction, …
├── services/                # server-only data services (see below)
├── lib/                     # supabase/, auth/, exporters/, emails, billing, formula-engine, …
├── i18n/                    # config + locales/en.ts + locales/vi.ts
└── types/                   # subscription, notification, organization, gamification, …

supabase/migrations/         # 001…044 SQL migrations (idempotent)
scripts/                     # apply-migrations.ts, seed-demo.ts, check-i18n-coverage.ts, …
tests/                       # unit + integration (Vitest)
docs/                        # SRS, architecture, onboarding, phase plan, security review, …
```

## Key Services (`src/services/`, server-only)

`auth.*`, `user`, `organization` / `org-admin` / `org-member`, `event` /
`event-form`, `emissionLog`, `personal-log`, `sustainability`, `targets`,
`gamification`, `reports`, `ocr`, `subscription`, `subscription-lifecycle`,
`upgrade-request`, `notification`, `audit`, `admin-metrics`, `admin-orgs`,
`public-stats`.

## Supabase Clients (`src/lib/supabase/`)

| Client          | Usage                                              |
| --------------- | -----------------------------------------------------|
| `client.ts`     | Browser-side queries (public / auth pages)         |
| `server.ts`     | Server Components & Route Handlers (user-scoped)   |
| `service.ts`    | Service-role (bypasses RLS) — guard with `require*`|
| `admin.ts`      | Service-role client for admin reads                |
| `middleware.ts` | Session refresh in middleware                      |

## Database

PostgreSQL on Supabase with RLS on every tenant table. Schema is managed by
44 numbered, idempotent SQL migrations (`supabase/migrations/001`–`044`).
Business rules are enforced at the trigger level where it matters — e.g. a
published emission log is frozen and can't be edited, the green-points ledger
is append-only, and the audit log rejects UPDATE/DELETE outright.

Main domains:

- **Identity / org** — `User`, `Organization`, `OrganizationMembers`, `Events`,
  `EventAssignments`, `EventPublicForms`
- **Emission engine** — `EmissionCategories`, `EmissionFactors`,
  `CalculationTemplates`, emission logs & evidence, benchmarks
- **Gamification** — `Challenges`, `UserChallenges`, `Badges`, `Rewards`,
  `Redemptions`, `GreenPointLogs`
- **Billing** — `SubscriptionPlans`, `Subscriptions`, `Invoices`,
  `PaymentMethods`, `PaymentIntents`, `PlanUpgradeRequests`
- **Platform** — `Notifications`, `AuditLogs`, `ContactMessages`, rate-limit tables

Storage buckets: `emission-evidence`, `avatars` (public), `report-archives`.

Multi-tenant isolation is column-based (`org_id`) plus RLS; personal
(non-org) logs are isolated via `org_id IS NULL AND created_by = auth.uid()`.
SECURITY DEFINER helpers (`is_emission_org_member`, `is_emission_org_admin`)
avoid RLS recursion.

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase project (PostgreSQL + Auth)

### Environment Variables

Create `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Canonical site URL (used by emails / OAuth redirects / public form links)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Postgres connection (for the migration runner — use the Session Pooler URL on Supabase free tier)
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres

# Transactional email (Gmail SMTP — app password). Optional: emails no-op (logged only) if unset.
GMAIL_USER=your_account@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password

# Protects the /api/cron/* billing endpoints (Bearer token)
CRON_SECRET=any_long_random_string

# Optional — enables Claude vision OCR for evidence uploads; mock provider used if unset
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_OCR_MODEL=claude-sonnet-4-6
```

### Install & Run

```bash
npm install

# Apply database schema (idempotent — safe to re-run)
npx tsx scripts/apply-migrations.ts          # reads DATABASE_URL from .env.local

npm run dev                                   # http://localhost:3000
```

> Migrations live in `supabase/migrations/` and are applied in order by
> `scripts/apply-migrations.ts`. A `-- @SPLIT` marker in a file runs the
> segments as separate transactions (needed for `ALTER TYPE … ADD VALUE`).

### Scripts

```bash
npm run dev          # start dev server
npm run build        # production build
npm start            # serve production build
npm run lint         # ESLint
npm test             # run all Vitest suites
npm run test:unit
npm run test:integration
```

Useful one-off scripts in `scripts/` (run with `npx tsx`): `seed-demo.ts`
(seeds demo accounts for every role), `seed-users-to-410.ts` (bulk user
seeding), `check-i18n-coverage.ts` (fails if any `t("...")` key is missing a
translation), `run-rls-audit.ts` (lists RLS policies per table).

## Trying It Out

The fastest way to see the whole product is the live demo:
**https://ecowise-red.vercel.app**

`docs/TEST_ACCOUNTS.md` has seeded demo accounts covering every role
(individual, org admin, org member, system admin) with click-through test
flows per feature.

## Further Documentation

The `docs/` folder has a much deeper dive than this README, including:

- `docs/SRS.md` — full Software Requirements Specification (actors, use
  cases, ERD), covering both the web portal and the mobile app module.
- `docs/system-architecture.md` — request-flow walkthroughs, trust
  boundaries, multi-tenant isolation, failure modes.
- `docs/onboarding.md` — 30-minute dev onboarding guide (Vietnamese).
- `docs/admin-emission-engine.md` — deep dive on the emission factor +
  formula builder subsystem (Vietnamese).
- `docs/plan.md` — phase-by-phase development history and acceptance criteria.
- `docs/REVIEW.md` — internal security/quality audit log.
- `docs/PENDING.md` — production go-live checklist.
- `CONTRIBUTING.md` — branch naming, commit conventions, PR checklist.

## Author

Nguyen Vu Dang Khanh × Nguyen Dang Khoi
