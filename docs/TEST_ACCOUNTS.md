# EcoWise — Test Accounts & Flow Guide

> Toàn bộ test account + flow để test full tính năng. Data đã được seed bởi `scripts/seed-demo.ts`.
> Production URL: **https://ecowise-red.vercel.app**
> Local dev URL: **http://localhost:3000**
>
> Mật khẩu chung cho mọi account: **`EcoWise2026!`**

---

## 📋 Tóm tắt 8 account

| # | Email | Tên hiển thị | Role | Org | Plan |
|---|---|---|---|---|---|
| 1 | `demo+sysadmin@ecowise.local` | Trần Thị Linh | **System Admin** | — | — |
| 2 | `demo+techadmin@ecowise.local` | Nguyễn Văn Minh | **Org Admin** | Tech Innovators VN | Business Pro |
| 3 | `demo+techemp1@ecowise.local` | Lê Hồng Hạnh | Employee | Tech Innovators VN | — |
| 4 | `demo+techemp2@ecowise.local` | Phạm Quang Đức | Employee | Tech Innovators VN | — |
| 5 | `demo+mfgadmin@ecowise.local` | Vũ Đức Long | **Org Admin** | Green Manufacturing | Business Basic |
| 6 | `demo+mfgemp1@ecowise.local` | Trần Bích Ngọc | Employee | Green Manufacturing | — |
| 7 | `demo+indiv1@ecowise.local` | Đỗ Thu Trang | Individual | — | Personal Free |
| 8 | `demo+indiv2@ecowise.local` | Hoàng Nam Anh | Individual | — | — |

**Public URLs (no auth):**
- Landing: `/`
- About: `/about` · Services: `/services` · Contact: `/contact`
- Public event form: `/event-form/d606ccc2-cfa3-475a-ae45-4aef2d34de8b`

---

## 1️⃣ System Administrator

**Login:** `demo+sysadmin@ecowise.local` / `EcoWise2026!`

### Test được tính năng gì?
- Toàn bộ `/admin/*` routes
- Quản trị platform: users, orgs, audit logs, subscriptions, gamification, contact messages
- Không thuộc org nào → không thấy `/dashboard/organization/*` từ sidebar

### Flow 1.1: System Overview (Phase 10)
1. Login → tự động redirect `/admin`
2. Click sidebar **"System overview"** → `/admin/system-overview`
3. Verify thấy:
   - **8 KPI tiles**: 2 organizations, 8 active users, 27 emission logs, ~30 tCO₂e tracked, $198 revenue tháng này, 4+ open emission reviews, 2 pending contact, 12 months trend
   - **Growth Trend chart**: 12 bar chart, recent month có nhiều bar nhất
   - **Emissions by Sector table**: Technology, Manufacturing với org_count
   - **Recent System Audit widget**: 10 audit entries gần nhất

### Flow 1.2: Audit Logs viewer (Phase 10, BR-16)
1. `/admin/audit-logs`
2. Test filter:
   - **Action contains** = `login` → chỉ thấy login events
   - **Actor role** = `system_admin` → chỉ chính bạn
   - **Resource** = `subscription` → 3 entries `subscribe_plan`
   - **Status** = `failure` → các login_failed (nếu có)
   - **Date range** → narrow xuống vài ngày
3. Click **"Download CSV"** → file CSV tải về với header + body escape RFC4180
4. Verify **không có button Delete/Edit** → BR-16 read-only

### Flow 1.3: Organizations Manager
1. `/admin/organizations`
2. Search:
   - Search `Tech` → thấy "Tech Innovators Vietnam JSC"
   - Verification filter `Verified` → 1 org
   - Filter `Pending` → "Green Manufacturing Co."
3. Click vào Tech Innovators → detail page:
   - Profile section (legal name, tax, industry)
   - **3 members** liệt kê (admin + 2 employees)
   - **Subscription**: Business Pro
   - **Recent invoices**: 1 invoice $149 Paid
   - **Recent emission logs**: 9 logs (~6 Verified, 3 Pending)
   - **Recent audit**: org_verification_status_changed, create_organization
4. Click verification button **"Suspended"** → org chuyển status Suspended + audit log entry mới
5. Đổi lại về **"Verified"**

### Flow 1.4: Subscription Plans (Phase 7)
1. `/admin/subscriptions` → 6 default plans (4 B2B + 2 B2C)
2. Click **"New plan"** → tạo plan `TEST_DEMO` với price $9, max users 5
3. Sau khi save → quay lại list → plan mới xuất hiện
4. Click **"Edit"** → đổi status `Inactive` → user-facing /billing không show plan này

### Flow 1.5: Gamification — Challenges
1. `/admin/challenges` → 2 global challenges (Energy Saver Week, Bike to Work Month)
2. Click **"New challenge"** → tạo "Plastic Free July" với 200 pts, 30 ngày, status Active
3. Quay lại list → thấy challenge mới
4. Click **"Edit"** trên Bike to Work Month → đổi status Active

### Flow 1.6: Gamification — Rewards
1. `/admin/rewards` → 3 default rewards
2. Click **"New reward"** → tạo "EcoWise T-Shirt" 500 pts, stock 20
3. Click **"Archive"** trên reward khác → status → Inactive

### Flow 1.7: Contact Messages
1. `/admin/contact-messages` → 4 messages
2. Click **"Mark read"** trên "Tư vấn gói Enterprise" → status đổi
3. **"Mark archived"** trên message thứ 2
4. **"Reply"** → mở mailto link với pre-fill subject

### Flow 1.8: User Management (legacy)
1. `/admin/users` → 8 users + green_points

### Flow 1.9: Emission engine
1. `/admin/emission-factors` → 2 seeded factors (Electricity, Travel)
2. CRUD factor mới
3. `/admin/formula-builder` → 2 templates

### Flow 1.10: Trigger cron lifecycle thủ công
Mở terminal, chạy:
```bash
curl -X POST -H "Authorization: Bearer aBCdCWZunr1dsUflGa18QWfxcCfh3nEdyU0g5eu4EZc" \
  https://ecowise-red.vercel.app/api/cron/billing
```
Response phải có `{ "ok": true, "report": { ... } }`.

---

## 2️⃣ Org Admin — Tech Innovators VN

**Login:** `demo+techadmin@ecowise.local` / `EcoWise2026!`

### Test được tính năng gì?
- Toàn bộ `/dashboard/*` (individual side)
- Toàn bộ `/dashboard/organization/[tech-org-id]/*` với quyền admin
- Subscription B2B Pro, review queue, employee manager, billing, challenges org-scoped, form builder
- KHÔNG truy cập `/admin/*`

### Flow 2.1: Org Overview (UC-20)
1. Login → `/dashboard` (Executive Dashboard)
2. Sidebar → **"Organizations"** → `/dashboard/organization`
3. Click **Tech Innovators Vietnam JSC**
4. Click tab **"Overview"** → metrics cards:
   - **Total emissions YTD**: ~ tổng CO₂e của 9 logs
   - **Active employees**: 3
   - **Active events**: 1 (Green Day 2026)
   - **Pending review**: số logs Pending (badge cảnh báo)
5. **Scope 1/2/3 breakdown** progress bars
6. **Top contributors** table — Lê Hồng Hạnh + Phạm Quang Đức
7. **Events** preview

### Flow 2.2: Members & Events (root tab)
1. Tab **"Members & Events"** (root path)
2. Members section → 3 thành viên hiển thị bằng badges
3. **"Add members"** → invite popup → nhập email → invitation flow
4. Events section → 2 events (Green Day 2026 Active + ESG Webinar Scheduled)
5. Click vào event Green Day → detail page

### Flow 2.3: Employee Manager (UC-29, BR-26)
1. Tab **"Employees"**
2. Capacity: `Active members: 3 / 100` (subscription Pro)
3. Search "Hạnh" → filter ra 1 row
4. Status filter "Active" → 3 rows
5. Click **role dropdown** Lê Hồng Hạnh → đổi thành **"Organization Admin"** → audit log entry
6. Đổi lại về "Standard Member"
7. Click **status dropdown** → đổi thành "Inactive" trên 1 nhân viên
8. **Test BR-26**: thử đổi role admin Nguyễn Văn Minh (chính bạn) thành Member → **lỗi MSG26** "You are the only Org Admin"
9. **"Invite employee"** button → modal multi-row

### Flow 2.4: Review Emission Logs (UC-34)
1. Tab **"Review Logs"** (có badge số nếu có Pending)
2. Bảng các logs status Pending hoặc Review
3. Click **"Verify"** trên 1 log → status → Verified + **+10 green points** cho creator (audit log entry `subscription_renewed` không phải log này, mà entry mới)
4. Click **"Reject"** trên log khác → modal nhập reason → confirm

### Flow 2.5: Emission Report (Phase 6)
1. Tab **"Report"** → `/emission-logs/report`
2. Period: tháng hiện tại
3. Format: chọn `PDF`
4. Tick **"Lock logs as Published (BR-07)"**
5. Click **"Generate & download"**:
   - File `.pdf` tải về (cover + executive summary + monthly trend + categories + methodology)
   - Logs trong period đổi status sang `Published`
   - Archive list cuối page hiển thị file mới
6. Quay lại Review tab → logs đã Published → **không còn UPDATE/DELETE được** (BR-07)
7. Repeat với XLSX + CSV format

### Flow 2.6: Compliance Report (UC-27)
1. Tab **"Compliance"** → `/compliance`
2. Period: cả năm
3. Regulation: `GHG_PROTOCOL` (hoặc GRI/TCFD)
4. Language: `English` hoặc `Tiếng Việt`
5. Format: `PDF`
6. Tick **"Lock as Published"**
7. Click **"Generate compliance report"** → PDF có thêm Compliance Checklist (6 items PASS/ATTENTION)
8. Checklist preview ở bottom box

### Flow 2.7: Billing & Subscription (Phase 7-8)
1. Tab **"Billing"** → `/billing`
2. Current plan: **Business Pro** badge "Active", $149/Monthly, auto-renew ON, next billing = +1 tháng
3. **Usage bars**: Members 3/100, Events 2/50
4. Billing info form → fill company name, address, VAT → Save
5. Click **"View invoices"** → 1 invoice $149.00 Paid
6. Click invoice ID → detail page với line items + print button
7. Quay lại Subscription Center → click **"Turn off auto-renew"** → redirect `/billing/cancel`
8. Cancel flow:
   - Warning box (BR-11)
   - Pick reason: "Too expensive"
   - Feedback: "Demo cancel"
   - Click **"Confirm cancellation"** → auto_renew = OFF, subscription vẫn Active đến hết kỳ
9. Quay lại Subscription Center → button đổi thành **"Re-enable auto-renew"**
10. Click → restore auto_renew

### Flow 2.8: Subscribe upgrade (mock checkout)
1. Tab Billing → scroll xuống **Available plans** → click **"Subscribe"** trên Business Enterprise ($499)
2. Redirect → `/checkout/[intentId]`
3. Trang Checkout:
   - **Order Summary**: invoice number, line item, total $499
   - **QR code** (mock placeholder)
   - **Countdown 15:00** đếm ngược
4. Click **"Simulate payment success (mock)"** → spinner → invoice Paid → subscription đổi sang Enterprise → redirect `/billing/invoices/[invoiceId]`

### Flow 2.9: Public Form Builder (UC-33, BR-08)
1. Vào tab Members & Events → click event **"Tech Innovators Green Day 2026"**
2. Click button **"Form builder"** (ở breadcrumb)
3. Trang `/form-builder`:
   - Welcome message editable
   - Brand color picker
   - **Public link** + **QR code** preview
   - **Copy link** button → clipboard
   - **Recent submissions table**: 3 row (flight_economy, car_petrol, train)
4. Click **"Rotate link"** → token mới, URL cũ không còn dùng được
5. Click **"Close form"** → status → Closed (public page sẽ không cho submit)
6. Click **"Publish form"** → status → Published lại
7. Open public link in incognito → form hiển thị

### Flow 2.10: Org Settings (UC-26)
1. Tab **"Settings"** → org profile editable
2. Đổi industry, contact email, website, address, logo URL
3. Verification status read-only (chỉ System Admin set được)
4. Save → audit log entry

### Flow 2.11: Org Challenges (Phase 9.5)
1. Tab **"Challenges"** → 1 org-scoped challenge "Tech Innovators Carbon Heroes"
2. Click **"New challenge"** → tạo challenge mới org-scoped
3. Edit / Delete existing

---

## 3️⃣ Employee — Tech Innovators (đã complete challenge + có badge)

**Login:** `demo+techemp1@ecowise.local` / `EcoWise2026!`

### Test được tính năng gì?
- Tất cả `/dashboard/*` (individual side)
- `/dashboard/organization/[tech-org-id]/*` nhưng **CHỈ Overview + Members&Events** (admin-only tabs bị redirect)
- Đã complete challenge "Tech Innovators Carbon Heroes" → có 150 + 30 (3 verified logs × 10) = 180 green points
- Có FIRST_LOG badge

### Flow 3.1: Profile + sustainability stats
1. `/dashboard/settings/profile`
2. Sustainability stats card:
   - **Tier**: tùy điểm (Bronze < 500 → mức Bronze)
   - **Green points**: 180
   - **Total logs**: 3
   - **Total CO₂e logged**: tổng kg
3. Upload avatar → click "Change avatar" → choose file (JPEG/PNG/WebP < 2MB)

### Flow 3.2: Challenges (UC-49, UC-50)
1. `/dashboard/challenges` → cards challenges:
   - Energy Saver Week (Active)
   - Tech Innovators Carbon Heroes — **"Joined ✓"** (đã complete)
2. Click **"Join"** trên Energy Saver Week → status đổi
3. Click vào card detail → trang `/dashboard/challenges/[id]`
4. Trên Tech Innovators challenge detail → thấy **"Completed"** date

### Flow 3.3: Org access limited
1. `/dashboard/organization` → 1 org (Tech)
2. Click vào → tab **"Overview"** OK, **"Members & Events"** OK
3. Click tab **"Employees"** → redirect về `/overview` (admin only)
4. Click tab **"Settings"** → cũng redirect
5. Click tab **"Review Logs"** → redirect

### Flow 3.4: Personal Activity Logger
- Như flow Individual ở bên dưới — log emission cá nhân ngoài org context.

---

## 4️⃣ Employee — Tech Innovators (verified logs)

**Login:** `demo+techemp2@ecowise.local` / `EcoWise2026!`

### Test được tính năng gì?
- Tương tự #3 nhưng chưa complete challenge
- 20 green points (2 verified logs)
- Demo flow: join challenge → log activity → đợi org admin verify → nhận points

---

## 5️⃣ Org Admin — Green Manufacturing (Pending verification)

**Login:** `demo+mfgadmin@ecowise.local` / `EcoWise2026!`

### Test được tính năng gì?
- Tương tự #2 nhưng:
  - Org **verification status = Pending** (System Admin chưa duyệt)
  - Plan **Business Basic** ($49) thay vì Pro
  - **12 emission logs** gồm cả fuel (Scope 1) — manufacturing data
  - Org chỉ có 2 member (1 admin + 1 employee)

### Flow 5.1: Compare report giữa 2 org
1. Login → `/admin` (nếu là sysadmin) OR vào org của mình
2. So sánh emission breakdown:
   - Tech Innovators: cao Scope 2 (electricity) + Scope 3 (travel)
   - Green Manufacturing: cao Scope 1 (fuel) + Scope 2

### Flow 5.2: Subscription downgrade attempt
1. Tab Billing → Business Basic Active
2. Click "Subscribe" trên Business Trial ($0/free) → flow subscribe → confirm → plan đổi
3. Verify Members 2/10 (Trial cap)

---

## 6️⃣ Employee — Green Manufacturing

**Login:** `demo+mfgemp1@ecowise.local` / `EcoWise2026!`

### Test được tính năng gì?
- Cảm nhận từ POV nhân viên xưởng manufacturing
- 50 green points (5 verified logs)
- Test log fuel emission, log travel

---

## 7️⃣ Individual — Đỗ Thu Trang (mature user)

**Login:** `demo+indiv1@ecowise.local` / `EcoWise2026!`

### Test được tính năng gì?
- Toàn bộ B2C journey
- Đã có: 3 personal logs Verified (60 pts), joined Energy Saver Week, redeemed Premium Discount Code (-150 pts)
- Active target: "Giảm 30% CO2 cá nhân 2026"
- Personal Free subscription

### Flow 7.1: Personal Activity Logger (UC-12, BR-09)
1. `/dashboard/activity`
2. Quota: `Daily entries used: 0 / 50`
3. Click **"Add entry"** → form:
   - Activity name: "Hóa đơn điện tháng 6"
   - Scope: Scope 2
   - Date: hôm nay
   - Quantity: 250 kWh
   - CO₂e: 139.275 (250 × 0.5571)
4. Click **"Save"** → log mới hiện trên list
5. **Test BR-09**: thử submit 51 lần → lần thứ 51 sẽ throw MSG30 "Daily log limit reached"
6. Click delete trên log → success
7. Try delete log status `Published` → button disabled (BR-07)

### Flow 7.2: Personal Report (UC-13, Phase 6)
1. `/dashboard/reports`
2. Period switcher: **Month** / **Quarter** / **Year**
3. Stats:
   - Total CO₂e
   - Scope breakdown (chỉ Scope 2 + 3 cho personal)
   - Top categories
4. Export buttons: click **PDF** → file `.pdf` tải về với cover + summary + methodology
5. Repeat với XLSX + CSV

### Flow 7.3: Carbon Targets (UC-15)
1. `/dashboard/targets`
2. **Active target** card:
   - "Giảm 30% CO2 cá nhân 2026"
   - Baseline: 1500 kg, Target: 1050 kg, Current: tổng từ logs
   - **Progress bar** màu (green if on-track, red if over)
   - **Time elapsed** bar
3. Click **"Archive"** → target archive, prompt tạo mới
4. Click **"Create target"** → form mới → save
5. Trong list "Target history" → thấy archived + active

### Flow 7.4: Recommendations (UC-14)
1. `/dashboard/recommendations`
2. Server analyze top categories (Electricity, Travel) → render suggestion cards
3. Mỗi card có estimated saving (kg CO₂e/năm)

### Flow 7.5: Compare Periods (UC-19)
1. `/dashboard/compare`
2. Default: 60 ngày trước vs 30 ngày trước
3. Đổi period A start/end + period B → click "Compare"
4. Delta card: kg + percentage (reduced green / increased orange)

### Flow 7.6: Challenges (UC-49)
1. `/dashboard/challenges`
2. Energy Saver Week — **"Joined ✓"**
3. Click detail → progress, có button **"Mark complete"** khi active
4. Click "Mark complete" → success + **+200 pts** + redirect refresh

### Flow 7.7: Rewards (UC-53, BR-13)
1. `/dashboard/rewards`
2. **Balance**: balance còn lại (sau khi redeem Discount Code đã trừ 150)
3. Catalog cards (Notebook 200, Tree 500, Code 150)
4. **My redemptions table**: 1 row "Premium Discount Code" - 150 pts Pending
5. Test BR-13: redeem reward Notebook → confirm → atomic decrement stock + points

### Flow 7.8: Leaderboard (UC-52)
1. `/dashboard/leaderboard`
2. Switcher: All time / This month / This week
3. List user ranking với dense rank, top 3 special color

### Flow 7.9: Billing (B2C)
1. `/dashboard/billing` → Personal Free Active
2. Click **"Subscribe"** trên Personal Plus ($4.99 7-day trial)
3. Flow: redirect checkout → mock pay confirm
4. Trở về Subscription Center → Plus Active trial 7 days

### Flow 7.10: Settings & Delete Account (UC-8, BR-02, BR-26)
1. `/dashboard/settings/profile` → update bio + avatar
2. `/dashboard/settings/password` → change password (need old)
3. `/dashboard/settings/danger`:
   - Type email exactly để confirm
   - Tick acknowledge checkbox
   - Click **"Delete my account"**
   - Nếu user là Org Admin cuối → MSG26 block
   - Nếu Individual như indiv1 → success → PII anonymized, logs giữ lại

---

## 8️⃣ Individual — Hoàng Nam Anh (fresh user)

**Login:** `demo+indiv2@ecowise.local` / `EcoWise2026!`

### Test được tính năng gì?
- Cảm giác user mới: chưa có target, chưa join challenge, chưa redeem
- 60 green points (đã có 3 logs Verified seed sẵn)
- Test create org từ đầu

### Flow 8.1: Create Organization
1. `/dashboard/organization` → click **"Create organization"**
2. Form: legal_name "My Demo Co", tax_code "TEST123", org_type "SME"
3. Save → user auto-assigned Org Admin role
4. Quay lại list → org mới xuất hiện

---

## 🌐 Public — không cần login

### Flow 9.1: Landing page
1. `/` → Hero + Services + Steps + Pricing + Mobile App + Footer
2. Test language switcher EN ↔ VI ở header

### Flow 9.2: About + Services
1. `/about` → real impact stats (orgs count, users count, logs count, total tCO₂e)
2. `/services` → 4 capability cards
3. Footer links to /contact, /about, /services

### Flow 9.3: Contact form (BR-08 spirit, rate-limit)
1. `/contact`
2. Submit form name + email + message
3. Test rate-limit: submit > 5 lần trong 15 phút từ cùng IP → 429
4. Submit có giá trị trong hidden field `website` → server pretend success nhưng không lưu (honeypot)
5. Login sysadmin → `/admin/contact-messages` → thấy submission mới

### Flow 9.4: Public Event Form (UC-21, BR-08)
1. Open in **incognito** (no auth): https://ecowise-red.vercel.app/event-form/d606ccc2-cfa3-475a-ae45-4aef2d34de8b
2. Form fields render với brand color của Tech Innovators
3. Live preview update khi đổi distance/diet
4. Submit → success card "Thanks for contributing!" + CO₂e estimate
5. Login Tech Innovators admin → form-builder page → submission mới xuất hiện trong table
6. Login Tech Innovators admin → review queue → mới có 1 log Pending xuất hiện (auto-generated)

### Flow 9.5: Auth flow
1. `/register` → form name + email + password
2. Submit → OTP sent qua email (Gmail SMTP)
3. Verify OTP → account created → redirect login
4. `/login` → submit credentials → dashboard
5. `/forgot-password` → email → OTP → reset password

---

## 🔁 Cross-account scenarios

### Scenario A: Verify log → green points (auto-award)
1. Login `demo+techemp1@ecowise.local` → log activity mới (status Pending)
2. Logout
3. Login `demo+techadmin@ecowise.local` → review queue → Verify
4. Logout
5. Login lại employee → balance green points +10

### Scenario B: Cancel org subscription
1. Login `demo+techadmin@ecowise.local` → Billing → cancel → reason
2. Logout, login sysadmin → `/admin/system-overview` → monthly revenue giảm (sau khi period_end + cron expire)

### Scenario C: Public form submission → org review
1. Open incognito → public form URL
2. Submit 1 entry với transport flight_business 2000 km
3. Login Tech admin → `/emission-logs/review` → log mới Pending từ submission
4. Verify → +10 pts cho... (chưa có owner vì guest submit, fallback null)

### Scenario D: Mock cron renewal flow
```bash
# 1. Force fail renewal cho 1 sub
curl -X POST -b cookies-of-sysadmin.txt \
  https://ecowise-red.vercel.app/api/cron/billing/simulate-fail/<subscription-id>
# 2. Repeat 3 lần → lần thứ 3 sub tự Canceled
# 3. Login sysadmin → /admin/system-overview → status changed
```

### Scenario E: BR-26 last admin protection
1. Login `demo+mfgadmin@ecowise.local`
2. Trang Employees → thử thay đổi role mình thành "Standard Member" → **MSG26 error**
3. Thử delete chính mình → cũng block
4. Phải promote mfg_emp1 thành Admin trước rồi mới demote

---

## 📊 Expected state sau seed

| Metric | Value |
|---|---|
| Total users | 8 |
| Total orgs | 2 (Tech Verified, Mfg Pending) |
| Total emission logs | 27 (21 org + 6 personal) |
| Total CO₂e tracked | ~10-15 tCO₂e |
| Active subscriptions | 3 (Pro, Basic, Free) |
| Total invoices | 3 (Paid) |
| Pending emission reviews | ~6 |
| Pending contact messages | 2 (new) |
| Total green points distributed | 290+ |
| Total badges earned | 5 (FIRST_LOG) |
| Total redemptions | 1 |
| Total challenges | 3 |

---

## 🧹 Reset data nếu cần

Re-run seed (idempotent, không xóa):
```bash
npx tsx scripts/seed-demo.ts
```

Reset hoàn toàn (xóa orgs + users):
```bash
# Cần viết script reset-demo.ts riêng. Hoặc DROP CASCADE rồi re-migrate + re-seed.
```

---

## 📞 Troubleshooting

| Vấn đề | Giải pháp |
|---|---|
| Login 404 | Check `NEXT_PUBLIC_SITE_URL` env trên Vercel |
| Google OAuth redirect sai | Update Authorized URIs trong Google Console + Supabase Auth URL Configuration |
| OTP không tới | Check `GMAIL_APP_PASSWORD` env Vercel, dùng App Password (16-char) không phải Gmail password |
| Cron 401 | Add `CRON_SECRET` env Vercel + redeploy |
| Mock payment không update | Kiểm tra `/api/payments/mock/[id]/confirm` được call (network tab) |
| OCR provider error | Set `ANTHROPIC_API_KEY` env, restart dev. Hoặc dùng mock (skip key). |

Test thoải mái 🌱 — mọi user/role/feature đều có data để demo.
