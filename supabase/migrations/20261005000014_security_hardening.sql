-- =============================================================================
-- IOE Connect :: 0014 security hardening
--   1. rate_limits + rate_limit_hit(): a shared (database-backed) rate limiter. The in-memory limiter
--      only counts inside one serverless instance, so on Vercel it barely limits anything.
--      Callable by the service role only.
--   2. CHECK constraints so direct PostgREST calls (the anon key is public) cannot bypass the
--      validation done in the server actions: payment fields, screenshot ownership, text lengths,
--      saved-marks size. Added NOT VALID: they apply to every new/changed row without failing on
--      old rows. (Run VALIDATE CONSTRAINT later once existing data is known to comply.)
-- Idempotent.
-- =============================================================================

-- ---- 1. shared rate limiter ----------------------------------------------------
create table if not exists public.rate_limits (
  key          text primary key check (char_length(key) <= 300),
  window_start timestamptz not null default now(),
  count        integer not null default 0
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Fixed-window counter, atomic under concurrency. Returns true while the caller is within the limit.
create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_key is null or p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  insert into public.rate_limits as r (key, window_start, count)
  values (left(p_key, 300), now(), 1)
  on conflict (key) do update
    set count = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.count + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning r.count into v_count;

  -- Opportunistic cleanup so the table does not grow forever.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;

-- ---- 2. payments: values a direct insert could otherwise choose freely --------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_method_format') then
    alter table public.payments
      add constraint payments_method_format check (payment_method ~ '^[a-z0-9_-]{1,32}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'payments_reference_len') then
    alter table public.payments
      add constraint payments_reference_len
      check (transaction_reference is null or char_length(transaction_reference) between 1 and 100) not valid;
  end if;
  -- A screenshot must live in the payer's own folder: <user_id>/<file>
  if not exists (select 1 from pg_constraint where conname = 'payments_screenshot_owner') then
    alter table public.payments
      add constraint payments_screenshot_owner
      check (screenshot_path is null or screenshot_path like user_id::text || '/%') not valid;
  end if;
end $$;

-- ---- 3. other user-writable text: lengths -------------------------------------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bug_reports_meta_len') then
    alter table public.bug_reports
      add constraint bug_reports_meta_len check (
        coalesce(char_length(page_url), 0) <= 500
        and coalesce(char_length(device), 0) <= 200
        and coalesce(char_length(browser), 0) <= 200
        and coalesce(char_length(screenshot_path), 0) <= 300
      ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'resource_requests_len') then
    alter table public.resource_requests
      add constraint resource_requests_len check (
        coalesce(char_length(subject_text), 0) <= 200
        and coalesce(char_length(years), 0) <= 100
        and coalesce(char_length(message), 0) <= 1500
      ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'student_uploads_len') then
    alter table public.student_uploads
      add constraint student_uploads_len check (
        char_length(title) <= 200
        and coalesce(char_length(description), 0) <= 1000
        and char_length(file_path) <= 300
      ) not valid;
  end if;
  -- An uploaded file must live in the uploader's own folder: <user_id>/<file>
  if not exists (select 1 from pg_constraint where conname = 'student_uploads_file_owner') then
    alter table public.student_uploads
      add constraint student_uploads_file_owner check (file_path like user_id::text || '/%') not valid;
  end if;
  -- Saved marks are a small list; stop a user storing megabytes of JSON.
  if not exists (select 1 from pg_constraint where conname = 'scgpa_saves_size') then
    alter table public.scgpa_saves
      add constraint scgpa_saves_size check (jsonb_array_length(subjects) <= 40 and pg_column_size(subjects) <= 20000) not valid;
  end if;
end $$;
