# EcoWise — Carbon Footprint Management Platform

EcoWise helps individuals and organizations (SMEs) measure, analyze, and reduce
their carbon footprint, with gamified engagement, audit-ready reporting, and a
subscription billing flow. Built with Next.js 16 and Supabase. Fully bilingual
(English / Tiếng Việt).

## Tech Stack

| Category           | Technology                                            |
| ------------------ | ----------------------------------------------------- |
| **Framework**      | Next.js 16 (App Router, Server Actions)               |
| **Language**       | TypeScript                                            |
| **UI**             | React 19, Tailwind CSS 4, MUI (`@mui/material` + icons) |
| **i18n**           | i18next / react-i18next (EN + VI)                     |
| **Auth**           | Supabase Auth (Email/Password + OTP, Google OAuth)    |
| **Database**       | Supabase (PostgreSQL) with Row Level Security         |
| **Email**          | Nodemailer (Gmail SMTP)                               |
| **Exports**        | ExcelJS (.xlsx), PapaParse (.csv), @react-pdf/renderer (PDF) |
| **Testing**        | Vitest + happy-dom                                    |

## Architecture

```
Page / Server Component  →  Hook / Server Action  →  Service  →  Supabase
```

| Layer        | Responsibility                                        | Location          |
| ------------ | ----------------------------------------------------- | ----------------- |
| **Page**     | Render UI, handle interaction                         | `app/**/page.tsx` |
| **Action**   | `"use server"` mutations + auth gating                | `app/actions/`    |
| **Hook**     | Client state + orchestration                          | `hooks/`          |
| **Service**  | Data access (server-only) over Supabase               | `services/`       |
| **Lib**      | Supabase clients, billing/email/format utilities      | `lib/`            |
| **Type**     | Shared TypeScript types                               | `types/`          |

Authorization helpers live in `lib/auth/roles.ts` (`requireSession`,
`requireSystemAdmin`, `requireOrgRole`). Privileged reads/writes use the
service-role client (`lib/supabase/service.ts`) and bypass RLS deliberately —
always behind a `require*` guard.

## Project Structure

```
src/
├── app/
│   ├── (public)/            # Landing, About, Services, Contact (PricingSection, Hero…)
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
├── hooks/                   # useAuth, useLoginForm, useCreateOrganization, …
├── services/                # server-only data services (see below)
├── lib/                     # supabase/, auth/, exporters/, emails, billing, format-number, …
├── i18n/                    # config + locales/en.ts + locales/vi.ts
└── types/                   # subscription, notification, organization, gamification, …

supabase/migrations/         # 001…039 SQL migrations (idempotent)
scripts/                     # apply-migrations.ts, seed-demo.ts, check-i18n-coverage.ts, …
tests/                       # unit + integration (Vitest)
```

## Feature Modules

- **Auth** — Email/password with OTP email verification, Google OAuth, forgot/reset
  password, rate-limiting & lockout. Role-based redirect (user → `/dashboard`,
  system admin → `/admin`).
- **Emission Engine** — Scope 1/2/3 calculations (GHG Protocol), admin-curated
  emission factors, a formula builder, and evidence upload with OCR extraction.
- **Individual Dashboard** — footprint overview, hotspots, net-zero tracking,
  intensity metrics, personal logs, targets, recommendations, comparisons.
- **Organizations (B2B)** — org workspace, members & roles, events (incl. public
  tokenized submission forms), org-scoped emission logs & compliance.
- **Gamification** — green points, challenges, rewards/redemptions, badges, leaderboard.
- **Reports** — audit-ready report generation and export to PDF / Excel / CSV.
- **Subscriptions & Billing** — plan catalog in **VND** (Monthly / Quarterly /
  Annual / **Lifetime**), B2C + B2B tiers. Paid upgrades use a **bank-transfer QR
  flow**: the user scans a QR and submits a request → a System Admin reviews the
  queue and approves → the subscription activates, a paid invoice is issued, and
  the user is notified. A renewal/lifecycle cron handles Annual renewals.
- **Notifications** — in-app bell (badge + dropdown, fully i18n) plus transactional
  emails (e.g. plan upgrade approved/rejected, in Vietnamese).
- **Admin Console** — user management with a "subscribed users" filter and
  Excel/CSV export (with full payment info), plan CRUD, upgrade-request review,
  org verification, audit logs, contact messages, and a system overview.

## Key Services (`src/services/`, server-only)

`auth.*`, `user`, `organization` / `org-admin` / `org-member`, `event` /
`event-form`, `emissionLog`, `personal-log`, `sustainability`, `targets`,
`gamification`, `reports`, `ocr`, `subscription`, `subscription-lifecycle`,
`upgrade-request`, `notification`, `audit`, `admin-metrics`, `admin-orgs`,
`public-stats`.

## Supabase Clients (`src/lib/supabase/`)

| Client          | Usage                                              |
| --------------- | -------------------------------------------------- |
| `client.ts`     | Browser-side queries (public / auth pages)         |
| `server.ts`     | Server Components & Route Handlers (user-scoped)   |
| `service.ts`    | Service-role (bypasses RLS) — guard with `require*`|
| `admin.ts`      | Service-role client for admin reads                |
| `middleware.ts` | Session refresh in middleware                      |

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

# Canonical site URL (used by emails / OAuth redirects)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Postgres connection (for the migration runner)
DATABASE_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres

# Transactional email (Gmail SMTP — app password)
GMAIL_USER=your_account@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password

# Protects the /api/cron/* billing endpoints
CRON_SECRET=any_long_random_string
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

## Database

PostgreSQL on Supabase with RLS on all tenant tables. Schema is managed by the
numbered SQL migrations (`001`–`039`). Main domains:

- **Identity / org** — `User`, `Organization`, `OrganizationMembers`, `Events`,
  `EventAssignments`, `EventPublicForms`
- **Emission engine** — `EmissionCategories`, `EmissionFactors`,
  `CalculationTemplates`, emission logs & evidence, benchmarks
- **Gamification** — `Challenges`, `UserChallenges`, `Badges`, `Rewards`,
  `Redemptions`, `GreenPointLogs`
- **Billing** — `SubscriptionPlans`, `Subscriptions`, `Invoices`,
  `PaymentMethods`, `PaymentIntents`, `PlanUpgradeRequests`
- **Platform** — `Notifications`, `AuditLogs`, `ContactMessages`, rate-limit tables

## Author

Nguyen Vu Dang Khanh × Nguyen Dang Khoi
