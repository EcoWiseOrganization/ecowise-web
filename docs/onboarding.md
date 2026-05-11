# EcoWise — Dev Onboarding

Welcome! 30-phút setup là chạy được local. File này write cho dev mới join — đọc xong là code được ngay.

## Prerequisites

- Node.js **20+** (recommend 22 LTS)
- npm 10+ (đi kèm Node)
- Git
- Tài khoản Supabase (free tier OK)
- (Optional) Vercel CLI nếu deploy

```bash
node --version   # phải >= 20.0
npm --version    # phải >= 10
```

## 1. Clone + install

```bash
git clone <repo-url> ecowise-web
cd ecowise-web
npm install
```

## 2. Lấy Supabase credentials

Nếu team đã có project Supabase chia sẻ:

1. Hỏi tech lead → `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`
2. Hỏi DB password để dùng cho migration

Nếu chưa có và bạn tự setup:

1. https://supabase.com → New project → đặt tên + password DB → Region: Singapore (cho VN low latency)
2. Lấy creds: Project Settings → API → copy URL + anon key + service_role key

## 3. Tạo `.env.local`

```bash
cp .env.example .env.local 2>/dev/null || touch .env.local
```

Sau đó mở `.env.local` và paste:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Email (Gmail SMTP) — optional, OTP/contact-form sẽ no-op nếu thiếu
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx yyyy zzzz wwww

# Cron (Phase 8) — optional, /api/cron/billing chấp nhận mọi caller nếu thiếu
CRON_SECRET=<random-32-chars-base64url>

# Migration script — Session pooler URL, KHÔNG phải direct host (free tier)
DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres

# OCR (Phase 11) — optional, mock provider khi thiếu
# ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Generate CRON_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### Gmail App Password

Nếu dùng Gmail làm SMTP: cần **App Password** (không phải password Gmail thường):

1. https://myaccount.google.com/security
2. Bật 2-Step Verification (nếu chưa)
3. App passwords → tạo new → đặt name "EcoWise" → copy 16-char password
4. Paste vào `GMAIL_APP_PASSWORD` (giữ nguyên spaces)

## 4. Apply migrations

```bash
npx tsx scripts/apply-migrations.ts
```

Script áp dụng migration `004-016` (idempotent, chạy lại OK). Migration `001-003` (base schema) phải có sẵn — hỏi tech lead nếu DB còn trống.

Verify:
```bash
npx tsx scripts/check-phase-tables.ts
```
Phải thấy 21 row đều "exists" với column count khớp.

## 5. Chạy dev

```bash
npm run dev
```

Mở http://localhost:3000.

## 6. Test smoke

```bash
npm run test:unit
```
Phải pass 161/161 tests (16 file).

```bash
npm run build
```
Phải compile thành công, ~80 routes.

## 7. Workflow

### Branch conventions
- `main` — production
- `develop` — staging
- `feat/<phase>-<feature>` — new features (ví dụ `feat/12-asset-inventory`)
- `fix/<short-desc>` — bug fixes

### Commit message (Conventional)
```
feat: thêm tính năng X
fix: sửa bug Y
docs: update Z
refactor: gộp module W
test: add tests cho V
chore: bump deps
```

### Before pushing
```bash
npm run lint
npm run test:unit
npx tsx scripts/check-i18n-coverage.ts
npm run build
```

Pass cả 4 → push.

## 8. Architecture cheat sheet

### Layer hierarchy
```
Page (server component default)
  ↓
Hook (client island — useState)
  ↓
Server Action ("use server" — requireSession/requireOrgRole guard)
  ↓
Service (server-only — Supabase calls)
  ↓
Supabase Postgres (RLS + audit triggers)
```

### Auth pattern
Mọi server action bắt đầu bằng:
```ts
const ctx = await requireSession();             // chỉ cần login
const ctx = await requireSystemAdmin();         // chỉ System Admin
const ctx = await requireOrgRole(orgId, {       // chỉ Org Admin
  adminOnly: true,
});
```

### Audit log
Mỗi mutation quan trọng → `writeAuditLog({...})`. Entity CRUD đã có DB trigger tự ghi.

### i18n
- Chuỗi user-facing → `t("key")` hoặc `<T k="key" />`
- Add key vào CẢ `src/i18n/locales/en.ts` + `vi.ts`
- Run `npx tsx scripts/check-i18n-coverage.ts` để verify

## 9. Where things live

| Việc | File / Folder |
|---|---|
| Tạo route mới | `src/app/(dashboard)/(individual)/dashboard/<route>/page.tsx` |
| Server action | `src/app/actions/<feature>.actions.ts` |
| DB query layer | `src/services/<feature>.service.ts` |
| Pure helper | `src/lib/<feature>.ts` |
| Reusable UI | `src/components/<group>/<Component>.tsx` |
| DB migration | `supabase/migrations/NNN_<desc>.sql` |
| Translation | `src/i18n/locales/{en,vi}.ts` |
| Test | `tests/unit/<thing>.test.ts` |

## 10. Common pitfalls

- ❌ Không bao giờ `console.log(SUPABASE_SERVICE_ROLE_KEY)` hay log JWT.
- ❌ Không import `"server-only"` modules vào client component (sẽ error build).
- ❌ Không `setState` trong `useEffect` không có guard (React 19 strict rule).
- ❌ Không `new Date()` trong render body — dùng `useState(() => new Date())` (purity rule).
- ❌ Không apply migration vào production DB không backup trước.
- ✅ Server actions phải có `requireSession()` (or stricter) trước business logic.
- ✅ Mọi route org-scoped phải verify membership.
- ✅ Mutation quan trọng → audit log entry.

## 11. Useful scripts

```bash
npx tsx scripts/apply-migrations.ts          # Apply migration 004-016
npx tsx scripts/check-phase-tables.ts        # Check DB schema
npx tsx scripts/check-i18n-coverage.ts       # Missing translation keys
npx tsx scripts/run-rls-audit.ts             # RLS policy summary
npx tsx scripts/debug-db-url.ts              # Inspect DATABASE_URL parsing
npm run test:unit                             # Vitest unit
npm run test:integration                      # Vitest integration (needs DB)
npm run lint                                  # ESLint
npm run build                                 # Production build
```

## 12. Stuck?

- Read `docs/codebase-summary.md` — comprehensive snapshot of current state.
- Read `docs/system-architecture.md` — diagrams + request flow examples.
- Read `docs/plan.md` — full development history phase 0-11.
- Read `docs/PENDING.md` — production setup checklist (16 items).

Welcome to the team 🌱
