# IOE Connect — Architecture Contract

Next.js (App Router, TS, `src/`), Tailwind v4, Supabase (Postgres/Auth/RLS), Telegram bot PDF storage, iLovePDF compression.
Brand: blue (#0B63D6 → logo blue, navy #0A2E7A) + orange (#FF8A00) from the logo at `public/logo.png` (to be added). Dark bg ~#0F172A, cards ~#172033. Premium/minimal, mobile-first.

## Rules for every agent
- Only edit files you own (see ownership). If you need a change elsewhere, note it in your final report.
- Never put secrets, Telegram URLs/IDs, or service-role usage in client code. `import "server-only"` in server modules.
- Authorization is always server-side. Never trust role/premium/payment/file URL from the browser.
- Friendly user-facing errors; log technical errors server-side only.
- Do not fabricate resources/stats. Empty states instead.
- Run `npx tsc --noEmit` on your files before reporting; fix errors you own.

## Env (`.env.example`)
SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
TELEGRAM_BOT_TOKEN, TELEGRAM_STORAGE_CHAT_ID, ILOVEPDF_PUBLIC_KEY, ILOVEPDF_SECRET_KEY, PDF_TOKEN_SECRET, NEXT_PUBLIC_SITE_URL

## Shared modules (exact paths/exports)
- `src/lib/utils.ts` — `cn(...)`, `formatBytes(n)`, `formatDate(d)`.
- `src/lib/supabase/client.ts` — `createBrowserClient()`.
- `src/lib/supabase/server.ts` — `createServerClient()` (cookie-bound, RLS), `createAdminClient()` (service role, server-only).
- `src/lib/supabase/middleware.ts` + `src/middleware.ts` — session refresh; redirect unauth from /dashboard,/profile,/my-*,/referrals,/payment-history,/settings,/admin*.
- `src/lib/types.ts` — DB row types + enums (below).
- `src/lib/auth.ts` — `getSessionUser()`, `getProfile()`, `requireUser()`, `requireAdmin()` (ADMIN|SUPER_ADMIN; throws/redirects), all server-side.
- `src/lib/access.ts` — `canAccessResource(profile|null, resource)`; `isPremiumActive(profile)` (is_premium && expires_at > now).
- `src/lib/audit.ts` — `logAudit({adminId, action, targetType, targetId, metadata})`.
- `src/lib/settings.ts` — `getSetting(key)`, `setSetting(key,value)` over `site_settings(key text pk, value jsonb)`; keys: site, premium, referral, resources, payment, scgpa.
- `src/lib/curriculum.ts` — cached queries: `getPrograms()`, `getProgramTree(slug)`, `getSemester(programSlug, yearNo, semNo)`, `getSubjectBySlug(slug)`.
- `src/lib/pdf-token.ts` — `signPdfToken({resourceId,userId,ttl})`, `verifyPdfToken(token)` (HMAC, short-lived).
- `src/components/ui/*` — Button, Card, Input, Label, Textarea, Select, Badge, Dialog, Skeleton, Tabs, Table, Progress, Switch, Checkbox, DropdownMenu, Sheet, EmptyState, Spinner. `cn` from `@/lib/utils`.

## Tables (snake_case; uuid pk default gen_random_uuid(); created_at/updated_at timestamptz)
- programs(id, slug unique, name, is_active)
- years(id, program_id→programs, number int)
- semesters(id, year_id→years, number int 1..8)
- subjects(id, semester_id→semesters, slug unique, name, is_elective bool, sort_order int, source_links jsonb)
- resources(id, subject_id, title, description, resource_type enum NOTES|PYQ|REFERENCE|LAB|SYLLABUS|OTHER, access_type enum FREE|PREMIUM, telegram_file_id, telegram_message_id, original_file_name, file_size bigint, compressed_file_size bigint, page_count int, available_years int[], year_page_ranges jsonb, exam_type, uploaded_by→profiles, status enum DRAFT|PROCESSING|PUBLISHED|FAILED|ARCHIVED, view_count int)
- profiles(id = auth.users.id, full_name, email, avatar, college, program_id, year, semester, referral_code unique, referred_by, is_premium, premium_started_at, premium_expires_at, role enum USER|ADMIN|SUPER_ADMIN)
- premium_plans(id, name, price numeric, duration_days, description, benefits jsonb, is_active, sort_order)
- payments(id, user_id, plan_id, amount, payment_method, transaction_reference, screenshot_path, status PENDING|APPROVED|REJECTED, reviewed_by, reviewed_at, rejection_reason)
- audit_logs(id, admin_id, action, target_type, target_id, metadata jsonb, created_at)
- referrals(id, referrer_id, referred_id, status PENDING|QUALIFIED|REWARDED, reward_amount, payment_id)
- student_uploads(id, user_id, subject_id, resource_type, title, description, file_path, status PENDING|APPROVED|REJECTED|PUBLISHED, review_note, resource_id)
- resource_requests(id, user_id, subject_id, subject_text, resource_type, years text, message, status PENDING|IN_PROGRESS|COMPLETED|REJECTED, admin_note)
- contact_messages(id, name, email, subject, message, status UNREAD|READ|REPLIED|ARCHIVED)
- bug_reports(id, user_id, title, description, screenshot_path, page_url, device, browser, status OPEN|INVESTIGATING|RESOLVED|CLOSED)
- merch_products(id, name, description, price, stock, images text[], is_available)
- scgpa_grades(grade, points) (also mirrored in site_settings.scgpa) ; scgpa_saves(id, user_id, semester, subjects jsonb, sgpa, total_credits)
- resource_views(id, resource_id, user_id, viewed_at, session_key) — dedupe: one view per user/resource per 30 min.
- search_events(id, user_id, query, created_at)
- Storage buckets (private): `payment-screenshots`, `student-uploads`, `bug-screenshots`, `merch` (public images ok), `site-assets`.
- Postgres functions (SECURITY DEFINER, admin-checked): `approve_payment(payment_id, expiry_override)`, `reject_payment(payment_id, reason)`.

## Routes
Public: `/ /login /register /reset-password /resources /resources/[program] /resources/[program]/[year] /resources/[program]/[year]/[semester] /subject/[subject] /premium /calculator /about /contact`
User: `/dashboard /profile /my-uploads /my-requests /referrals /payment-history /settings /view/[resourceId]` (viewer)
Admin: `/admin /admin/resources /admin/upload /admin/users /admin/payments /admin/merchandise /admin/referrals /admin/requests /admin/student-uploads /admin/messages /admin/bugs /admin/settings`
API: `/api/admin/upload`, `/api/pdf/[resourceId]/token` (POST, authz → signed token), `/api/pdf/stream` (GET ?t=token, Range-capable, `Content-Disposition: inline`, `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`).

## Ownership
- DB/Core: `supabase/**`, `src/lib/{supabase,types,auth,access,audit,settings,curriculum,pdf-token,utils}*`, `src/middleware.ts`, `.env.example`
- Design/UI: `src/app/{layout,globals,page}*`, `src/components/{ui,layout,brand,theme}/**`, `src/app/(auth)/**`, `public/**`
- Seed + Calculator: `supabase/seed.sql`, `src/app/calculator/**`, `src/components/calculator/**`, `src/lib/scgpa.ts`, `src/app/(marketing)/{about,faq}/**`
- PDF pipeline: `src/lib/{telegram,ilovepdf,pdf}*`, `src/app/api/{admin/upload,pdf}/**`, `src/components/pdf/**`, `src/app/view/**`
- Payments/Premium/Referrals: `src/app/{premium,payment-history,referrals}/**`, `src/app/admin/{payments,referrals}/**`, `src/lib/actions/{payments,referrals}.ts`
- Admin shell: `src/app/admin/{layout,page,resources,upload,users,settings}/**`, `src/components/admin/**`
- Student resources: `src/app/{resources,subject,dashboard,profile,settings}/**`, `src/components/resources/**`, `src/app/{sitemap,robots}.ts`
- Community: `src/app/{contact,my-uploads,my-requests}/**`, `src/app/admin/{student-uploads,requests,messages,bugs,merchandise}/**`, `src/app/(shop)/**`, `src/lib/actions/{uploads,requests,contact,bugs,merch}.ts`

## Addendum (from Phase 1 — binding)
- `await createServerClient()` is ASYNC. `createAdminClient()` sync, server-only. `createStaticClient()` for inside `unstable_cache`.
- Never `select('*')` on `resources` from user/anon/admin-cookie clients (Telegram columns are column-privilege hidden). Use `RESOURCE_PUBLIC_COLUMNS` or the `public_resources` view. Only `createAdminClient()` may read `telegram_file_id`/`telegram_message_id` (PDF pipeline only).
- Payment review ONLY via `rpc('approve_payment',{p_payment_id,p_expiry_override})` / `rpc('reject_payment',{p_payment_id,p_reason})` using the admin's cookie client (sets reviewed_by, writes audit). Payment insert trigger forces amount=plan price, status=PENDING.
- Auth helpers: `requireUser(next?)`, `requireAdmin(next?)`, `requireSuperAdmin`, `getProfile()`. `logAudit` never throws; check authz first. `setSetting` already checks admin + audits.
- Settings: `getSetting('premium'|'payment'|'referral'|'resources'|'scgpa'|'site')`; cache tag `settings`. Curriculum cache tag `curriculum`, resources `resources` (use `revalidateTag(tag,{expire:0})`).
- `record_resource_view(p_resource_id,p_session_key)` rpc dedupes views (30 min).
- Storage paths for user buckets must start with `<uid>/`.
- UI kit: `src/components/ui/index.ts` barrel (Button variants primary|accent|secondary|outline|ghost|danger|link, sizes sm|md|lg|icon, `loading`; `buttonVariants()` for Links; Card*, Input/Textarea/Select(native)/Label, Badge variants neutral|primary|accent|success|warning|danger|outline, Dialog{open,onOpenChange,title}, Sheet{side}, Tabs, Table*, Progress, Switch, Checkbox, DropdownMenu*, EmptyState{icon,title,description,action}, Skeleton, Spinner). Tailwind tokens: background foreground card muted muted-foreground border input primary navy accent success warning danger (+ -soft) ring. Wrap public pages in `PublicShell{user}` from `@/components/layout`. Dark mode is class-based.
- Registration sends user metadata: full_name, college, program(slug), year, semester, referral_code.
- No `.env.example` (write blocked by a deny rule); document env vars in your README notes only.
- Do NOT edit files outside your ownership. Do not run `next build` concurrently (shared .next); use `npx tsc --noEmit` only.
