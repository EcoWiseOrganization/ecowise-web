# Admin dashboard

The `/admin` landing page is the System Admin's at-a-glance view of platform
health. This document records what is shown, why, where the data comes from,
and how to extend it.

## What changed

Before, the dashboard surfaced **3 KPI cards** (Total Users, Admins, Active
Users) and nothing else. A system admin couldn't tell — from this page alone
— how many organisations existed, how much CO₂e had been tracked, whether
emission logs were piling up in review, what revenue looked like, or how the
platform was growing.

The rewrite turns the page into a true operational dashboard: **8 KPI cards,
5 charts/lists**, all wired to existing services. No new dependencies — every
chart is hand-rolled SVG/CSS so it ships zero JS bytes beyond what was already
on the page, scales perfectly to every breakpoint, and uses the brand palette
directly.

## Layout (top → bottom)

```
┌────────────────────────────────────────────────────────────────────┐
│ Page header                                                        │
├────────────────────────────────────────────────────────────────────┤
│ [Total Users] [Total Orgs] [Total Logs] [Total CO₂e]   ← row 1 KPI │
│ [Active]      [Admins]    [Revenue]    [Needs Attn]    ← row 2 KPI │
├────────────────────────────────────────────────────────────────────┤
│ 12-month growth chart (Users · Orgs · Logs)        ← full width    │
├────────────────────────────┬───────────────────────────────────────┤
│ Emissions by scope (donut) │ Top sectors by CO₂e (bars)            │
├────────────────────────────┴────────────────────┬──────────────────┤
│ Emission log status (stacked bar + legend)      │ Subscription mix │
├─────────────────────────────────────────────────┴──────────────────┤
│ AdminAuthBanner (auth check confirmation)                          │
└────────────────────────────────────────────────────────────────────┘
```

## Metrics added (and why)

### KPI cards

| Card                  | Source                                | Why it matters                              |
| --------------------- | ------------------------------------- | ------------------------------------------- |
| Total Users           | `getUserStats().totalUsers`           | Top-line user base                          |
| Total Organizations   | `getPlatformMetrics().totalOrgs`      | B2B footprint                               |
| Total Emission Logs   | `.totalEmissionLogs`                  | Platform engagement / data volume           |
| Total CO₂e Tracked    | `.totalCo2eKg` (formatted to tCO₂e)   | Headline impact number — what the platform is for |
| Active Users          | `getUserStats().activeCount`          | Engagement vs total                         |
| Admins                | `.adminCount`                         | Privileged-access count for governance      |
| Revenue This Month    | `.monthlyRevenueUsd`                  | Business health                             |
| Needs Attention       | `.openIssuesCount + .pendingContactMessages` | Work queue — one card, two underlying queues. Hint line breaks it down (`open reviews · pending contacts`). |

### Charts and breakdowns

| Section                  | Chart                  | Source                                | Why                                                                  |
| ------------------------ | ---------------------- | ------------------------------------- | -------------------------------------------------------------------- |
| 12-month growth          | Layered area + line    | `getGrowthTrends(12)`                 | Trends in sign-ups, new orgs, and log activity over time             |
| Emissions by scope       | Donut + legend         | `getEmissionsByScope()` (**new**)     | Where the platform's CO₂e actually comes from — Scope 1/2/3 share    |
| Top sectors by CO₂e      | Horizontal bars        | `getEmissionsBySector()`              | Which industries drive the numbers; "Other" rollup after top 6       |
| Emission log status      | Stacked bar + legend   | `getEmissionLogStatusCounts()` (**new**) | Workflow snapshot — Pending / Review / Verified / Published / Exported |
| Subscription mix         | Per-plan bars          | `getSubscriptionMix()` (**new**)      | Active subscriptions broken down by plan name                        |

## Design system

All colours come from the Tailwind tokens defined in `globals.css`:

- `brand-50 → brand-700` (greens) for primary surfaces, text, and the main
  emissions/users series.
- `neutral-fg / neutral-muted / neutral-soft` for body / secondary / tertiary
  text.

Chart-specific accents (kept consistent across pages):

| Concept                   | Hex       | Used in                                              |
| ------------------------- | --------- | ---------------------------------------------------- |
| Scope 1 — direct (fuel)   | `#F59E0B` | ScopeDonutChart, StatusBreakdown (Pending)           |
| Scope 2 — electricity     | `#1F8505` | ScopeDonutChart, StatusBreakdown (Verified)          |
| Scope 3 — indirect        | `#1F6FEB` | ScopeDonutChart, growth chart (Orgs), StatusBreakdown (Review) |
| Workflow terminal         | `#155A03` | StatusBreakdown (Published)                          |
| Workflow exported         | `#6B7280` | StatusBreakdown (Exported)                           |
| KPI "Revenue" / "Orgs"    | `#1F6FEB` | KpiCard tone="blue"                                  |
| KPI "Logs"                | `#7C3AED` | KpiCard tone="violet"                                |
| KPI "Needs Attention"     | `#E11D48` | KpiCard tone="rose" — only when count > 0            |

## Responsive behaviour

- **Mobile (< 640 px)**: every KPI card is a single column. Charts stack
  vertically. Donut chart legend wraps under the donut.
- **Tablet (640–1023 px)**: KPIs go 2 across. Sector and scope charts each
  take a full row.
- **Desktop (≥ 1024 px)**: KPIs go 4 across. Scope donut + top sectors sit
  side by side. Status (2 cols) + Subscription mix (1 col) share the last
  row at a 2:1 ratio.

The SVG charts use `viewBox` with `preserveAspectRatio` so they scale fluidly
without any client-side resize listeners.

## File map

```
src/services/admin-metrics.service.ts         ← added 3 new fetchers
src/types/admin.types.ts                      ← added ScopeTotal, EmissionLogStatusCounts, SubscriptionMix
src/app/(dashboard)/admin/page.tsx            ← rewritten to compose the new sections
src/app/(dashboard)/admin/_components/
  ├─ KpiCard.tsx                              ← richer than the old StatsCard (tone, hint line)
  ├─ DashboardSection.tsx                     ← shared card chrome (header + optional CTA)
  ├─ GrowthAreaChart.tsx                      ← SVG multi-series area chart
  ├─ ScopeDonutChart.tsx                      ← SVG donut + legend
  ├─ SectorBarChart.tsx                       ← CSS horizontal bars + "Other" rollup
  ├─ StatusBreakdown.tsx                      ← CSS stacked bar + legend
  └─ SubscriptionMixCard.tsx                  ← per-plan bars
src/i18n/locales/{vi,en}.ts                   ← added `admin.dashboard.*` keys
```

The legacy `StatsCard.tsx` is **not deleted** — it is still imported by other
admin sub-pages. New work should reach for `KpiCard` instead; consider
consolidating in a follow-up once the older pages are touched.

## Extending the dashboard

To add a metric:

1. Add the fetcher to `admin-metrics.service.ts`. Keep DB calls inside
   `Promise.all` so the dashboard's TTFB stays a single round trip.
2. Add a type to `admin.types.ts`.
3. Either add a `KpiCard` (single number + hint) or build a new section
   wrapped in `DashboardSection`.
4. Wire the data in `page.tsx`'s top-level `Promise.all`.
5. Add VI + EN keys under `admin.dashboard.*`.

To swap a chart's colour palette, edit the colour map at the top of the chart
component — every chart keeps its palette local, so a change is one file and
zero ripple.
