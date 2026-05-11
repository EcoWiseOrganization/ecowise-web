# Contributing to EcoWise

## Quick rules

1. **Branch naming**: `feat/...`, `fix/...`, `docs/...`, `refactor/...`, `test/...`, `chore/...`.
2. **Commit message**: Conventional Commits.
   ```
   feat: thêm carbon target progress chart
   fix: sửa BR-26 không block last admin demote
   docs: update PENDING.md
   ```
3. **No direct push to `main`** — luôn qua PR.
4. **PR must pass**: `npm run lint && npm run test:unit && npm run build`.

## Code style

- TypeScript strict mode (already on).
- React 19 strict rules:
  - No `setState` inside `useEffect` body — extract to handler or use lazy init.
  - No `new Date()` / `Date.now()` / `Math.random()` in render body — wrap in `useState(() => ...)`.
- Server actions/services use `"use server"` or `"server-only"` directive.
- Tailwind utility-first; create reusable component if same combo repeats 3+ times.

## Server action checklist

Mỗi server action mới phải:

```ts
"use server";
import { requireSession, AuthError } from "@/lib/auth/roles";
import { writeAuditLog } from "@/services/audit.service";

export async function myAction(input: Input): Promise<Result> {
  try {
    const ctx = await requireSession();         // hoặc stricter guard
    // ... business logic via service-only files ...
    await writeAuditLog({                       // for mutations
      action: "...",
      resourceType: "...",
      resourceId: ...,
      actorUserId: ctx.userId,
    });
    revalidatePath("/...");
    return { data, error: null };
  } catch (err) {
    if (err instanceof AuthError) return { data: null, error: err.code };
    return { data: null, error: err instanceof Error ? err.message : "unknown" };
  }
}
```

## Migration checklist

New migration `NNN_descriptive.sql`:
- [ ] Idempotent (`IF NOT EXISTS`, `IF EXISTS`, `DO $$ BEGIN ... EXCEPTION ... END $$`).
- [ ] RLS enabled + policies cho mọi bảng có user-facing read.
- [ ] Audit trigger nếu mutations cần track.
- [ ] Add file vào `scripts/apply-migrations.ts` files[].
- [ ] Run `npx tsx scripts/apply-migrations.ts` để verify trên dev DB.
- [ ] Update `docs/codebase-summary.md` Migrations table.

## i18n checklist

Mỗi UI string mới:
- [ ] Add key vào `src/i18n/locales/en.ts` AND `src/i18n/locales/vi.ts`.
- [ ] Use `t("key")` trong client component, `<T k="key" />` từ `@/components/shared/TranslatedText` trong server component.
- [ ] Run `npx tsx scripts/check-i18n-coverage.ts` — must pass.

## Test checklist

- [ ] Pure helpers (`src/lib/*.ts` không có "server-only") MUST have unit test.
- [ ] Service / action tests dùng vitest mock supabase client.
- [ ] Goal: > 80% statement coverage trên `src/lib`.

## Phase numbering

Mọi feature mới thuộc một "Phase" — đánh số tiếp theo (current 11). Update `docs/plan.md` add Phase NN với scope + deliverables + acceptance criteria.

## Reviewer checklist (PR template)

```
## Changes
- [ ] Migration added (NNN_*.sql)? Idempotent?
- [ ] Server action có requireSession guard?
- [ ] Audit log writes cho mutations?
- [ ] i18n keys EN + VI?
- [ ] Tests viết cho logic mới?
- [ ] `npm run lint` pass?
- [ ] `npm run test:unit` pass?
- [ ] `npm run build` pass?
- [ ] Docs updated nếu có architectural impact?

## Screenshots
(if UI)
```
