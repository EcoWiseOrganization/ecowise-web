# EcoWise Web — Repo Review & Tồn đọng

> Bản review tổng thể repo `ecowise-web` (snapshot @ commit `fd3fc47`).
> Được tổng hợp từ 5 round audit song song (auth · individual dashboard · org dashboard · admin/APIs/migrations · infra/quality).
> Mỗi finding ghi rõ **severity** · **file:line** · **impact** · **fix gợi ý**. Mục tiêu: ai cũng pick được 1 mục lên làm ngay.

## Severity legend

| Mức | Nghĩa |
|---|---|
| 🔴 **blocker** | Lộ data / khả năng exploit / ship đi là gãy production. Fix trước khi go-live. |
| 🟠 **high** | Lỗi nghiệp vụ / bypass BR / regression rõ. Trong sprint kế tiếp. |
| 🟡 **medium** | Bug UX, tech debt rõ, missing audit/i18n. Bake-in vào roadmap. |
| 🟢 **low** | Polish, perf marginal, lint, accessibility, cleanup. |
| ⚪ **nice-to-have** | Đẹp hơn nhưng không cấp thiết. |

## TL;DR — Top blockers cần fix ngay

> **🎉 All 11 blockers FIXED** (commits in main). See "Progress" section below for the audit trail.

| # | Mức | Module | Vấn đề | Status |
|---|---|---|---|---|
| 1 | 🔴 | Cron | `CRON_SECRET` rỗng → bất kỳ ai cũng gọi được `/api/cron/billing`, lifecycle phá nát data | ✅ `8aa9aca` |
| 2 | 🔴 | Auth — signup | Password plaintext lưu `sessionStorage` + truyền qua 2 endpoint | ✅ `0e5ab89` |
| 3 | 🔴 | Auth — signup | OTP sinh từ `Math.random()` 4 chữ số, không lock attempts | ✅ `077b6f2` |
| 4 | 🔴 | Auth — forgot password | Endpoint trả "no account found" → enumeration oracle | ✅ `1a7a649` |
| 5 | 🔴 | Org — overview | `getEventByIdServer` không check `event.org_id === orgId` → cross-tenant leak | ✅ `b82f04c` |
| 6 | 🔴 | Org — invite | `addOrgMembersAction` hardcode password `"123456"` cho user mới | ✅ `5ee3c25` |
| 7 | 🔴 | Public form | BR-08 yêu cầu CAPTCHA — chỉ có honeypot `display:none` (dễ bypass) | ✅ `88d484f` (off-screen positioning; full CAPTCHA chờ product) |
| 8 | 🔴 | Admin — users | `getAllUsers()` dump full PII không pagination, không guard | ✅ `d14821b` |
| 9 | 🔴 | Billing | B2C Premium feature gating chưa implement nhưng đã cho thanh toán | ✅ `fa16370` (helper + 2 initial gates) |
| 10 | 🔴 | Gamification | RPC `redeem_reward` không check `auth.uid() = p_user_id` | ✅ `e33bdfe` (migration 020) |
| 11 | 🔴 | i18n | Hardcoded English nguyên trang ở billing/challenges/rewards/leaderboard | ✅ `e89d5db` |

## Progress log

### Round 1 — Blockers (11/11 DONE) · commits on `main`
- `8aa9aca` fix(cron/billing): fail closed in production + timing-safe secret compare
- `5ee3c25` fix(org/invite): replace hardcoded "123456" with random pwd + email recovery link
- `e33bdfe` fix(rpc/redeem_reward): require auth.uid() = p_user_id (migration 020)
- `b82f04c` fix(org/events): require orgId on getEventByIdServer + membership guard
- `d14821b` fix(admin/users): paginate + project + escape PII dump
- `077b6f2` fix(auth/otp): crypto.randomInt 6-digit codes + per-row lockout (migration 021)
- `1a7a649` fix(forgot-password): close user-enumeration oracle on send-otp
- `88d484f` fix(public-form): off-screen honeypot instead of display:none
- `0e5ab89` fix(auth): remove plaintext password/token from sessionStorage (migration 022 + httponly cookie + global signOut)
- `fa16370` feat(billing): server-side B2C feature gating + initial enforcement
- `e89d5db` fix(i18n): wire billing/challenges/rewards/leaderboard to t()

### Manual deployment steps still required
1. Apply migrations 020/021/022 via `npx tsx scripts/apply-migrations.ts`.
2. Set `CRON_SECRET` in Vercel env — production now fails closed without it.
3. Verify SMTP creds (`GMAIL_USER` / `GMAIL_APP_PASSWORD`) so org-invite recovery email actually delivers.
4. Product decision on remaining B2C gates (compare, leaderboard, expanded challenges) — see "Unresolved questions" §3.

---

# Phần I — Theo Phase

## Phase 1 — Authentication & Registration

### Module: Email signup + OTP

#### Step: Send OTP — `src/app/api/auth/send-otp/route.ts`
- 🔴 **blocker** — Không có rate-limit; attacker spam OTP đốt quota Gmail (`:7-77`).
  - *Fix*: dùng pattern `EventPublicFormRateLimits` key theo `(ip, email)` — 3/giờ, 10/ngày.
- 🟠 **high** — OTP sinh bằng `Math.random()` 4 chữ số (10k tổ hợp), RNG không cryptographically secure (`:28`).
  - *Fix*: `crypto.randomInt(100000, 1000000)` 6 chữ số + cột `failed_attempts` lock sau 5 lần sai.
- 🟠 **high** — Password plaintext nhận qua body + lưu `sessionStorage` rồi gửi lại lần 2 ở verify (`:8`, `verify-otp:8`).
  - *Fix*: hash + lưu trong `otp_verifications` ở step send, đọc lại ở verify; hoặc dùng native Supabase email-confirm flow.
- 🟡 **medium** — Email không `.trim().toLowerCase()` → `User@x.com` và `user@x.com` thành 2 OTP row khác nhau (`:8-39`).
- 🟡 **medium** — `name` không HTML-escape trước khi nhúng vào email template → HTML/email injection (`:61`).

#### Step: Verify OTP — `src/app/api/auth/verify-otp/route.ts`
- 🟠 **high** — Không có attempt counter; brute-force 10k tổ hợp trong 5 phút trivially (`:17-22`).
- 🟡 **medium** — Trả `signUpError.message` verbatim → leak Supabase internals (`:53`).

#### Step: Register hook — `src/hooks/useRegisterForm.ts`, `useVerifyOtp.ts`
- 🔴 **blocker** — Password plaintext ghi vào `sessionStorage` (`:49`, đọc ở `useVerifyOtp.ts:35`).
- 🟡 **medium** — Validation error hardcoded English bỏ qua i18n (`:10-17`).
- 🟡 **medium** — Email không trim/lowercase trước khi gọi `sendRegistrationOtp`.

#### Step: Register pages
- 🟡 **medium** — `register/verify/page.tsx`, `forgot-password/page.tsx`, `reset/page.tsx` hardcoded EN — không `useTranslation`.

### Module: Login

- 🟠 **high** — `auth.actions.ts:48-74` không có per-account rate limit → credential stuffing.
- 🟡 **medium** — Email không normalize trước `signInWithPassword` (`:51-58`).
- 🟡 **medium** — `login/page.tsx:65-91` render `?error=`/`?message=` raw → phishing surface qua URL params.
- 🟢 **low** — `inputStyle` constants clone giữa login/register/reset → ít nhất gom thành `AuthInput` component.

### Module: Forgot password

- 🔴 **blocker** — `forgot-password/send-otp/route.ts:24` trả "No account found" → user enumeration oracle.
- 🟠 **high** — `admin.auth.admin.listUsers({ perPage: 1000 })` silent fail khi >1000 users (`:16`, cũng dùng ở `user.service.ts:18`, `reset/route.ts:37`).
- 🟠 **high** — Cùng OTP brute-force / `Math.random` như register.
- 🟡 **medium** — `resetToken` lưu `sessionStorage` rồi gửi lại body (`useForgotPasswordVerify.ts:35`, `reset/route.ts:6-23`); không bind IP/UA → XSS lấy token.
- 🟡 **medium** — Sau reset không sign-out các session khác → session cũ vẫn truy cập (`reset/route.ts:48-54`).
- 🟢 **low** — Password policy chỉ ≥ 6 chars; thiếu complexity check (`reset/route.ts:12`).

### Module: OAuth callback — `src/app/(auth)/callback/route.ts`

- 🟡 **medium** — Linking branch `admin.auth.admin.deleteUser` + redirect; network fail → mất account, không rollback (`:96, 110, 118`).
- 🟡 **medium** — `siteUrl` fallback `x-forwarded-host` (spoofable) (`:15-20`, `google/route.ts:12-17`).
- 🟢 **low** — `oauthErrorDesc` encode thẳng vào URL → text injection.

### Module: Middleware — `middleware.ts`

- 🟠 **high** — Mỗi request gọi extra `supabase.from("User").select("is_admin")` → 1 DB round trip dư mỗi page nav (`:14-25, 67, 74`).
- 🟡 **medium** — `AUTH_ROUTES` exact-match thiếu prefix `/forgot-password*`.
- 🟡 **medium** — Login redirect không kèm `?next=` → mất deep-link sau khi login (`:58-62`).
- 🟢 **low** — Matcher không skip `robots.txt`, `manifest.json`, static assets.

---

## Phase 2 — Personal Activity Logger

### Module: Activity Logger — `src/app/(dashboard)/(individual)/dashboard/activity/_components/ActivityLogger.tsx`

- 🟠 **high** — UI fetch `pageSize: 25` nhưng không render Next/Prev → user >25 logs mất history (`:23, 256-315`).
- 🟠 **high** — Search input call server action mỗi keystroke, không debounce (`:221-231`).
- 🟠 **high** — Thiếu BR-16 audit log trên create/update/delete (`personal-carbon.actions.ts:43-132`).
- 🟠 **high** — Daily counter `personal-log.service.ts:43-54` read-then-upsert non-atomic → bypass BR-09 limit 50/day.
  - *Fix*: RPC `INSERT … ON CONFLICT … DO UPDATE SET count = count + 1`.
- 🟡 **medium** — `co2e_result` nhận thẳng từ client, không server-side recompute (`:47-72`) → user self-report tuỳ ý, gãy fairness leaderboard.
- 🟡 **medium** — `remove(log.id)` không confirm dialog (`:296-308`).
- 🟡 **medium** — `reporting_date` mặc định `new Date().toISOString().slice(0,10)` (UTC) → user VN 06:00 sáng log thành ngày hôm qua.
- 🟡 **medium** — `unit` field free-text → pollute aggregation.
- 🟢 **low** — Empty state không phân biệt "không có log" vs "filter không match".

---

## Phase 3 — Reports + Targets + Compare + Recommendations

### Module: Personal Report — `dashboard/reports/_components/PersonalReport.tsx`

- 🟠 **high** — `byScope` typed `Record<string,number>` indexed by raw DB value → DB drift → silent 0 (`personal-log.service.ts:158-170`).
- 🟡 **medium** — Period calc timezone-naive (`:23-36`).
- 🟡 **medium** — Period switch loading state che cả card (`:60-66, 115-118`); export error không retry (`:149-153`).
- 🟢 **low** — Export buttons thiếu `aria-label`.

### Module: Targets — `dashboard/targets/_components/TargetsView.tsx`

- 🟠 **high** — `archiveTargetAction` không confirm dialog (`:161-168`).
- 🟡 **medium** — Server action reject `target > baseline` nhưng không reject `baseline ≤ 0` / `target < 0` (`targets.service.ts:46-49`).
- 🟡 **medium** — Cho phép `end_date` quá khứ → tạo target hết 100% time ngay.
- 🟡 **medium** — `progress_pct > 1` được tính ở `lib/targets.ts` nhưng UI clamp 100% → mất feedback "đạt vượt mức".
- 🟡 **medium** — `cancelled` flag trong `load()` không setup lại khi `onArchive/onCreated` → race setState after unmount.
- 🟢 **low** — Thiếu BR-16 audit log (`personal-carbon.actions.ts:176-240`).

### Module: Compare — `dashboard/compare/_components/CompareView.tsx`

- 🟡 **medium** — Không check 2 period overlap → so sánh vô nghĩa (`:37`).
- 🟡 **medium** — Default 30/60 day windows tính bằng UTC.
- 🟢 **low** — `deltaPct` khi A=0 trả `0%` thay vì "n/a" → misleading.

### Module: Recommendations — `src/lib/recommendations.ts`

- 🟡 **medium** — Category matcher substring-search chỉ biết 4 cụm EN+VI cứng; category VI khác (vd. "Năng lượng") fall về generic (`:53-103`).
- 🟢 **low** — Loading state không skeleton.

---

## Phase 4 — Organizations

### Module: Org workspace — multi-tenancy

- 🔴 **blocker** — `getOrganizationByIdServer` trả org by id không check membership → render org name trong `generateMetadata` → cross-tenant leak (`organization.actions.ts:36-45, :17-21`).
- 🔴 **blocker** — `getEventByIdServer` không check `event.org_id === orgId` (`:80-89`) + `EventDetailPage` cũng không guard → user authenticated guess được `(orgId, eventId)` xem event của org khác.
- 🟠 **high** — `reviewEmissionLog(logId)` update by `logId` thôi, không filter `org_id` (`org-admin.service.ts:235-252`) → admin org A verify được log org B.
- 🟠 **high** — `OrgOverviewPage` gọi `getEmployeeActivity` không check `isAdmin` → member thường thấy email + total log + last activity coworkers (BR-04 vi phạm).
- 🟡 **medium** — `getMyOrganizations` (browser) `select("*")` chỉ dựa RLS, fragile (`organization.service.ts:64-74`).
- 🟡 **medium** — `getOrganizationMembers` (browser) query column `role` không tồn tại (DB là `role_id`) — dead/broken (`:101-118`).
- 🟡 **medium** — Layout gọi `getOrganizationByIdServer + getMyMembershipServer + getOrgMetricsSummary` mỗi route → 4 DB round-trip/render.

### Module: Org settings — `settings/_components/OrgSettingsForm.tsx`

- 🟡 **medium** — Không validate `contact_email`, `website_url`, `logo_url` ở server.
- 🟡 **medium** — `legal_name` update không reset `verification_status` → org đổi tên không cần re-verify.

### Module: Employees / Members

- 🔴 **blocker** — `addOrgMembersAction` hardcode password `"123456"` (`organization.actions.ts:214`).
- 🔴 **blocker** — Không enforce BR-09 capacity ở invite — admin bypass `max_users` plan.
- 🟠 **high** — Không verify caller membership `status === 'Active'` (`:188`).
- 🟠 **high** — Trả optimistic UI với fabricated `id: crypto.randomUUID(), user_id: ""` (`AddMembersForm.tsx:57-71`) → phantom members.
- 🟠 **high** — `removeMember` hard-delete (`org-member.service.ts:110-129`) → mất audit + cascade nuke history.
- 🟡 **medium** — Admin có thể self-demote qua role `<select>` (`EmployeeManager.tsx:131-148`).
- 🟡 **medium** — `useEmployeeManager.ts:49-51` hardcode ROLE UUID duplicate `src/lib/roles.ts`.
- 🟡 **medium** — `wouldLeaveOrgWithoutAdmin` count gồm cả Pending → block remove Pending row không cần thiết.

### Module: Emission Logs Review — `_components/ReviewQueue.tsx`

- 🟠 **high** — Evidence hiển thị qua external link → signed URL expire trước khi click (`:121-130`).
- 🟡 **medium** — `reviewEmissionLogAction` không check status hiện tại → re-review fires `awardPointsForVerifiedLog` nhiều lần.

### Module: Emission Report — `_components/OrgReportView.tsx`

- 🟠 **high** — `exportOrgReportAction({ publishLock })` cần verify admin server-side (không chỉ client) — re-check `reports.actions.ts`.
- 🟡 **medium** — `getOrgMetricsSummary` sum tất cả logs bất kể status → KPI "totalEmissionsKg" gồm Rejected/Draft (`org-admin.service.ts:30-67`).
- 🟡 **medium** — UI không reject `start > end` / same-day.
- 🟢 **low** — Default period là calendar month; UC-27 thường muốn YTD/Quarter.

---

## Phase 5 — Events + Public Forms

### Module: Events / Event detail

- 🟠 **high** — `createEventAction` không check caller là admin của `input.org_id` → bất kỳ user authenticated có thể tạo event ở org khác (`organization.actions.ts:137-168`).
- 🟠 **high** — BR-09 `max_events` không enforce ở `createEventAction`.
- 🟠 **high** — `createEvent` browser-side (`event.service.ts:12-45`) còn live → nếu RLS misconfigure → cross-org create.
- 🟡 **medium** — Event detail thiếu participant count, public form link, submission stats.
- 🟢 **low** — `StatusBadge` (`EventDetailView.tsx:13-19`) hardcode EN status text.

### Module: Form Builder — `_components/FormBuilder.tsx`

- 🟠 **high** — UI thiếu hẳn field configurator — chỉ edit welcome msg + brand color. UC-33 chưa implement.
- 🟠 **high** — Public form status flow không có "frozen schema once first submission lands" → admin đổi field giữa chừng → submitted_data shape inconsistent.
- 🟡 **medium** — `rotateFormToken` (`event-form.service.ts:91-113`) gọi `db.rpc("uuid_generate_v4")` (không tồn tại) rồi fall về `crypto.randomUUID()` — dead code.
- 🟡 **medium** — Copy button không có HTTPS fallback feedback.
- 🟢 **low** — Submission list không refresh sau publish/close.

### Module: Public submission — `api/public/event-form/[token]/route.ts`

- 🔴 **blocker** — BR-08 yêu cầu CAPTCHA — chỉ có honeypot `className="hidden"` (Tailwind `display:none`) → modern bots ignore (`PublicFormView.tsx:244`).
- 🟠 **high** — Token không có `expires_at` → URL leak xài vĩnh viễn nếu admin quên close form.
- 🟠 **high** — Honeypot success branch trả `{ok:true}` không body data (`:111`); rate-limit fallback `ip = "anonymous"` (`:80`) → tất cả no-IP client share bucket.
- 🟠 **high** — `submitted_data` lưu raw client object không whitelist theo `form.fields` schema → arbitrary payload.
- 🟠 **high** — EmissionLogs row từ public submission `org_id` set nhưng `created_by` omit; scope force `Scope 3` cho cả `walk_bike` zero → mix vào KPI report.
- 🟡 **medium** — `attendee_email` chỉ check `maxLength=320`, không format/lowercase.
- 🟡 **medium** — `request.json()` không size limit → DoS payload lớn.
- 🟡 **medium** — Rate-limit check + insert không atomic → burst N parallel bypass.
- 🟡 **medium** — `EventPublicFormRateLimits` không TTL → table grows unbounded.
- 🟡 **medium** — `ip_address` lưu full không hash → PII / GDPR concern.
- 🟢 **low** — Error messages từ server (`INTERNAL_ERROR`) hiện raw cho guest.

---

## Phase 6 — Compliance + Review

- 🟡 **medium** — Compliance không preview — large org PDF 100MB+ có thể timeout Vercel hobby tier.
- 🟢 **low** — `publishLock` default `true` ở `ComplianceView.tsx:40` → dễ accidental publish, không undo theo BR-07.

---

## Phase 7 — Billing (B2C + B2B)

### Module: B2C billing — `dashboard/billing/**`

- 🔴 **blocker** — Hardcoded EN copy ("Billing", "Manage your personal subscription...", "Complete payment", "Invoices") (`billing/page.tsx:22-25`, `checkout/[intentId]/page.tsx:33`, `invoices/page.tsx:15`).
- 🟠 **high** — B2C Premium feature gating chưa implement (PENDING §6) — user trả tiền không có gì thay đổi.
- 🟡 **medium** — Invoice `as Invoice` cast không runtime validate (`getInvoice`).
- 🟢 **low** — Checkout page không check intent expiry trước khi render.

### Module: B2B billing — Org checkout

- 🟠 **high** — `OrgCheckoutPage` race: stale `Succeeded`/`Failed` intent vẫn render checkout (`billing/checkout/[intentId]/page.tsx:37-48`).
- 🟡 **medium** — Không idempotency key trên confirm payment → real PSP wire xong → double charge nguy cơ.

### Module: Subscription service — `subscription.service.ts`

- 🟡 **medium** — `confirmMockPayment` (`:321-383`) chỉ `requireSession()` → user A guess intentId của user B → kích hoạt sub miễn phí cho B (privilege escalation).
- 🟡 **medium** — `subscribeToPlan` (`:179-184`) cancel rồi create non-atomic → race leaves no active sub.

---

## Phase 8 — Cron / Lifecycle / OCR

### Module: Cron billing — `api/cron/billing/route.ts`

- 🔴 **blocker** — `CRON_SECRET` rỗng → `authorize()` trả `true` luôn (`:13-17`) → bất kỳ ai gọi được.
- 🟠 **high** — So sánh secret bằng `===` (timing oracle) → nên `crypto.timingSafeEqual`.
- 🟠 **high** — `GET` proxy `POST` (`:36-38`) → browser preview / link expander trigger lifecycle.
- 🟠 **high** — Không idempotency / concurrency lock — 2 invocation song song fetch cùng candidates → duplicate Invoice/PaymentIntent.
- 🟠 **high** — Query param `outcome=fail|random` không có admin gate → leaked secret → mass-cancel paying customers.
- 🟡 **medium** — `attemptRenewal` 3 sequential write không transaction (`subscription-lifecycle.service.ts:127-191`) → mid-fail = Paid invoice + Trial sub.
- 🟡 **medium** — `report.errors[]` không log structured / không Sentry.
- 🟡 **medium** — `simulate-fail/[subscriptionId]/route.ts` không check status guard.

### Module: OCR — `api/ocr/extract/route.ts`, `services/ocr.service.ts`

- 🟡 **medium** — Không per-user rate limit → token cost overrun.
- 🟡 **medium** — Default `ANTHROPIC_OCR_MODEL = claude-sonnet-4-6` — model ID không tồn tại; thực tế là `claude-sonnet-4-5` → 404 nếu env không set.
- 🟡 **medium** — Output model không clamp length → arbitrary string lọt vào form.
- 🟢 **low** — Audit log dùng `resource_type: "user"` cho OCR (sai semantic).
- 🟢 **low** — Anthropic error body leak vào audit log → có thể chứa prompt fragments.

### Module: Public contact — `api/public/contact/route.ts`

- 🟡 **medium** — Honeypot trả 200 OK silently không increment rate counter.

---

## Phase 9 — Gamification

### Module: Challenges — `dashboard/challenges/**`, `gamification.service.ts`

- 🔴 **blocker** — Hardcoded EN: "No challenges available right now…", "Joined ✓", "Join" ở `ChallengesBrowser.tsx:42, 79, 88`; `challenges/[id]/page.tsx:38, 46-49, 60-77`; `CompleteChallengeButton.tsx:35, 40-45`.
- 🟠 **high** — N+1: `challenges/page.tsx:24-28` loop orgs gọi `listChallenges({ orgId })` → user N orgs = N+1 query.
- 🟡 **medium** — `isActive` check parse `start_date` thành UTC midnight → VN sáng sớm thấy challenge "today" chưa active 7 giờ.
- 🟡 **medium** — `completeChallenge` không có rate-limit / anti-cheat → Honor verification farm points dễ dàng.
- 🟡 **medium** — `joinChallengeAction` không check `Active`/window → join Draft/Archived OK.
- 🟡 **medium** — `deleteChallengeAction` hard delete → `UserChallenges` CASCADE wipe history + badges.
- 🟡 **medium** — `adjustPointsAction` → RPC `earn_green_points` yêu cầu `p_points > 0` → admin không claw-back được points.

### Module: Rewards — `dashboard/rewards/**`

- 🔴 **blocker** — Hardcoded EN khắp `RewardsBrowser.tsx:35-36, 44, 60, 62, 109, 111-112, 121, 123, 129-132`.
- 🟠 **high** — RPC `redeem_reward` (migration 014) granted `authenticated` không check `auth.uid() = p_user_id` → user A drain points user B.
- 🟡 **medium** — `window.confirm()` cho redeem (`:26`) — unstyled + không i18n.
- 🟡 **medium** — Redemption row hiện `reward_id.slice(0,8)…` thay vì name (`:141-143`).
- 🟡 **medium** — `myPoints` stale sau redeem → có thể double-submit (RPC sẽ catch nhưng UX confusing).
- 🟡 **medium** — `Rewards.points_cost CHECK (>0)` nhưng `total_stock` 0 + `status='Active'` được phép → reward visible nhưng redeem fail luôn.
- 🟡 **medium** — `redeem_reward` đặt status `LowStock` khi stock - 1 = 0 (nên là `SoldOut`).
- 🟢 **low** — `<Image unoptimized>` cho `image_url`.

### Module: Leaderboard — `dashboard/leaderboard/_components/LeaderboardView.tsx`

- 🔴 **blocker** — Hardcoded EN: "All time", "This month", "This week", "Loading…", "No activity in this window." (`:41, 47, 49`).
- 🟠 **high** — `services/gamification.service.ts:367-405` `.limit(5000)` rồi aggregate trong Node → heavy.
- 🟡 **medium** — Hiện `r.email` cho mọi user xếp hạng → PII leak.
- 🟡 **medium** — Window switch race — không AbortController.

---

## Phase 10 — Admin Platform

### Module: Authorization

- 🟠 **high** — `/admin/page.tsx`, `users/page.tsx`, `emission-factors/page.tsx`, `formula-builder/page.tsx`, `settings/page.tsx` không gọi `requireSystemAdmin()` — chỉ relying middleware. Layout cũng không enforce; deref `user!` unconditional → defence-in-depth gap.
- 🟡 **medium** — `getEmissionFactorsAction` / `getEmissionCategoriesAction` / `getCalculationTemplatesAction` (`sustainability.actions.ts:45-69`) skip `requireAdmin()` — anyone signed-in đọc được.

### Module: Admin Users — `admin/users/page.tsx`

- 🔴 **blocker** — `getAllUsers()` (`user.service.ts:87-100`) load TOÀN BỘ user via service-role, no pagination, no projection — full PII (email/phone/bio/avatar) trong SSR payload.
- 🟠 **high** — Không `requireSystemAdmin` guard; `getUserStats` cũng service-role không gate.
- 🟡 **medium** — `checkIsGoogleOnlyAccount` list 1000 users rồi tìm → fail silent khi >1000 (`user.service.ts:15-29`).
- 🟡 **medium** — Không audit log khi admin view users list.

### Module: System Overview — `system-overview/page.tsx`

- 🟡 **medium** — `getPlatformMetrics()` pull mọi row `EmissionLogs.co2e_result` rồi sum JS (`admin-metrics.service.ts:36`) — unbounded.
- 🟡 **medium** — `getGrowthTrends` pull all `created_at` rồi bucket JS.

### Module: Formula Builder — `lib/formula-engine.ts`

- 🔴 **blocker** — `SAFE_FORMULA_REGEX` thiếu `,` → mọi formula dùng `pow(a,b)`, `min(a,b)`, `max(a,b)` reject "invalid characters" mặc dù doc nói support.
- 🟠 **high** — Sandbox dùng `new Function("use strict;...")` — chỉ regex whitelist là phòng tuyến duy nhất → thêm `,` xong là `pow.constructor("…")()` reachable nếu mọi function expose closure. RCE risk nếu regex relax.
- 🟡 **medium** — `extractVariables` regex bắt `e3` ở `1e3` (scientific) thành variable → false positive.
- 🟡 **medium** — Không CPU/iter limit; `pow(2, pow(2, 30))` freeze thread.
- 🟡 **medium** — Chỉ có `createCalculationTemplateAction`, thiếu `update`/`delete`.

### Module: Admin Subscriptions

- 🟡 **medium** — `listPlansAction` chỉ `requireSession()` — ok nếu plans là public, double-check không có cost-related hidden cols.
- 🟡 **medium** — Plan create/update/archive không write audit log app-layer; DB trigger có capture nhưng `actor_user_id = NULL` do service-role.
- 🟡 **medium** — `confirmMockPayment` privilege escalation (đã note ở Phase 7).
- 🟡 **medium** — `subscribeToPlan` race (đã note ở Phase 7).

### Module: Audit Logs Admin — `audit-logs/_components/AuditLogTable.tsx`

- 🟡 **medium** — CSV export chỉ export 25-row current page nhưng button label "Download CSV".
- 🟢 **low** — `actor_user_id`/`resource_id` slice 8 ký tự không copy button.
- 🟢 **low** — Thiếu preset "last 24h"/"today".

### Module: Contact Messages — `admin/contact-messages/**`

- 🟡 **medium** — Hard limit 200 rows, không paginate (`admin-orgs.service.ts:208-218`).
- 🟢 **low** — `mailto:` populate raw `m.email` — header injection chars không sanitize.

### Module: Admin Organizations

- 🟡 **medium** — `searchOrganizations` build `.or()` filter string interpolation `,` → injection: `foo,verification_status.eq.Verified` bypass filter (`admin-orgs.service.ts:40-44`).
- 🟡 **medium** — N+1: member_count + active_subscription per row (`:58-89`).
- 🟡 **medium** — `setOrgVerificationStatusAction` "Suspended" không có enforcement downstream → flag decorative.

---

## Phase 11 — Hardening / Cross-cutting

### i18n
- 🟡 **medium** — Validation errors hardcode EN trong hooks: `useCreateEvent.ts:21-41` (`MSG01: Event name is required.`), `useCreateOrganization.ts:19-25`, `useRegisterForm.ts:10-16`, `useResetPassword.ts:8-10`, `useVerifyOtp.ts:27`, `useForgotPassword.ts:17, 49`, `useForgotPasswordVerify.ts:28`.
- 🟡 **medium** — `aria-label` EN: `Header.tsx:155, 178`, `Toast.tsx:110`, `LanguageSwitcher.tsx:41`, `QrCode.tsx:26`.
- 🟡 **medium** — Placeholder VI text leak vào EN UI: `FormulaBuilderForm.tsx:177, 193`, `InputSchemaBuilder.tsx:87`, `EFModal.tsx:287`.
- 🟢 **low** — Locale init bug: `i18n/config.ts:6-13` `lng: "en"` ở module load → flash EN trước khi `provider.tsx` apply saved lang → FOUC + hydration mismatch.
- 🟢 **low** — Cả 2 locale eager load (~94KB) vào client bundle — public page mang theo i18n admin/billing/org.
- 🟢 **low** — `defaultValue:` fallback dùng tràn → ẩn missing keys.

### Type safety
- 🟠 **high** — `User.status` typed `string` thay vì `"active"|"pending"|"deleted"` (`user.types.ts:7`); tương tự `AdminOrganizationRow.verification_status, org_type, member.status, member.role_id` (`admin.types.ts:24-45`).
- 🟡 **medium** — Repeated `as unknown as` casts: `audit.service.ts:100`, `subscription.service.ts:124, 136`, `reports.service.ts:60`, `emissionLog.service.ts:88`, `sustainability.service.ts:75, 142`, `subscription-lifecycle.service.ts:76`.
- 🟡 **medium** — `ApiResponse` (`api.types.ts:1-4`) `success?: boolean` + `error?: string` cả 2 optional — không phải discriminated union.
- 🟡 **medium** — Hardcoded role UUID duplicate: `lib/roles.ts:6-7`, `user.service.ts:191`, `org-member.service.ts:17`, `useEmployeeManager.ts:50-51`.
- 🟢 **low** — `OrganizationMember.role_id/status` nullable string force null-check khắp nơi.

### Tests
- 🟠 **high** — Vitest coverage chỉ track 3 path (`vitest.config.ts:13-17`: `lib/auth/**`, `messages.ts`, `audit.service.ts`) — formula engine, billing, reports không track.
- 🟠 **high** — Không test cho: `formula-engine.ts` sandbox, `avatar.ts`, `download.ts`, `emails.ts` templates.
- 🟡 **medium** — Không service-layer test cho `subscription.service`, `subscription-lifecycle.service`, `personal-log.service` (race/quota path).
- 🟡 **medium** — 1 integration test (`db-triggers.test.ts`) auto-skip khi env thiếu → CI không enforce.
- 🟡 **medium** — Không test cho auth flows (login/register/forgot/middleware) — đường nguy hiểm nhất 0% coverage.
- 🟡 **medium** — Không test BR-08 (rate limit + honeypot), BR-09 (capacity), BR-26 (last-admin guard), BR-04/BR-05.
- 🟢 **low** — Không test cho hooks (client state) và không React Testing Library setup.

### Bundle / perf
- 🟡 **medium** — `next/dynamic` = 0 usage; heavy client `formula-builder`, PDF preview không split.
- 🟡 **medium** — Cả 2 locale bundle (94KB) trên mọi page public.
- 🟡 **medium** — `lib/emails.ts:24-31` tạo transporter mới mỗi send — không pool.
- 🟢 **low** — Inter font không `display: "swap"`.

### Accessibility
- 🟡 **medium** — Modals 12 chỗ `fixed inset-0` không có `role="dialog"`, focus trap, Esc, autofocus: `AddEmissionModal.tsx`, `OrgDetailView.tsx:180, 188`, `ReviewQueue.tsx:157`, `EmployeeManager.tsx:190`, `dashboard/page.tsx:87`.
- 🟡 **medium** — Logo alt EN-only.
- 🟡 **medium** — List rows pending state không `aria-busy`.
- 🟢 **low** — `#79B669` trên trắng = ratio ~2.4 → fail WCAG AA body.
- 🟢 **low** — `LanguageSwitcher` menu không `role="listbox"`/`aria-expanded` linkage.

### Lint / TS config
- 🟡 **medium** — `eslint.config.mjs` thiếu `no-floating-promises`, `react/jsx-no-leaked-render`, `no-console`, `import/no-cycle`.
  - *Fix*: thêm `plugin:@typescript-eslint/recommended-type-checked` + `no-restricted-imports` ban `@/lib/supabase/client` từ `services/**`.
- 🟢 **low** — `tsconfig.json target: "ES2017"` — bump ES2020+; thiếu `noUncheckedIndexedAccess`.
- 🟢 **low** — `next.config.ts` rỗng — không có `images.remotePatterns`, `experimental.optimizePackageImports: ["@mui/icons-material"]`.
- 🟢 **low** — `@mui/material`, `@emotion/react`, `@emotion/styled` declared nhưng 0 value imports → dead dep.

### Env / deploy
- 🟢 **low** — `layout.tsx:22` hardcode `<html lang="en">`.
- 🟢 **low** — `metadata` EN-only, không `alternates.languages`.
- 🟢 **low** — `vercel.json` không có `headers` block (CSP, X-Frame-Options).
- 🟢 **low** — Build expose `X-Powered-By: Next.js` (chưa set `poweredByHeader: false`).

---

# Phần II — Theo Module ngang (Cross-cutting tech debt)

## Module: Supabase clients & service layer

- 🟠 **high** — Module-scope `const supabase = createClient()` ở `useAuth.ts:7` → fail nếu transitively imported by server component.
- 🟠 **high** — Dead/broken services: `services/organization.service.ts` (entire), `services/event.service.ts` (entire), `services/sustainability.service.ts` mostly unused. `getOrganizationMembers` query column `role` không tồn tại.
- 🟡 **medium** — Browser-side services dưới `src/services/` violates "services = server-only" convention (codebase-summary.md:86, 207): `emissionLog.service.ts`, `event.service.ts`, `organization.service.ts`, `sustainability.service.ts`.
  - *Fix*: rename `*.client.ts` + move `src/lib/api/` hoặc xóa.
- 🟡 **medium** — `auth.service.ts` legacy axios là chỗ duy nhất dùng axios — migrate sang `fetch`, drop dep ~30KB.
- 🟡 **medium** — Mixed pattern: server actions (`auth.actions.ts`) + Axios (`auth.service.ts`) + raw `fetch` (`PublicFormView.tsx:88`) — 3 error-handling path khác nhau.

## Module: Hooks (shared)

- 🟠 **high** — `useRegisterForm.ts:46-50` & `useResetPassword.ts:32-34` lưu plaintext password / reset token vào `sessionStorage`.
- 🟡 **medium** — `useOcrDataExtraction.ts:33` `URL.createObjectURL` không revoke → memory leak.
- 🟡 **medium** — `usePersonalActivity.ts:57`, `CompareView.tsx:54`, `Sidebar.tsx:67` dùng `eslint-disable react-hooks/exhaustive-deps` → stale closure risk.
- 🟢 **low** — `useProfile.ts` fetch 2 lần mount path duplicate.
- 🟢 **low** — Hầu hết hook không AbortController → setState after unmount warning.

## Module: Lib helpers

- 🟠 **high** — `incrementTodayLogCount` non-atomic (đã note Phase 2).
- 🟡 **medium** — Password policy mismatch: `lib/profile.ts:24` (≥8 + letter + digit MSG20) vs `useRegisterForm.ts:14`/`useResetPassword.ts:9` (≥6 only).
- 🟢 **low** — `src/lib/utils.ts` empty 1 line → xóa.
- 🟢 **low** — `src/lib/ocr/parser.ts:117-121` dead variable.
- 🟢 **low** — `formula-engine.ts:32` không cap length (large paste degrade compile).
- 🟢 **low** — `lib/emails.ts:24-31` tạo transporter mỗi send (no pool/keepalive).
- 🟢 **low** — `lib/avatar.ts` mới — không test; `dicebear.com` không whitelist trong `next.config.ts`.

## Module: Shared components

- 🟡 **medium** — `Header.tsx` 257 LOC > 200 LOC rule — split `HeaderDesktop`, `HeaderMobileDrawer`, `UserMenu`.
- 🟡 **medium** — Hardcoded green palette (`#1F8505`, `#79B669`) 20+ files thay vì Tailwind theme tokens.
- 🟢 **low** — `Footer.tsx:23-42` build `FOOTER_LINKS` map với translated string làm KEY → React remount khi switch ngôn ngữ.
- 🟢 **low** — `LanguageSwitcher.tsx:17` read `i18nInstance.language` ở render → SSR luôn "EN", client hydrate "VI" → React hydration mismatch.

## Module: Files > 200 LOC (CLAUDE.md modularization rule)

| File | LOC | Đề xuất split |
|---|---|---|
| `subscription.service.ts` | 482 | plans / subscriptions / invoices / intents |
| `gamification.service.ts` | 420 | challenges / rewards / leaderboard |
| `subscription.actions.ts` | 402 | tương ứng service |
| `subscription-lifecycle.service.ts` | 383 | renewal / dunning / cancel |
| `ActivityLogger.tsx` | 335 | form / list / card |
| `TargetsView.tsx` | 333 | form / list / card |
| `FormBuilder.tsx` | 318 | customization / link / submissions |
| `user.service.ts` | 263 | reads / writes / admin |
| `EmployeeManager.tsx` | 260 | row / role-select / status-select |
| `Header.tsx` | 257 | desktop / mobile / user-menu |
| `formula-engine.ts` | 240 | sandbox / parser / validator |
| `PersonalReport.tsx` | 219 | filter / stats / export |
| `CompareView.tsx` | 206 | form / chart |
| `OrgDetailView.tsx` | 196 | gần limit |

## Module: Migrations & RLS — `supabase/migrations/**`

### `004_audit_logs.sql`
- 🟠 **high** — `audit_table_change()` đọc `auth.uid()` = NULL khi service-role call (nhiều admin path) → audit_logs có `actor_user_id = NULL`.
  - *Fix*: hoặc `set_config('request.jwt.claim.sub', userId)` trước service-role query, hoặc luôn call `writeAuditLog({ actorUserId })` app-layer.
- 🟡 **medium** — Trigger write `to_jsonb(NEW/OLD)` toàn bộ row → PII (email, contact_email, billing_*) lưu vĩnh viễn trong AuditLogs → conflict BR-02 anonymization.

### `010_public_event_forms.sql`
- 🟡 **medium** — `EventPublicFormRateLimits` không cleanup → table grows unbounded.
- 🟡 **medium** — Submit path service-role (bypass RLS) — không có `WITH CHECK` policy chống drift wrong org_id.

### `012/013_subscriptions*.sql`
- 🟡 **medium** — Không có `UNIQUE(subject_type, subject_id) WHERE status IN ('Trial','Active','PastDue')` → race tạo 2 sub active cùng lúc.
- 🟡 **medium** — `Invoices.invoice_number` generate từ `Date.now()` collide khi concurrent tick.
- 🟡 **medium** — Thiếu index `(subject_type, subject_id, status)` cho lookup current subscription.
- 🟢 **low** — `Subscriptions.retry_count` không CHECK ≥ 0.

### `014_gamification.sql`
- 🔴 **blocker** — `redeem_reward` RPC granted `authenticated` không check `auth.uid() = p_user_id` (đã note).
- 🟡 **medium** — `Rewards.points_cost CHECK (>0)` ok nhưng `total_stock=0 + status='Active'` được phép — UI hiện reward redeem ngay fail.

### `apply-migrations.ts` script
- 🟡 **medium** — Chỉ list 004-016, thiếu 017, 018, 019 → operator chạy script bị partial migrate.
- 🟡 **medium** — Raw multi-statement SQL không transaction → mid-file fail = partial state khó recover.
- 🟢 **low** — `normalizeDbUrl` double-encode `%` trong password.

---

# Phần III — Theo Severity (Action plan)

## 🔴 Blockers — fix trước go-live (11 items)
1. `CRON_SECRET` rỗng = open endpoint
2. Password plaintext trong sessionStorage + 2 endpoint
3. OTP Math.random 4 chữ số + no lockout
4. Forgot password enumeration oracle ("no account found")
5. `getEventByIdServer` cross-tenant leak
6. `addOrgMembersAction` hardcode password "123456"
7. Public form chỉ honeypot, BR-08 thiếu CAPTCHA
8. `getAllUsers()` dump PII unpaginated
9. B2C Premium gating chưa implement
10. `redeem_reward` RPC không check user_id
11. Hardcoded EN nguyên trang ở billing/challenges/rewards/leaderboard

## 🟠 High — sprint kế tiếp (~30 items)
- Auth: rate limit (login + send-otp + forgot send), middleware `is_admin` cache, OAuth callback rollback
- Org: review-log không filter `org_id`, employee `getEmployeeActivity` non-admin leak, hard-delete member
- Activity: pagination missing, search no debounce, BR-16 audit, non-atomic daily counter
- Events: `createEventAction` không guard `org_id`, BR-09 `max_events`, public form token expiry, public submission whitelist `submitted_data`
- Admin: 5 page thiếu `requireSystemAdmin` defence-in-depth
- Cron: timing-safe compare, GET → POST, idempotency lock, outcome=fail guard
- Formula engine: regex thiếu `,`, sandbox `new Function` mỏng
- Type safety: status string thay vì union
- Tests: 0% coverage cho auth, lifecycle, formula sandbox, race paths
- Audit log: actor NULL khi service-role call

## 🟡 Medium — quarter (~80 items)
- BR-16 audit log app-layer cho mọi admin mutation (EF, plan, challenge, reward, target, log)
- Timezone-aware dates khắp nơi (VN local-date helper)
- Modal accessibility (focus trap, Esc, role=dialog)
- i18n: 30+ chỗ hardcoded EN/VI mixed
- File >200 LOC split
- Migration cleanup jobs (rate limits, retention)
- Service layer split + dead code remove
- Subscription race conditions (atomic RPC)
- `next.config.ts` images + dynamic imports + remove dead MUI deps

## 🟢 Low / Polish (~50 items)
- Empty state, loading skeleton, copy buttons, color contrast
- ESLint rules siết, `tsconfig` target bump
- Logger structured, Sentry per PENDING §10
- Image optimization (`unoptimized` removal + remotePatterns)
- `vercel.json` security headers

---

# Phần IV — Câu hỏi mở (cần product/architecture quyết)

1. **B2C Premium gating** (PENDING §6) — feature nào cần lock cho user trả phí? Hiện tại sell nhưng không có gate.
2. **CAPTCHA cho BR-08** — hCaptcha/Turnstile? "Signed token" = chỉ UUID hay JWT có expiry?
3. **EmissionLogs từ public form** — có gộp vào tổng KPI org không, hay tách báo cáo riêng?
4. **`Organization.verification_status = 'Suspended'`** — downstream enforcement đâu? Hiện chỉ flag decorative.
5. **Audit actor attribution** — service-role call có nên inject `set_config('request.jwt.claim.sub', userId)` để DB trigger biết actor, hay luôn app-layer `writeAuditLog`?
6. **`/dashboard/help`, `/dashboard/assets`** placeholder — implement hay ẩn menu? (PENDING §12)
7. **`claude-sonnet-4-6`** trong `ocr.service.ts` — intentional hay typo của `claude-sonnet-4-5`?
8. **Role UUID hardcode** — seed migration 014 có khớp `ROLE_ADMIN_ID` literals trong code không?
9. **`/dashboard/organization/[orgId]/`** root — non-admin member có nên access không? Plan §1.3 đánh dấu `/employees` admin-only, không rõ với root.
10. **Public form `EmissionLogs.created_by`** — set null hay set system user? Ảnh hưởng aggregation report.

---

> **Generated by 5 parallel sub-agents** (auth + individual + org + admin + infra).
> Tổng ~210 finding · 11 blocker · ~30 high · ~80 medium · ~50 low · 10 unresolved questions.
> Recommended sequence: blocker → high security → high i18n → file split → migration cleanup → polish.
