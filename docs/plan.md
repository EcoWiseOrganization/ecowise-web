# EcoWise Web — Development Plan

> Bản kế hoạch phát triển web app EcoWise dựa trên `docs/SRS.md` và đối chiếu với source code hiện hành.
> Mục tiêu: bổ sung các tính năng còn thiếu trong SRS, **không sửa** những gì đã có và đang hoạt động.
> Mọi tính năng mới phải tuân thủ chuẩn **authentication** (Supabase Auth + middleware) và **authorization** (RBAC theo role + RLS theo `organization_id`).

---

## 0. Tổng quan

### 0.1 Phạm vi
- Chỉ scope **Web Portal** (SRS §3.1). Mobile App (SRS §3.2) bỏ ngoài.
- Tuân thủ NFR §4.2: response < 2s (95%), B2B dashboard < 3s, PDF gen < 10s, uptime 99.9%, encryption at rest, multi-tenant isolation, GHG Protocol alignment, EN + VI.

### 0.2 Stack hiện hành (giữ nguyên)
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · MUI · Supabase (Auth + Postgres + Storage + RLS) · Axios · Nodemailer · i18next.

### 0.3 Kiến trúc tầng (giữ nguyên)
`Page (UI) → Hook (state + logic) → Service / Server Action → Supabase`. Service: client-side dùng RLS user; server action dùng service-role để bypass RLS có kiểm soát.

### 0.4 Phương châm
- Không refactor các module đã hoàn chỉnh (auth flow, admin/users, admin/emission-factors, admin/formula-builder, organization CRUD, emission-logs CRUD, sustainability engine, dashboard chính của individual/org).
- Mỗi phase **đứng độc lập deploy được**, không nửa vời.
- Mỗi feature mới phải có: route guard + RLS + audit log (nếu là critical action) + i18n EN/VI + responsive.

---

## 1. Role Matrix & Authorization Model

### 1.1 Roles (SRS §1.3.1)
| Role | Định nghĩa code-side | Phân biệt qua |
|---|---|---|
| **Guest** | Chưa authenticate | Không có Supabase session |
| **Individual User** | Có session, **không** là active member của bất kỳ org nào | `users` row + 0 active `organization_members` |
| **Employee** | Active member của ≥1 org với role `ROLE_MEMBER_ID` | `organization_members.role_id = ROLE_MEMBER_ID`, `status = Active` |
| **Organization Admin** | Active member với role `ROLE_ADMIN_ID` | `organization_members.role_id = ROLE_ADMIN_ID`, `status = Active` |
| **System Administrator** | Toàn quyền platform | `users.is_admin = true` |

> Một user có thể đồng thời là **Individual** (theo cá nhân) **và** Org Admin/Employee (theo workspace). Context active được xác định qua org selector ở sidebar (đã có `currentOrgId`).

### 1.2 Auth/Author rules (BR-04, BR-05, BR-08, BR-16)
1. **Authentication**: Mọi route `/dashboard/*`, `/admin/*`, `/api/*` (trừ public form endpoint) đều bắt buộc session Supabase (đã có middleware).
2. **System Admin**: `is_admin = true` mới truy cập `/admin/*`. Đã có middleware redirect.
3. **Org-scoped routes** (`/dashboard/organization/[orgId]/*`): server action phải verify `getMyMembershipServer(orgId, userId)` → status `Active` trước khi return data.
4. **Org Admin only actions** (invite, update profile, billing, create event, generate public form, manage subscription): kiểm tra `role_id = ROLE_ADMIN_ID`.
5. **Owner-only mutation** (BR-05): emission log update/delete chỉ owner (`created_by = userId`) hoặc Org Admin với managerial role (BR-04).
6. **Public form** (BR-08): endpoint `/api/public/event-form/[token]` không yêu cầu session, nhưng phải có rate-limit + CAPTCHA + signed token.
7. **Audit log immutability** (BR-16): bảng `audit_logs` có DB trigger reject UPDATE/DELETE.
8. **Frozen factor** (BR-06): khi insert `emission_logs`, hard-copy `factor_value`, `gwp`, `unit`, `factor_version` vào row — không FK đến `emission_factors` hiện tại.
9. **Published lock** (BR-07): trước khi update/delete emission log, kiểm tra status không phải `Published`/`Exported`.

### 1.3 Screen authorization map (SRS §1.4.2.1 đối chiếu)
| Screen / Route | Guest | Individual | Employee | Org Admin | System Admin |
|---|---|---|---|---|---|
| `/`, `/about`, `/services`, `/login`, `/register` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard` (Individual) | ❌ | ✅ | ✅ | ✅ | ❌ |
| `/dashboard/profile`, `/dashboard/settings/password` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard/activity`, `/dashboard/reports`, `/dashboard/targets` | ❌ | ✅ | ✅ | ✅ | ❌ |
| `/dashboard/organization` (list & create) | ❌ | ✅ | ✅ | ✅ | ✅ (read) |
| `/dashboard/organization/[orgId]` (overview, detail) | ❌ | ❌ | ✅ | ✅ | ✅ |
| `/dashboard/organization/[orgId]/employees` | ❌ | ❌ | ❌ | ✅ | ✅ (read) |
| `/dashboard/organization/[orgId]/events/*` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `/dashboard/organization/[orgId]/events/[id]/form-builder` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/dashboard/organization/[orgId]/billing/*` | ❌ | ❌ | ❌ | ✅ | ❌ |
| `/dashboard/billing/*` (B2C) | ❌ | ✅ | ❌ | ❌ | ❌ |
| `/event-form/[token]` (public submit) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/admin` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/admin/system-overview`, `/admin/audit-logs`, `/admin/organizations`, `/admin/subscriptions`, `/admin/rewards`, `/admin/challenges` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/admin/users`, `/admin/emission-factors`, `/admin/formula-builder` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/challenges` (browse + join) | ❌ | ✅ | ❌ | ❌ | ✅ (read) |

---

## 2. Gap Analysis (đã có vs còn thiếu)

### 2.1 Đã có — KHÔNG sửa
- Auth: login, register + OTP, forgot/reset password, Google OAuth, callback, signOut.
- Middleware role-based redirect (is_admin).
- Admin: `/admin`, `/admin/users`, `/admin/emission-factors`, `/admin/formula-builder`.
- Individual dashboard chính (`/dashboard`): scope cards, hotspots, intensity, compliance, add emission modal, activity table khi có org context.
- Organization: create, list, detail (members + events), event detail, member invite cơ bản.
- Emission logs: CRUD, evidence upload, formula calculation engine, frozen factor (cần verify).
- Sustainability engine: emission categories, factors CRUD, calculation templates.
- Storage Supabase (`emission-evidence` bucket), Email service (Nodemailer), i18n EN/VI.

### 2.2 Còn thiếu / cần build
| Module | Feature SRS | Status | Phase |
|---|---|---|---|
| Account | Profile (UC-3, UC-4) | ❌ | 1 |
| Account | Change Password (UC-6) | ❌ | 1 |
| Account | Delete Account (UC-8) — BR-02 | ❌ | 1 |
| Public | About Us (UC-11), Services detail (UC-10), Contact form | ❌ | 2 |
| B2B Org | Update Org Profile (UC-26) | ❌ | 3 |
| B2B Org | Org Dashboard đầy đủ (UC-20) — metrics, employee activity, event status | Partial | 3 |
| B2B Org | Employee Manager (UC-29, UC-30) — edit role, deactivate, BR-03/26 | ❌ | 3 |
| B2B Org | Invite Employee (UC-28) đầy đủ — multi-row, role select, BR-09 limit | Partial | 3 |
| B2B Org | Review/Approve Emission Logs (UC-34) | ❌ | 3 |
| Carbon | Activity Logger UC-12 đầy đủ — OCR, BR-09 anti-spam B2C | Partial | 4 |
| Carbon | Activity History riêng cho Individual (UC-16) | Partial | 4 |
| Carbon | Personal Emission Report (UC-13) | ❌ | 4 |
| Carbon | Carbon Reduction Goal (UC-15) | ❌ | 4 |
| Carbon | Eco Recommendations (UC-14) | ❌ | 4 |
| Carbon | Compare Progress (UC-19) | ❌ | 4 |
| Event | Generate Public Event Form (UC-33) — QR, customization | ❌ | 5 |
| Event | Submit Event Emission Form (UC-21) — guest BR-08 | ❌ | 5 |
| Event | Event Detail nâng cao — metrics, breakdown, attendee | Partial | 5 |
| Reporting | Org Emission Log Report — executive summary, export | ❌ | 6 |
| Reporting | Compliance Report Export PDF/Excel (UC-27) | ❌ | 6 |
| Reporting | Personal report export | ❌ | 6 |
| Subscription | Plan Config System Admin (UC-43, UC-44) | ❌ | 7 |
| Subscription | Subscription Center (UC-31, UC-35, UC-38) | ❌ | 7 |
| Subscription | Process Payment (UC-37) — VietQR/PayOS | ❌ | 7 |
| Subscription | Billing & Payment screen (UC-40) | ❌ | 7 |
| Subscription | Invoices list + detail PDF (UC-42) | ❌ | 7 |
| Subscription | Cancel + Auto-renew (UC-39, UC-41) — BR-10/11 | ❌ | 8 |
| Subscription | Limit enforcement (BR-09) | ❌ | 8 |
| Gamification | View Challenges (UC-49) | ❌ | 9 |
| Gamification | Create/Edit Challenge (UC-48) — System Admin | ❌ | 9 |
| Gamification | Reward Manager (UC-54) + Create Reward | ❌ | 9 |
| Gamification | Earn/Redeem Points + Leaderboard + Badges | ❌ | 9 |
| System Admin | System Overview (UC-47) | ❌ | 10 |
| System Admin | Audit Logs viewer (UC-46) — BR-16 | ❌ | 10 |
| System Admin | Organizations Manager (system-wide) | ❌ | 10 |
| Compliance | Audit log triggers (BR-16), frozen factor verification (BR-06), published lock (BR-07) | ❌ | 0 + 11 |
| Compliance | Real OCR (UC-12) thay mock | Mock | 11 |

---

## 3. Phased Implementation Plan

> 11 phase + 1 phase nền (Phase 0). Mỗi phase liệt kê: **Goal · Scope · Deliverables · Files mới/sửa · Auth/Author · Acceptance · Dependencies**.

---

### Phase 0 — Foundation: Audit Log, Role Helpers, RBAC Hardening ✅ DONE

> Completed 2026-05-10. `npm run build` ✓ · `npm run test:unit` 28/28 ✓ · ESLint Phase 0 files ✓ · TypeScript strict ✓.
> Migrations 004 + 005 sẵn sàng apply qua `scripts/apply-migrations.ts` (cần Session pooler URL trong `DATABASE_URL`).

**Goal**: Chuẩn hoá nền tảng auth/audit/role trước khi build feature mới.

**Scope**:
1. Tạo bảng `audit_logs` immutable (BR-16).
2. Verify + bổ sung trigger freeze factor (BR-06) và published lock (BR-07) trên `emission_logs`.
3. Bổ sung helper role check tập trung.

**Deliverables**:
- Migration `004_audit_logs.sql`:
  - Bảng `audit_logs` (id UUID, actor_user_id, actor_role, action, resource_type, resource_id, old_value JSONB, new_value JSONB, ip_address, status, created_at).
  - Trigger `prevent_audit_log_modification` reject UPDATE/DELETE.
  - RLS: System Admin only SELECT.
- Migration `005_emission_log_constraints.sql`:
  - Trigger trên `emission_logs` BEFORE UPDATE/DELETE → raise nếu `status IN ('Published','Exported')`.
  - Verify cột frozen: `factor_value`, `gwp`, `factor_unit`, `factor_version` (thêm nếu thiếu); set NOT NULL khi insert.
- `src/lib/auth/roles.ts`: helper `requireSession()`, `requireSystemAdmin()`, `requireOrgRole(orgId, [adminOnly?])`, `getCurrentUserContext()`.
- `src/services/audit.service.ts` + `audit.actions.ts`: `writeAuditLog(action, resource, ...)`.
- Wrap các critical action hiện hành (login, create org, invite member, create event, create emission log) gọi `writeAuditLog`.

**Auth/Author**: System-internal — không user-facing.

**Acceptance**:
- `INSERT INTO audit_logs ... ; UPDATE audit_logs ...` → DB lỗi.
- Update emission log đã `Published` → service throw `MSG12`.
- Tất cả action critical hiện hữu đều có entry trong `audit_logs`.

**Dependencies**: Không.

---

### Phase 1 — Account Management Enhancement ✅ DONE

> Completed 2026-05-10. `npm run build` ✓ (route `/dashboard/settings/{profile,password,danger}` đã active) · `npm run test:unit` 48/48 ✓ · ESLint Phase 1 files ✓.
> Migration 006 sẵn sàng apply qua `scripts/apply-migrations.ts`.
> Note: thay vì 2 API routes riêng, dùng server actions trực tiếp (`changePasswordAction`, `deleteMyAccountAction`, `updateMyProfileAction`, `uploadAvatarAction`) — pattern Next.js 16 chuẩn, ít boilerplate hơn.

**Goal**: Hoàn thiện trang Profile, Change Password, Delete Account.

**Scope**:
- UC-3 View Profile, UC-4 Update Profile, UC-6 Change Password, UC-8 Delete Account.
- Replace placeholder `/dashboard/settings`.

**Deliverables**:
- Routes:
  - `/dashboard/settings/profile/page.tsx` — view + edit (first_name, last_name, phone, bio, avatar). Avatar upload qua Supabase Storage `avatars` bucket. Sustainability stats card (CO₂ saved, current tier — derive từ `emission_logs` + `green_points`). My Organization card (link tới `/dashboard/organization/[orgId]`). Recent Invoices stub (sẽ fill ở Phase 7). Buttons: Update Password, Log Out, Delete Account.
  - `/dashboard/settings/password/page.tsx` — verify-old-password step → new password + confirm.
  - `/dashboard/settings/danger/page.tsx` — Delete Account confirm dialog (typing email confirm).
- Hooks: `useProfile`, `useUpdateProfile`, `useChangePassword`, `useDeleteAccount`.
- Services:
  - `user.service.ts` mở rộng: `getProfile(userId)`, `updateProfile(input)`, `uploadAvatar(file)`, `deleteAccount(userId)`.
  - `auth.service.ts` mở rộng: `changePassword(oldPassword, newPassword)`.
- API route `/api/auth/change-password` — verify old via `signInWithPassword(reauth)`, update via admin client.
- API route `/api/auth/delete-account` — BR-02:
  - Block nếu user là Org Admin cuối cùng của bất kỳ org nào (MSG26).
  - Anonymize: set `users.full_name = NULL`, `email = 'deleted-{uuid}@anonymous'`, `user_name = NULL`, `status = 'Deleted'`.
  - Giữ `emission_logs` (đã có created_by → keep id nhưng PII đã clear).
  - Revoke green points: set 0.
  - Sign out + audit log.
- Migration `006_user_profile_fields.sql`: add `phone`, `bio`, `avatar_url`, `last_login_at` vào `users` (nếu thiếu).
- i18n keys cho settings.

**Auth/Author**:
- `requireSession()` cho mọi route.
- Profile mutation: chỉ self.
- Delete Account: extra captcha/typing-confirm + check Org Admin uniqueness.

**Acceptance**:
- User edit profile → save → reload thấy data mới + audit log.
- Change password sai old → MSG09; new ≠ confirm → MSG22; ≥8 chars policy → MSG20.
- Delete Account: Org Admin cuối cùng → block với MSG26; nếu không → email mất khỏi `users`, login lại bằng email cũ thất bại, emission_logs vẫn còn.

**Dependencies**: Phase 0 (audit log).

---

### Phase 2 — Public Website Discovery ✅ DONE

> Completed 2026-05-10. `npm run build` ✓ (4 routes mới: `/about`, `/services`, `/contact`, `/api/public/contact`) · `npm run test:unit` 58/58 ✓ · ESLint Phase 2 files ✓.
> Migration 007 (`ContactMessages` + `ContactRateLimits` + RLS + audit trigger) sẵn sàng apply.

**Goal**: Bổ sung trang About Us, Services detail, Contact form (UC-9, UC-10, UC-11).

**Scope**: Public marketing pages + lead-gen contact form.

**Deliverables**:
- Routes:
  - `/about/page.tsx` — Vision, Impact statistics (real number từ aggregate `users count`, `organizations count`, `emission_logs sum CO2e` qua server component), Contact section.
  - `/services/page.tsx` — capabilities cards (Carbon Tracking, Org Management, Events, Audit & Compliance), CTA Login/Register.
  - `/contact/page.tsx` — form (name, email, message). Submit → API → email gửi tới `support@ecowise.local` (Nodemailer) + lưu vào bảng `contact_messages`.
- Migration `007_contact_messages.sql`: bảng `contact_messages` (id, name, email, message, status, created_at). System Admin SELECT only.
- API `/api/public/contact` với rate-limit (5 req/15 min/IP) + simple captcha (math hoặc honeypot).
- Update Header/Footer thêm link About / Services / Contact.

**Auth/Author**: Public — không session. Contact API có rate-limit middleware riêng.

**Acceptance**:
- Visit `/about` không login OK; impact statistics hiển thị real-time.
- Submit contact form > 5 lần / 15 phút từ cùng IP → 429.
- System Admin có thể list `contact_messages` (sẽ làm UI ở Phase 10).

**Dependencies**: Không.

---

### Phase 3 — B2B Organization Enhancement ✅ DONE

> Completed 2026-05-10. `npm run build` ✓ (4 routes mới `/overview`, `/employees`, `/settings`, `/emission-logs/review`) · `npm run test:unit` 70/70 ✓ · ESLint Phase 3 files ✓.
> Migration 008 (`industry`, `verification_status`, `max_users/max_events`, `Rejected` status, review_reason/reviewed_by/at) sẵn sàng apply.

**Goal**: Hoàn thiện Org Dashboard, Employee Manager, Invite flow, Review Emission.

**Scope**: UC-20, UC-26, UC-28, UC-29, UC-30, UC-34. BR-03, BR-04, BR-09, BR-26.

**Deliverables**:
- Routes:
  - `/dashboard/organization/[orgId]/overview/page.tsx` — Org Dashboard:
    - Metrics summary cards (Total Emissions YTD, Active Employees, Active Events, Subscription Plan).
    - Emission Trends chart (12 months).
    - Employee Activity table (top contributors, green points, last activity) → link Manage Employees.
    - Event Status table (name, date, status, offset %).
    - Buttons: Manage Subscription, Create New Event, Log Activity, Export Report.
  - `/dashboard/organization/[orgId]/employees/page.tsx` — Employee Manager:
    - Search by name/email/department, Department + Status filter, table.
    - Actions: Edit Role (Standard / Admin) modal, Activate / Deactivate (BR-03), Remove (BR-26 block last admin).
    - Invite Employee button → modal multi-row (email + role).
  - `/dashboard/organization/[orgId]/settings/page.tsx` — Update Org Profile (UC-26): legal_name (read-only), tax_code (read-only after creation), org_type, industry, address, contact_email, logo upload.
  - `/dashboard/organization/[orgId]/emission-logs/review/page.tsx` — Review queue cho Org Admin:
    - Filter by status `Pending` / `Review`, table, action Verify / Reject với reason.
- Services:
  - `organization.service.ts` thêm: `updateOrganization(orgId, input)`, `getOrgMetrics(orgId, year)`, `getEmployeeActivity(orgId)`.
  - Mới `org-member.service.ts`: `updateMemberRole(memberId, roleId)`, `setMemberStatus(memberId, status)`, `removeMember(memberId)`. Mọi mutation gọi `writeAuditLog`.
  - `emissionLog.service.ts` thêm: `verifyEmissionLog(logId, decision, reason)`.
- Migration `008_org_metadata.sql`: thêm `industry`, `logo_url`, `verification_status` vào `organizations` nếu thiếu.
- Hooks: `useOrgOverview`, `useEmployeeManager`, `useInviteEmployees`, `useReviewQueue`.
- BR-09 enforcement: trước khi invite, gọi service check `subscription.max_users vs current_active_count`. Nếu vượt → MSG24/MSG25 + disable Invite button.
- BR-26: trước khi Deactivate / Remove, đếm số Org Admin active → nếu = 1 và target là admin → block + MSG26.

**Auth/Author**:
- Mọi route org-scoped: `requireOrgRole(orgId)` (any role).
- Settings, Employees, Review: `requireOrgRole(orgId, { adminOnly: true })`.
- Audit log: mọi action role change, status change, verify decision.

**Acceptance**:
- Org Admin vào Overview → thấy metrics real từ `emission_logs` của org.
- Deactivate employee → user đó login → vẫn login được nhưng không thấy org đó trong list (RLS filter status = Active).
- Last admin → cố Deactivate → MSG26.
- Invite vượt limit → block.
- Verify log → status `Verified` + audit row.

**Dependencies**: Phase 0 (audit), Phase 7 chưa cần (BR-09 dùng default trial limit nếu chưa có subscription).

---

### Phase 4 — Carbon Footprint Tracking (User Side) ✅ DONE

> Completed 2026-05-10. `npm run build` ✓ (5 routes mới `/dashboard/activity`, `/dashboard/recommendations`, `/dashboard/compare` + thay placeholder `/dashboard/reports` & `/dashboard/targets`) · `npm run test:unit` 86/86 ✓ · ESLint Phase 4 files ✓.
> Migration 009 (CarbonTargets, DailyLogCounters, EmissionLogs.org_id NULLABLE + RLS personal) sẵn sàng apply.

**Goal**: Hoàn thiện trải nghiệm cá nhân: Activity Logger nâng cao, Reports, Targets, Recommendations, Compare.

**Scope**: UC-12, UC-13, UC-14, UC-15, UC-16, UC-19. BR-05, BR-06, BR-07, BR-09 anti-spam B2C.

**Deliverables**:
- Migration `009_targets_and_personal.sql`:
  - Bảng `carbon_targets` (id, user_id NULLABLE, organization_id NULLABLE, target_co2e, baseline_co2e, start_date, end_date, status, created_at).
  - Bảng `daily_log_counters` (user_id, date, count) cho BR-09 anti-spam (≤ N logs/day cho B2C).
- Routes (Individual + Employee, scope cá nhân):
  - `/dashboard/activity/page.tsx` — Activity Logger UC-12 đầy đủ:
    - Form: activity name, scope, source type (dropdown từ `emission_categories`), reporting period, quantity + unit, evidence (upload + OCR optional), live impact preview.
    - Save Entry / Log Another.
    - OCR field: button "Scan receipt" → upload → call `/api/ocr/extract` (Phase 11 sẽ thay mock bằng real).
    - BR-09 client-side check + server-side counter increment.
  - `/dashboard/reports/page.tsx` — Personal Emission Report (UC-13):
    - Filter by period (week/month/quarter/year/custom).
    - Total CO₂e card, breakdown by scope/category, trend line chart, status-based donut.
    - Export button (Phase 6 enable).
  - `/dashboard/targets/page.tsx` — Carbon Reduction Goal (UC-15):
    - Set target form (target reduction %, baseline auto-calc, deadline).
    - Progress bar real-time vs current emissions.
    - History list of past targets.
  - `/dashboard/recommendations/page.tsx` — Eco-Friendly Recommendations (UC-14):
    - Server analyze top 3 emission categories của user → render static rule-based suggestions (mapping từ category → recommendation text trong i18n).
  - `/dashboard/compare/page.tsx` — Compare Progress (UC-19):
    - Period A vs Period B selector, chart compare CO₂e + breakdown.
- Services:
  - `targets.service.ts`: `createTarget`, `getMyTargets`, `getActiveTarget`, `updateTarget`, `archiveTarget`.
  - `recommendations.service.ts`: `getRecommendations(userId)` — pure logic.
  - `emissionLog.service.ts` mở rộng: `getMyEmissionLogs(filters)` (scope = user only), `getMyEmissionStats(period)`.
- Hooks: `useActivityLogger`, `usePersonalReport`, `useTargets`, `useCompareProgress`.
- BR-05 enforce ở service: update/delete chỉ khi `created_by = userId` hoặc requester là Org Admin có managerial flag.
- BR-07: trigger DB của Phase 0 đã handle.
- BR-09 daily anti-spam: server action increment `daily_log_counters` trước khi insert log; check < threshold (config 50/day).

**Auth/Author**:
- Tất cả route: `requireSession()`.
- Mutation log: ownership check.
- Target: 1 user 1 active target (kiểm tra trong service).

**Acceptance**:
- Logger save log → live impact preview = real CO₂e từ formula engine.
- BR-09: log ≥ 51 lần/ngày → MSG30.
- Update log đã Published (Phase 6 sẽ tạo flow set Published) → MSG12.
- Reports show đúng total CO₂e của owner.
- Targets progress = `(current - baseline) / (target - baseline)`.

**Dependencies**: Phase 0.

---

### Phase 5 — Public Event Emission Form (Guest Submit) ✅ DONE

> Completed 2026-05-10. `npm run build` ✓ (3 routes mới `/event-form/[token]`, `/api/public/event-form/[token]`, `/dashboard/.../form-builder`) · `npm run test:unit` 101/101 ✓ · ESLint Phase 5 files ✓.
> Migration 010 (EventPublicForms / EventPublicSubmissions / RateLimits + RLS Org Admin write + audit triggers) sẵn sàng apply.

**Goal**: Org Admin tạo public form, guest submit không cần login (UC-21, UC-33). BR-08.

**Scope**: Form builder, public submission endpoint, attendee tracking.

**Deliverables**:
- Migration `010_public_event_forms.sql`:
  - Bảng `event_public_forms` (id, event_id, token UUID unique, fields JSONB, welcome_message, brand_color, status, created_at).
  - Bảng `event_public_submissions` (id, form_id, submitted_by_email NULLABLE, submitted_data JSONB, computed_co2e, ip_address, user_agent, created_at).
  - Trigger: insert submission → auto-create matching `emission_logs` row gắn `event_id` + `organization_id`.
- Routes:
  - `/dashboard/organization/[orgId]/events/[eventId]/form-builder/page.tsx` — Org Admin:
    - Field configurator (transport, distance, dietary, accommodation), customization (welcome message, brand color), live preview, generate public link + QR.
    - Save Draft / Publish Form.
    - Hiển thị URL public + QR (qrcode library).
  - `/event-form/[token]/page.tsx` — Public form (guest accessible):
    - Render dynamic fields, submit data, success message MSG13.
- API `/api/public/event-form/[token]` (POST):
  - Rate limit (10/IP/hour).
  - Validate token + status `Published`.
  - Compute CO₂e từ formula engine + frozen factor snapshot.
  - Insert `event_public_submissions` + `emission_logs`.
  - Optional: gửi email confirm nếu submitted email.
- API `/api/public/event-form/[token]` (GET): trả config form (fields + branding).
- Component QR generator (dùng `qrcode.react`).
- Update Event Detail page: thêm tab "Public Form" hiển thị URL, QR, list submissions.
- File size limit 5MB (MSG19), supported formats jpg/png/pdf (MSG20).

**Auth/Author**:
- Form builder: `requireOrgRole(orgId, adminOnly)`.
- Public form: **no auth**. Token đóng vai trò signed identifier; status check + rate-limit thay cho session.
- Submission tự động gắn `organization_id` của event → RLS giữ multi-tenant.

**Acceptance**:
- Org Admin generate form → URL public mở incognito vẫn hoạt động.
- Submit → emission_log mới xuất hiện trong org với evidence_url = NULL, status = `Pending`.
- Rate limit vượt → 429.
- File > 5MB upload → MSG19.

**Dependencies**: Phase 0, Phase 3.

---

### Phase 6 — Reporting & Export (PDF / Excel / CSV)

**Goal**: Generate Org Emission Log Report, Compliance Report, Personal report export. UC-27.

**Scope**: PDF generation, Excel/CSV download, status `Published`/`Exported` set khi export.

**Deliverables**:
- Library: `@react-pdf/renderer` (PDF), `exceljs` (xlsx), `papaparse` (csv).
- Routes:
  - `/dashboard/organization/[orgId]/emission-logs/report/page.tsx` — Org Emission Log Report:
    - Executive Summary (total emissions, intensity per revenue/headcount, data completeness).
    - Breakdown by Scope chart, Monthly Trends chart.
    - Methodology Notes section.
    - Export Options: PDF / Excel / CSV.
  - `/dashboard/organization/[orgId]/compliance/page.tsx` — Compliance Report (UC-27):
    - Settings: language EN/VI, regulation type (GHG Protocol / GRI / TCFD).
    - Compliance Checklist (verification status).
    - Preview pane.
    - Download PDF / Export Excel.
- Server actions:
  - `report.actions.ts`: `generateEmissionReport(orgId, period)`, `generateComplianceReport(orgId, options)`, `exportPersonalReport(userId, period, format)`.
  - PDF templates trong `src/lib/pdf-templates/` (cover, executive-summary, scope-breakdown, methodology).
- Khi export thành công → set `emission_logs.status = 'Published'` cho các log trong period (BR-07 trigger sẽ lock).
- File output stream về client + lưu copy vào `report-archives` bucket Supabase (audit purpose).
- Export Personal report (Phase 4 reports page) cũng gọi server action mới.
- Performance budget < 10s (NFR §4.2.2) — sử dụng React-PDF stream nếu volume lớn.

**Auth/Author**:
- Org reports: `requireOrgRole(orgId)`. Compliance export: adminOnly.
- Personal export: `requireSession()` + ownership.
- Audit log mỗi lần export.

**Acceptance**:
- Generate PDF báo cáo Q1/2026 < 10s, download OK.
- Sau export, log trong period thử update → bị block (BR-07).
- Excel export đúng schema + tổng số trùng PDF.

**Dependencies**: Phase 0, Phase 3, Phase 4.

---

### Phase 7 — Subscription & Billing (Foundation)

**Goal**: Plan config (System Admin), Subscription Center, Process Payment, Invoice list. UC-31, UC-35, UC-37, UC-38, UC-40, UC-42, UC-43, UC-44.

**Scope**: VietQR/PayOS as primary (theo screen UC-37). Stripe defer Phase 8 nếu cần.

**Deliverables**:
- Migration `011_subscriptions.sql`:
  - `subscription_plans` (id, plan_code, plan_name, target_customer ENUM B2B/B2C, base_price_usd, billing_cycle ENUM Monthly/Annual, max_users, max_events, features JSONB, status, created_at).
  - `subscriptions` (id, subject_type ENUM Org/User, subject_id, plan_id, status ENUM Trial/Active/PastDue/Canceled/Suspended, current_period_start, current_period_end, auto_renew, trial_end, retry_count, created_at).
  - `invoices` (id, subscription_id, invoice_number unique, billing_reason, amount, currency, status ENUM Paid/PendingPayment/Refunded/PastDue, issue_date, due_date, paid_at, line_items JSONB, pdf_url).
  - `payment_methods` (id, owner_type, owner_id, provider, provider_ref, masked_info, is_default, expires_at, created_at).
  - `payment_intents` (id, invoice_id, provider, qr_payload, amount, status, expires_at, paid_at).
- Routes (System Admin):
  - `/admin/subscriptions/page.tsx` — Plan list (tabs B2B / B2C, search, table).
  - `/admin/subscriptions/new/page.tsx`, `/admin/subscriptions/[id]/edit/page.tsx` — Plan form (target customer, plan code, price, cycle, usage limits, feature permissions checklist).
- Routes (Org Admin / Individual):
  - `/dashboard/organization/[orgId]/billing/page.tsx` — Subscription Center cho org:
    - Current Subscription card, Plan Usage progress (users x/Y, events x/Y), Billing Information form (company, billing email, address, VAT ID), Available Plans grid (Basic/Pro/Enterprise), Upgrade button, link Payments & History.
  - `/dashboard/billing/page.tsx` — B2C Subscription Center cho Individual.
  - `/dashboard/organization/[orgId]/billing/checkout/page.tsx` — Process Payment UC-37:
    - Order Summary (plan, price, VAT 10%, total).
    - QR code (VietQR/PayOS) + transfer content + countdown.
    - Webhook polling status (every 5s) until paid hoặc timeout 15 min.
  - `/dashboard/organization/[orgId]/billing/invoices/page.tsx` — Billing Invoices list:
    - Search by invoice ID, table (id, date, billing reason, amount, status), Download PDF.
  - `/dashboard/organization/[orgId]/billing/invoices/[invoiceId]/page.tsx` — Invoice Detail (header, billed-to, line items, payment summary, Print, Download PDF).
- Services:
  - `subscription.service.ts`: `getPlans({ targetCustomer })`, `getCurrentSubscription({ subject })`, `createSubscription(...)`, `getUsage(subscriptionId)`, `getInvoices(subscriptionId, filters)`, `getInvoice(id)`.
  - `payment.service.ts`: `initiatePayOSPayment(invoiceId)`, `pollPaymentStatus(intentId)`, `recordPaymentSuccess(intentId, providerData)`.
  - `payment-method.service.ts`: `addPaymentMethod`, `setDefault`, `remove`.
- API `/api/payments/payos/webhook` — PayOS callback verify signature → mark invoice paid + update subscription period + audit log.
- Migration seed default plans (Trial 14 day, Basic, Pro, Enterprise) với feature matrix.
- BR-09 enforcement (Phase 3 đã placeholder) chuyển sang đọc real từ `subscriptions.plan.max_users` / `max_events`.
- Invoice PDF generator (React-PDF template in `src/lib/pdf-templates/invoice.tsx`).

**Auth/Author**:
- Plan config: `requireSystemAdmin()`.
- Subscription Center org: `requireOrgRole(orgId, adminOnly)`.
- Subscription Center B2C: `requireSession()`, subject = self.
- Webhook: signature verify (no session).
- Audit log: plan create/edit/delete, subscription change, invoice paid, payment method add/remove.

**Acceptance**:
- System Admin tạo plan B2B_PRO → org chọn → thấy ở subscription center.
- Generate QR PayOS sandbox → thanh toán test → webhook update invoice + subscription Active.
- Invoice PDF download trùng số liệu.
- Org thử invite vượt `max_users` → block (Phase 3 logic giờ dùng real data).

**Dependencies**: Phase 0, Phase 3.

---

### Phase 8 — Subscription Lifecycle: Cancel, Auto-renew, Failure Retry

**Goal**: BR-10 (auto-renew fail 3 lần → Canceled/Suspended), BR-11 (cancel không refund, giữ tới hết cycle). UC-39, UC-41.

**Scope**: Background jobs + lifecycle UI.

**Deliverables**:
- Cron job (Supabase Edge Function hoặc Vercel Cron):
  - Daily: scan `subscriptions` đến hạn `current_period_end` AND `auto_renew = true` → tạo invoice mới + initiate payment via stored payment method.
  - Daily: scan `subscriptions.retry_count >= 3` AND `status = 'PastDue'` → set `Canceled` / `Suspended` + email user (MSG27/28).
  - Daily: scan trial sắp hết → email reminder.
- Routes / actions:
  - `/dashboard/organization/[orgId]/billing/cancel/page.tsx` — Cancel flow với reason picker, confirmation MSG07/08.
  - Auto-renew toggle trong Billing Information.
- Service: `subscription.service.ts` thêm `cancelSubscription(id, reason)` (set `auto_renew = false`, status remains active đến `current_period_end`).
- Email templates: `subscription-renewal-success`, `subscription-renewal-failed`, `subscription-canceled`, `trial-ending-soon`.
- Audit log mọi lifecycle event.

**Auth/Author**:
- Cancel: `requireOrgRole(orgId, adminOnly)` (B2B) hoặc self (B2C).
- Cron job: chạy với service role, không user context.

**Acceptance**:
- Mock 3 lần fail webhook → subscription đổi `Canceled`. User mất quyền Premium feature từ ngày period_end.
- Cancel: status vẫn `Active` đến hết cycle, sau đó tự `Canceled` qua cron.

**Dependencies**: Phase 7.

---

### Phase 9 — Gamification

**Goal**: Challenges, Rewards, Points, Badges, Leaderboard (web side). UC-48, UC-49, UC-51, UC-52, UC-53, UC-54, UC-55. BR-12, BR-13, BR-14.

**Scope**: Web tập trung System Admin (Create Challenge / Reward Manager) + Individual (View Challenges, Browse Rewards, Leaderboard). Earn / Redeem logic chạy server-side, mobile sẽ reuse.

**Deliverables**:
- Migration `012_gamification.sql`:
  - `challenges` (id, name, category, target_audience, description, rules JSONB, points_reward, duration_days, verification_method ENUM Photo/Honor, status ENUM Draft/Active/Upcoming/Completed, start_date, end_date, created_by).
  - `user_challenges` (id, user_id, challenge_id, joined_at, progress JSONB, completed_at, status).
  - `badges` (id, code, name, description, icon_url, criteria JSONB).
  - `user_badges` (id, user_id, badge_id, earned_at).
  - `rewards` (id, name, category, sku, description, image_url, points_cost, total_stock, fulfillment ENUM Digital/Physical, status ENUM Active/LowStock/Inactive).
  - `redemptions` (id, user_id, reward_id, points_spent, status, fulfillment_data JSONB, created_at).
  - `green_point_logs` (id, user_id, action ENUM Earn/Spend/Adjust, points, reason, related_id, related_type, created_at) — append-only.
- Routes (System Admin):
  - `/admin/challenges/page.tsx`, `/admin/challenges/new`, `/admin/challenges/[id]/edit` — Create/Edit Challenge UC-48.
  - `/admin/rewards/page.tsx`, `/admin/rewards/new` — Reward Manager + Create Reward UC-54.
- Routes (Individual):
  - `/dashboard/challenges/page.tsx` — View Challenges UC-49 (cards với reward, status, Join button).
  - `/dashboard/challenges/[id]/page.tsx` — Challenge detail + progress.
  - `/dashboard/rewards/page.tsx` — Browse rewards, Redeem button (BR-13 deduct ngay, không reverse).
  - `/dashboard/leaderboard/page.tsx` — Leaderboard UC-52 (filter by week/month/all-time, top 100).
- Services:
  - `challenge.service.ts`: CRUD + `joinChallenge`, `updateProgress`, `completeChallenge`.
  - `reward.service.ts`: CRUD + `redeem`.
  - `points.service.ts`: `earnPoints(userId, points, reason, related)`, `spendPoints(...)` — luôn ghi `green_point_logs` + update `users.green_points` atomic.
  - `badges.service.ts`: `awardBadge`.
  - `leaderboard.service.ts`: `getLeaderboard(period)` — aggregate từ `green_point_logs`.
- Earn point hooks: emission log create with verified status → `earnPoints`. Challenge complete → `earnPoints` + `awardBadge` (nếu criteria).
- BR-14: complete chỉ khi `user_challenges.progress` đạt yêu cầu trong khoảng `start_date - end_date`.
- BR-12: route `transferPoints` không tồn tại; service helper hard-rejects.
- BR-13: redeem là transaction atomic — fail roll back stock + points.

**Auth/Author**:
- Admin routes: `requireSystemAdmin()`.
- View Challenges: Individual + System Admin (theo SRS §1.4.2.1).
- Redeem / Join: `requireSession()` + Individual user check.
- Audit log: mọi point adjust manual, reward CRUD, redemption.

**Acceptance**:
- Admin tạo challenge → user join → progress update → complete → points cộng vào `users.green_points` + `green_point_logs` row.
- Redeem reward → stock giảm 1, points trừ. Nếu stock = 0 → button disable.
- Leaderboard hiển thị top user theo points trong period.

**Dependencies**: Phase 0, Phase 4 (emission log để trigger earn point).

---

### Phase 10 — System Admin Operations

**Goal**: System Overview, Audit Logs viewer, Organizations Manager (system-wide). UC-46, UC-47.

**Scope**: Toàn bộ tooling System Admin còn thiếu.

**Deliverables**:
- Routes:
  - `/admin/system-overview/page.tsx` — Platform Metrics (total orgs, active users, global emissions, monthly revenue), Growth Trends chart 12 months filter, Emissions by Sector chart, Recent Audit Logs widget, Export Report button.
  - `/admin/audit-logs/page.tsx` — Search & filter (period, role, action, status), table (timestamp, user, action, resource, IP, status), pagination, Download CSV.
  - `/admin/organizations/page.tsx` — Search by legal name/tax code, table (legal_name, tax_code, industry, type, status), Actions (View / Edit / Suspend / Delete).
  - `/admin/organizations/[orgId]/page.tsx` — Detail view (read-only profile, members, subscriptions, recent emissions, audit log scoped).
  - `/admin/contact-messages/page.tsx` — list submissions từ Phase 2.
- Services:
  - `audit.service.ts` thêm: `searchAuditLogs(filters)`.
  - `system-metrics.service.ts`: `getPlatformMetrics(period)`, `getGrowthTrends(months)`, `getEmissionsBySector()`.
  - `admin-orgs.service.ts`: `searchOrganizations(filters)`, `setOrgStatus(orgId, status)`, `softDeleteOrganization(orgId)`.
- BR-16: audit logs UI là **read-only**, không có nút delete/edit; backend đã trigger reject.

**Auth/Author**: `requireSystemAdmin()` toàn bộ.

**Acceptance**:
- System Admin xem audit log của bất kỳ resource nào, lọc theo role/action.
- Suspend org → toàn bộ member của org đó mất access (status filter).
- Không có UI nào cho phép modify audit log.

**Dependencies**: Phase 0, Phase 7 (revenue), Phase 9 (gamification metrics nếu show).

---

### Phase 11 — Compliance, OCR, Polish

**Goal**: Hardening cuối: real OCR, RLS audit, performance, i18n hoàn chỉnh, NFR validation.

**Scope**:
1. **OCR thực**: thay `useOcrDataExtraction` mock bằng integration:
   - Provider candidate: Google Cloud Vision hoặc Anthropic vision API.
   - API `/api/ocr/extract` nhận file → call provider → parse fields → return draft activity data.
2. **RLS audit**: review từng bảng (subscriptions, invoices, gamification, public forms) đảm bảo không leak cross-org.
3. **Performance**:
   - Profile B2B Dashboard render < 3s; nếu chậm, thêm materialized view cho aggregated metrics.
   - PDF generation < 10s — stream instead of buffer.
4. **i18n full coverage**: rà các string mới ở Phase 1-10 đã có key EN + VI.
5. **Accessibility**: keyboard nav, color contrast WCAG AA.
6. **End-to-end test smoke** cho luồng critical (login → create org → invite → log emission → export report → upgrade plan).
7. **Email templates polish**: invoice paid, renewal, password reset có brand layout.
8. **Documentation**: cập nhật `docs/codebase-summary.md`, `docs/system-architecture.md`.

**Auth/Author**: Internal hardening — no new routes.

**Acceptance**:
- OCR receipt thật → field tự fill ≥ 80% accuracy trên dataset mẫu.
- Penetration smoke: tạo Org A và Org B, đăng nhập user A1, request `/api/.../organization/{B}/...` → 403/RLS empty.
- Lighthouse score Performance ≥ 80, Accessibility ≥ 90 cho dashboard.

**Dependencies**: Tất cả phase trước.

---

## 4. Cross-cutting Concerns

### 4.1 Database migrations
Đặt trong `supabase/migrations/`, đặt số tăng dần. Mỗi migration kèm rollback note.

### 4.2 Feature flags
Tạm dùng env `NEXT_PUBLIC_FEATURE_<NAME>` cho các phase 7-9 trước khi GA.

### 4.3 Audit log mandatory list
Mọi action sau phải gọi `writeAuditLog`:
- Create/update/delete: organization, member, event, emission_log, emission_factor, calculation_template, subscription_plan, subscription, invoice, challenge, reward, payment_method.
- Auth: login, logout, password change, account delete.
- Export: report PDF, compliance PDF.

### 4.4 Error / message codes
Mọi service/API trả về nhất quán shape `{ ok, code, message, data }` với `code` map sang MSG01-MSG30 (xem SRS §5.2). Tạo enum trong `src/lib/messages.ts`.

### 4.5 i18n
Mỗi feature có file riêng `src/locales/{en,vi}/<feature>.json`. KHÔNG hard-code chữ trong JSX.

### 4.6 Testing strategy
- Unit: formula engine, points service, BR-26 last-admin guard, BR-09 limit, BR-13 redeem atomic.
- Integration: RLS isolation, audit log immutability trigger, BR-07 published lock trigger.
- Smoke E2E: critical flows Phase 11.

---

## 5. Phase Dependencies

```
Phase 0 ─┬─► Phase 1 ─► Phase 11
         ├─► Phase 2
         ├─► Phase 3 ─┬─► Phase 4 ─► Phase 5 ─► Phase 6
         │            └─► Phase 7 ─► Phase 8
         ├─► Phase 9 (sau Phase 4)
         └─► Phase 10 (sau Phase 7, 9)
```

**Recommended order**: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11.

---

## 6. Acceptance Criteria toàn dự án (post Phase 11)

- 100% use case Web Portal trong SRS §3.1 đã implement hoặc có lý do bỏ qua được ghi rõ.
- 16 Business Rules (BR-01 → BR-16) verifiable bằng test.
- NFR §4.2 đạt: response < 2s, dashboard < 3s, PDF < 10s, EN+VI, multi-tenant isolation, audit immutable, encryption at rest.
- Tất cả route protected có auth + role check; không có endpoint nào trả data cross-org cho user khác org.

---

## 7. Open Questions (cần làm rõ trước/khi triển khai)

1. **Payment provider**: SRS §4.1 nói VNPay/Momo/Stripe nhưng UC-37 hiển thị QR (giống VietQR/PayOS). Plan giả định **PayOS** primary cho Phase 7 — confirm trước khi mua/đăng ký account.
2. **Org Admin có quyền tạo Challenge?** UC-48 nói "System Admins (or Org Admins)" nhưng matrix §1.4.2.1 chỉ cho System Admin. Plan đi theo matrix; nếu muốn Org Admin có scoped challenge cho chính org → bổ sung Phase 9.5.
3. **Auditor role riêng?** SRS §1.3.1 không định nghĩa Auditor — Audit logs nằm dưới System Admin. Confirm không cần role riêng.
4. **MSG18-MSG36**: SRS có reference nhưng chưa list đầy đủ trong §5.2. Cần bổ sung khi triển khai message constants.
5. **B2C subscription** unlock gì cụ thể? SRS có tab B2C plan nhưng feature B2C đa số free (gamification). Confirm: B2C Premium = unlimited logs / advanced reports / ad-free?
6. **OCR provider**: Google Vision vs Anthropic vision (claude vision) — chọn theo budget/data residency.
7. **Email infrastructure**: hiện dùng Gmail SMTP (Nodemailer). Volume Phase 7-8 (invoice, reminder) có thể vượt limit Gmail → cân nhắc SendGrid/AWS SES (SRS đã đề xuất).
8. **Asset Inventory** (page placeholder hiện hành): SRS không có use case rõ — plan **bỏ qua**, có thể remove route placeholder hoặc redirect về dashboard. Confirm.
