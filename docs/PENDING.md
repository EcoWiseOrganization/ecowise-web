# EcoWise — Pending Setup Checklist

> Tất cả 11 phase đã code xong (`npm run build` ✓, `npm run test:unit` 161/161 ✓).
> File này list **mọi việc bạn cần làm bằng tay** để đưa hệ thống lên production. Đi từ trên xuống — mỗi mục có command/hướng dẫn paste-and-run.

---

## 1. Apply 12 migration files lên Supabase ⚠️ BẮT BUỘC

12 file migration phụ thuộc lẫn nhau (hàm + ENUM + bảng). Đây là việc đầu tiên — **không apply, không cái gì chạy được**.

### Vấn đề DNS

Direct host `db.<ref>.supabase.co` không resolve trên free tier — Supabase tắt IPv4 direct, chỉ còn pooler hoạt động.

### Cách 1 — Dùng `scripts/apply-migrations.ts` (khuyến nghị)

```bash
# 1. Mở Supabase Dashboard → Project Settings → Database → Connection string
# 2. Chọn tab "Session pooler" (KHÔNG phải Transaction pooler — migration có nhiều DDL trong cùng session)
# 3. Format URL sẽ là:
#    postgresql://postgres.<project-ref>:[PASSWORD]@aws-0-<region>.pooler.supabase.com:5432/postgres
#
# 4. Update .env.local:
#    DATABASE_URL=postgresql://postgres.pefmhymxfsrtunyobour:YOUR_PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres
#
# 5. Chạy:
npx tsx scripts/apply-migrations.ts
```

Script idempotent — chạy lại không hỏng gì. Bao gồm 12 file migration:
- `004_audit_logs.sql` — AuditLogs immutable + generic audit trigger
- `005_emission_log_constraints.sql` — Published/Exported lock + frozen factor
- `006_user_profile_fields.sql` — phone/bio/avatar + avatars bucket
- `007_contact_messages.sql` — ContactMessages + rate limit
- `008_org_metadata.sql` — industry, verification, BR-09 default quota
- `009_targets_and_personal.sql` — CarbonTargets + DailyLogCounters + personal RLS
- `010_public_event_forms.sql` — EventPublicForms + Submissions + rate limit
- `011_report_archives.sql` — bucket report-archives + ReportArchives
- `012_subscriptions.sql` — Plans/Subs/Invoices/PaymentMethods/Intents + 6 seed plans
- `013_subscription_lifecycle.sql` — cancel_reason, retry tracking
- `014_gamification.sql` — Challenges/UserChallenges/Badges/Rewards/Redemptions/GreenPointLogs + atomic RPCs + 4 badges + 3 rewards seed
- `015_perf_indexes.sql` — Phase 11 perf indexes

### Cách 2 — Paste vào Supabase SQL Editor

Nếu bạn không muốn lưu DB password vào `.env.local`:

1. Mở Supabase Dashboard → SQL Editor → New query.
2. Paste nội dung từng file `supabase/migrations/004_*.sql` → `015_*.sql` lần lượt.
3. Chạy từng file.

### Verify sau khi apply

Quay lại SQL Editor, paste:
```sql
-- File scripts/audit-rls.sql
-- (xem nội dung trong repo)
```
Mục tiêu: mọi bảng app-level đều có `rls_enabled = true` và `policy_count >= 1`.

---

## 2. Set environment variables cho production

`.env.local` đang chứa creds dev. Khi deploy (Vercel / Cloudflare / Render), cần copy sang **secret store** của host.

### Required (đã có trong .env.local)
| Var | Mô tả |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL REST của Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key, browser dùng |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — **CHỈ server**, đừng để rò rỉ |
| `NEXT_PUBLIC_SITE_URL` | URL production (e.g. `https://ecowise.vn`) |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | SMTP cho transactional email |

### Phase 8 — Cron auth
| Var | Mô tả |
|---|---|
| `CRON_SECRET` | Đã sinh trong .env.local. Copy giá trị tương tự lên Vercel. Nếu để trống, bất kỳ ai cũng gọi được `/api/cron/billing` |

### Phase 11 — OCR (tùy chọn)
| Var | Mô tả |
|---|---|
| `ANTHROPIC_API_KEY` | Bật Claude vision cho `/api/ocr/extract`. Để trống → dùng mock provider trả deterministic data |
| `ANTHROPIC_OCR_MODEL` | Override model id (default `claude-sonnet-4-6`) |

### Cách add env trên Vercel
```
Project → Settings → Environment Variables → Add
- Tick cả Production / Preview / Development theo nhu cầu
- Click "Save"
- Vercel sẽ deploy lại
```

---

## 3. Apply schema thừa (nếu chưa có)

Bạn có 3 migration cũ `001_organizations_events.sql`, `002_emission_engine.sql`, `003_emission_logs.sql` đã được tạo từ trước. Nếu Supabase project hiện có sẵn các bảng `Organization`, `OrganizationMembers`, `Events`, `EmissionLogs`, `EmissionCategories`, `EmissionFactors`, `CalculationTemplates`, `User` thì bỏ qua. Nếu không, paste 003_*.sql sau 001 + 002.

Để check, chạy SQL:
```sql
SELECT relname FROM pg_class WHERE relkind = 'r' AND relname IN
  ('User','Organization','OrganizationMembers','Events','EmissionLogs',
   'EmissionCategories','EmissionFactors','CalculationTemplates');
```
Phải thấy đủ 8 bảng.

---

## 4. Schedule cron (Phase 8 — BR-10)

Cron quét subscription, gia hạn auto-renew, đánh terminate sau 3 lần fail.

### Trên Vercel (recommended)
File `vercel.json` đã ready với schedule `0 2 * * *` (02:00 UTC daily). Khi bạn deploy lên Vercel:
- Vercel tự động đọc `vercel.json` và gọi `POST /api/cron/billing`.
- Vercel kèm `Authorization: Bearer ${CRON_SECRET}` header tự động khi env `CRON_SECRET` được set.

### Trên các host khác (Cloudflare Workers / Render / GitHub Actions)
Chạy mỗi ngày 1 lần:
```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://ecowise.vn/api/cron/billing
```

### Test thủ công lifecycle path BR-10
```bash
# Login as System Admin first via browser, lưu cookies session.
# Sau đó dùng cookies file:
curl -X POST -b cookies.txt https://ecowise.vn/api/cron/billing/simulate-fail/<subscription-id>
# Lặp 3 lần — lần thứ 3 sub sẽ tự động Canceled + email gửi đi
```

Hoặc chạy cron với `?outcome=fail` để force fail tất cả renewals trong tick:
```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  "https://ecowise.vn/api/cron/billing?outcome=fail"
```

---

## 5. Tích hợp payment gateway thật (Phase 7 đang mock)

Hiện tại payment ở **mock mode**: button "Simulate payment success" trong `/checkout/[intentId]` gọi `/api/payments/mock/[intentId]/confirm` để mark Paid. **Không có tiền thật chạy qua đâu.**

### Khi bạn chốt PayOS / VNPay / Stripe / Momo:

1. **Thay phần `subscribeToPlan` mock branch** trong `src/services/subscription.service.ts`:
   - Đoạn `INSERT INTO PaymentIntents (provider: 'mock', qr_payload: 'MOCK|...')` → gọi SDK provider tạo intent, lưu `provider_ref` trả về.
   
2. **Thay `attemptRenewal` mock branch** trong `src/services/subscription-lifecycle.service.ts`:
   - Đoạn `outcome: boolean` → call provider charge với `payment_method` đã saved.

3. **Tạo webhook endpoint** thay cho `/api/payments/mock/[intentId]/confirm`:
   - Cần verify signature theo provider (PayOS HMAC, Stripe Stripe-Signature header).
   - Tìm intent theo `provider_ref`, gọi cùng logic `confirmMockPayment` → mark Paid + activate subscription.

4. **Update PaymentIntents.provider** từ `'mock'` thành `'payos' | 'stripe' | 'vnpay'` v.v.

Bộ contract của service đã abstract — UI không cần thay đổi.

---

## 6. Subscription B2C — clarify scope

Open question từ plan §7: **B2C Premium unlock cái gì cụ thể?** Hiện chỉ có 2 plan B2C seed (`B2C_FREE`, `B2C_PLUS`) với feature labels. Bạn cần:

1. Decide gating logic — feature nào chỉ Premium dùng được? Ví dụ:
   - Advanced reports (Phase 6) → kiểm tra `subscription.plan.features` có `advanced_reports` trước khi cho download PDF.
   - Recommendations (Phase 4) → free.
   - Unlimited daily logs → bỏ BR-09 cap cho B2C_PLUS.

2. Wire feature gates: thêm helper `userHasFeature(userId, featureKey)` đọc `Subscriptions` của subject = User → `plan.features[].key`.

---

## 7. Real OCR provider — nâng cấp prompt nếu cần

Phase 11 mặc định Claude Sonnet 4.6 vision. Nếu bạn muốn Google Vision / Textract:

1. Sửa `src/services/ocr.service.ts` thêm nhánh trong `runOcr`:
```ts
if (process.env.GOOGLE_VISION_API_KEY) return runGoogleVision(input);
```
2. Implement `runGoogleVision` theo cùng signature → trả `OcrResult { provider, fields }`.
3. Pure parser `lib/ocr/parser.ts` không cần đổi — nó nhận text raw và phân tích.

Tinh chỉnh prompt: `PROMPT` constant trong `ocr.service.ts`. Hiện ép trả JSON với 6 fields. Có thể thêm `vendor_address`, `tax_amount`, `payment_method` v.v.

---

## 8. Accessibility audit (chưa thực hiện)

Plan §11 đề cập WCAG AA + keyboard nav + Lighthouse ≥ 90. **Chưa có audit cụ thể** — cần làm thủ công:

```bash
# Local Lighthouse
npx lighthouse http://localhost:3000/dashboard --view --preset=desktop

# Pa11y
npm install -D pa11y
npx pa11y http://localhost:3000/dashboard
```

Common issues to check:
- [ ] Mọi `<button>` không có text label → cần `aria-label`
- [ ] Form inputs có label `<label htmlFor>` hoặc `aria-labelledby`
- [ ] Focus ring rõ trên element interactive (đã dùng Tailwind default)
- [ ] Color contrast: text trên gradient `linear-gradient(270deg,#79B669,#1F8505)` cần white text — đã làm ở 99% chỗ
- [ ] Modal có `role="dialog"` + focus trap + Esc to close (Phase 3 ConfirmDialog cần thêm)

---

## 9. End-to-end smoke test (chưa setup)

Plan §11 yêu cầu E2E cho critical flow. **Chưa có Playwright setup**. Để thêm:

```bash
npm install -D @playwright/test
npx playwright install chromium

# tạo tests/e2e/smoke.spec.ts với scenarios:
# 1. Register → OTP verify → Login
# 2. Create org → invite member → log emission → review verify (org admin)
# 3. Subscribe to B2B_PRO → mock payment → invoice paid
# 4. Generate compliance report → download PDF
# 5. Public event form submit (no auth)
# 6. Redeem reward → balance trừ đúng

npx playwright test
```

---

## 10. Backup + monitoring (chưa setup)

NFR §4.2.4: uptime 99.9%, daily backup. Supabase free tier:
- Daily backup ✓ (Supabase tự động giữ 7 ngày)
- Monitoring: chưa có. Khuyến nghị Sentry để bắt error client + server.

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

---

## 11. Domain + SSL (chưa setup)

`NEXT_PUBLIC_SITE_URL` đang là `http://localhost:3000`. Khi deploy:
1. Mua domain (ví dụ `ecowise.vn`).
2. Add DNS A record → Vercel IP / CNAME → vercel.app subdomain.
3. Update `NEXT_PUBLIC_SITE_URL=https://ecowise.vn` trong env Vercel.
4. Update Supabase Auth → Authentication → URL Configuration → redirect URL.
5. Update Google OAuth Console → Authorized redirect URI = `https://ecowise.vn/api/auth/callback`.

---

## 12. Asset Inventory page (placeholder)

Plan có note giữ `/dashboard/assets` placeholder. Trang hiện hiển thị "Coming soon". Bạn có 2 lựa chọn:

- **Bỏ luôn**: xóa `src/app/(dashboard)/(individual)/dashboard/assets/` + remove entry trong `_config/menu.ts` và i18n keys `menu.assets`, `page.assets.*`.
- **Implement Phase 12** sau này — track AC, máy phát điện, fleet xe... với schedule depreciation.

---

## 13. Email từ Gmail SMTP — chuyển sang ESP khi volume tăng

Gmail SMTP throttle 500 emails/day cho personal account. Khi volume Phase 7 (invoice + renewal email) + Phase 8 (cron daily) tăng:

1. **SendGrid** (free 100/day, paid $19.95/mo cho 50k):
```bash
npm install @sendgrid/mail
# Sửa src/lib/emails.ts replace nodemailer.createTransport bằng sgMail.send
```

2. **AWS SES** (free 62k email/month inside AWS, $0.10/1000 outside): cần verify domain.

3. **Resend** (modern alternative, $20/mo cho 50k):
```bash
npm install resend
```

Mọi templates đã wrap qua `wrapBrand()` trong `src/lib/emails.ts` — chỉ cần thay transport, templates không đổi.

---

## 14. Storage bucket avatars — public read

Migration 006 set `bucket public = true` cho avatars. Có 2 hệ quả:
- ✓ URL avatar embed trực tiếp ở UI không cần signed URL.
- ⚠ User upload ảnh nhạy cảm → ai cũng xem được nếu biết URL.

Cân nhắc đổi thành private + use signed URL (15 min TTL) nếu nội dung nhạy cảm. Code thay đổi:
```sql
UPDATE storage.buckets SET public = false WHERE id = 'avatars';
```
Và trong `profile.actions.ts` thay `getPublicUrl` bằng `createSignedUrl`.

---

## 15. RLS audit deep-dive (manual, optional)

Phase 11 đã sinh script `scripts/audit-rls.sql`. Để chạy review chi tiết:

1. Paste vào Supabase SQL Editor.
2. Đối chiếu output với bảng role matrix trong `docs/plan.md §1.3`.
3. Specific checks:
   - [ ] User Org A không SELECT được EmissionLogs Org B → tạo 2 user 2 org test.
   - [ ] Audit logs UPDATE/DELETE rejected (đã có trigger).
   - [ ] GreenPointLogs UPDATE/DELETE rejected.
   - [ ] Public form submission không leak `org_id` cross-org (insert tự động lấy `form.org_id`).

---

## 16. Git hygiene + onboarding doc

`.env.local` chứa secrets — đã có trong `.gitignore` (verify lại):
```bash
git check-ignore .env.local
# Phải in: .env.local
```

Khi bàn giao team:
- Add `docs/onboarding.md` cho dev mới (clone, `npm install`, set env, `npm run dev`).
- Add CONTRIBUTING.md cho convention.

---

## Summary checklist (tick từng dòng khi xong)

- [ ] **Apply migrations 004-015** (mục 1) — không làm, app sẽ vỡ runtime.
- [ ] **Set production env vars** trên Vercel/host (mục 2).
- [ ] **Verify schema 001-003 đã sẵn** trên Supabase (mục 3).
- [ ] **Configure cron** — Vercel auto, hoặc curl từ external scheduler (mục 4).
- [ ] **Decide payment provider** + tích hợp thật (mục 5).
- [ ] **Define B2C Premium feature gates** (mục 6).
- [ ] **Set ANTHROPIC_API_KEY** nếu muốn OCR thật (mục 7).
- [ ] **Run accessibility audit** (mục 8).
- [ ] **Add E2E smoke tests** với Playwright (mục 9).
- [ ] **Setup Sentry / monitoring** (mục 10).
- [ ] **Domain + SSL + OAuth redirect** (mục 11).
- [ ] **Decide /dashboard/assets**: keep placeholder hay xóa (mục 12).
- [ ] **Switch email transport** khi volume vượt Gmail SMTP (mục 13).
- [ ] **Tighten avatars bucket** nếu cần private (mục 14).
- [ ] **Manual RLS deep-dive** (mục 15).
- [ ] **Onboarding docs** cho team (mục 16).

Khi xong cả 16 dòng, bạn có thể tự tin go-live. Liên hệ nếu cần tôi hỗ trợ tiếp ở bất kỳ bước nào trên.
