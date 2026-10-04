# Supabase: IOE Connect database

## Migrations (apply in order)

| File | Contents |
| --- | --- |
| `20261003000001_schema.sql` | extensions (pg_trgm, pgcrypto), enums, tables, indexes, `updated_at` triggers, signup trigger (profile + `IOE-XXXXX` referral code + `referred_by`), profile and payment guard triggers, `is_admin()` / `is_super_admin()` |
| `20261003000002_rls.sql` | RLS on every table, column privileges hiding `telegram_file_id` / `telegram_message_id`, `public_resources` view |
| `20261003000003_functions.sql` | `approve_payment`, `reject_payment`, `search_catalog`, `record_resource_view`, `expire_premium` |
| `20261003000004_storage.sql` | private buckets (`payment-screenshots`, `student-uploads`, `bug-screenshots`, `site-assets`), public `merch`, storage policies |
| `20261003000005_default_settings.sql` | default `site_settings` (site, premium, referral, resources, payment, scgpa), `scgpa_grades` mirror, 5 placeholder premium plans |

Every migration is idempotent, so it is safe to re-run.

### Option A: Supabase CLI (recommended)

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push            # applies supabase/migrations/*
# optional curriculum seed (owned by the seed task):
psql "$DATABASE_URL" -f supabase/seed.sql
```

For local development, `npx supabase start` followed by `npx supabase db reset` applies the migrations and then `seed.sql`.

### Option B: SQL editor

Paste each file into Dashboard → SQL Editor in the order above and run it.
If the storage file fails with `must be owner of table objects`, create the buckets and policies from Dashboard → Storage instead, using the same names and rules.

## After applying

1. Sign up through the app, then make yourself super admin:
   ```sql
   update public.profiles set role = 'SUPER_ADMIN' where email = 'you@example.com';
   ```
   Run this in the SQL editor. The guard trigger blocks role changes made through the API.
2. Edit plan prices in `premium_plans` and the payment details in `site_settings.payment`. Both can be changed from `/admin/settings`.
3. Optional: schedule `select public.expire_premium();` daily with pg_cron. Access checks already compare `premium_expires_at`, so this only tidies up the flag.

## Rules for app code

- **Resources:** anon and authenticated clients cannot read `telegram_file_id` or `telegram_message_id`. `select('*')` on `resources` therefore fails for them. Select explicit columns (`RESOURCE_PUBLIC_COLUMNS` in `src/lib/types.ts`) or query the `public_resources` view. Only `createAdminClient()` (service role) can read the Telegram columns.
- **Payments:** users insert their own payment rows. The trigger forces `amount` to the plan price and `status` to `PENDING`. Review happens only through `rpc('approve_payment', { p_payment_id, p_expiry_override })` and `rpc('reject_payment', { p_payment_id, p_reason })`, called with the admin's cookie client so `reviewed_by` is recorded.
- **Profiles:** users can update `full_name`, `avatar`, `college`, `program_id`, `year` and `semester`. Only admins can change the premium fields, and only a super admin can change `role`. `referral_code`, `referred_by` and `email` cannot be changed through the API.
- **Signup:** pass `options.data = { full_name, referral_code }` to `supabase.auth.signUp`. The trigger resolves the referral code into `referred_by` and creates a `PENDING` referral. When the referred user's first payment is approved, the referrer is rewarded with `site_settings.referral.reward_days`.
- **Views:** call `rpc('record_resource_view', { p_resource_id, p_session_key })`. It counts at most one view per user (or per session key for anonymous viewers) per 30 minutes.
- **Search:** call `rpc('search_catalog', { q, max_results })`. It returns subjects and published resources ranked by trigram similarity.
- **Storage paths** for user buckets must start with `<user id>/`.
