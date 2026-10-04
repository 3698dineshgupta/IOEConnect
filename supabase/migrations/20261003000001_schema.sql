-- =============================================================================
-- IOE Connect :: 0001 schema
-- Extensions, enums, tables, constraints, indexes, updated_at triggers,
-- auth.users -> profiles trigger.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('USER', 'ADMIN', 'SUPER_ADMIN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.resource_type as enum ('NOTES', 'PYQ', 'REFERENCE', 'LAB', 'SYLLABUS', 'OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.access_type as enum ('FREE', 'PREMIUM');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.resource_status as enum ('DRAFT', 'PROCESSING', 'PUBLISHED', 'FAILED', 'ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('PENDING', 'APPROVED', 'REJECTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.referral_status as enum ('PENDING', 'QUALIFIED', 'REWARDED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.student_upload_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.request_status as enum ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contact_status as enum ('UNREAD', 'READ', 'REPLIED', 'ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bug_status as enum ('OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Generic updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Curriculum
-- -----------------------------------------------------------------------------
create table if not exists public.programs (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null,
  short_name  text,
  description text,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.years (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references public.programs(id) on delete cascade,
  number      int not null check (number between 1 and 6),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (program_id, number)
);

create table if not exists public.semesters (
  id          uuid primary key default gen_random_uuid(),
  year_id     uuid not null references public.years(id) on delete cascade,
  number      int not null check (number between 1 and 8),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (year_id, number)
);

create table if not exists public.subjects (
  id           uuid primary key default gen_random_uuid(),
  semester_id  uuid not null references public.semesters(id) on delete cascade,
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name         text not null,
  code         text,
  credits      numeric(4,1),
  description  text,
  is_elective  boolean not null default false,
  sort_order   int not null default 0,
  source_links jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text,
  email              text,
  avatar             text,
  college            text,
  program_id         uuid references public.programs(id) on delete set null,
  year               int check (year is null or year between 1 and 6),
  semester           int check (semester is null or semester between 1 and 8),
  referral_code      text not null unique,
  referred_by        uuid references public.profiles(id) on delete set null,
  is_premium         boolean not null default false,
  premium_started_at timestamptz,
  premium_expires_at timestamptz,
  role               public.user_role not null default 'USER',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (referred_by is null or referred_by <> id)
);

-- -----------------------------------------------------------------------------
-- Resources
-- -----------------------------------------------------------------------------
create table if not exists public.resources (
  id                   uuid primary key default gen_random_uuid(),
  subject_id           uuid not null references public.subjects(id) on delete cascade,
  title                text not null,
  description          text,
  resource_type        public.resource_type not null default 'NOTES',
  access_type          public.access_type not null default 'FREE',
  telegram_file_id     text,
  telegram_message_id  bigint,
  original_file_name   text,
  file_size            bigint,
  compressed_file_size bigint,
  page_count           int,
  available_years      int[] not null default '{}',
  year_page_ranges     jsonb not null default '{}'::jsonb,
  exam_type            text,
  uploaded_by          uuid references public.profiles(id) on delete set null,
  status               public.resource_status not null default 'DRAFT',
  view_count           int not null default 0,
  published_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Premium / payments / referrals
-- -----------------------------------------------------------------------------
create table if not exists public.premium_plans (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  price         numeric(10,2) not null check (price >= 0),
  duration_days int not null check (duration_days > 0),
  description   text,
  benefits      jsonb not null default '[]'::jsonb,
  is_active     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.payments (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  plan_id               uuid not null references public.premium_plans(id) on delete restrict,
  amount                numeric(10,2) not null check (amount >= 0),
  payment_method        text not null,
  transaction_reference text,
  screenshot_path       text,
  status                public.payment_status not null default 'PENDING',
  reviewed_by           uuid references public.profiles(id) on delete set null,
  reviewed_at           timestamptz,
  rejection_reason      text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.referrals (
  id            uuid primary key default gen_random_uuid(),
  referrer_id   uuid not null references public.profiles(id) on delete cascade,
  referred_id   uuid not null unique references public.profiles(id) on delete cascade,
  status        public.referral_status not null default 'PENDING',
  reward_amount numeric(10,2) not null default 0,
  payment_id    uuid references public.payments(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (referrer_id <> referred_id)
);

-- -----------------------------------------------------------------------------
-- Audit log (append-only)
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target_type text,
  target_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Community
-- -----------------------------------------------------------------------------
create table if not exists public.student_uploads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  subject_id    uuid references public.subjects(id) on delete set null,
  resource_type public.resource_type not null default 'NOTES',
  title         text not null,
  description   text,
  file_path     text not null,
  status        public.student_upload_status not null default 'PENDING',
  review_note   text,
  resource_id   uuid references public.resources(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.resource_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  subject_id    uuid references public.subjects(id) on delete set null,
  subject_text  text,
  resource_type public.resource_type,
  years         text,
  message       text,
  status        public.request_status not null default 'PENDING',
  admin_note    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (subject_id is not null or coalesce(btrim(subject_text), '') <> '')
);

create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  name       text not null check (char_length(name) <= 200),
  email      text not null check (char_length(email) <= 320),
  subject    text check (subject is null or char_length(subject) <= 300),
  message    text not null check (char_length(message) <= 5000),
  status     public.contact_status not null default 'UNREAD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bug_reports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete set null,
  title           text not null check (char_length(title) <= 300),
  description     text not null check (char_length(description) <= 10000),
  screenshot_path text,
  page_url        text,
  device          text,
  browser         text,
  status          public.bug_status not null default 'OPEN',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.merch_products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  price        numeric(10,2) not null check (price >= 0),
  stock        int not null default 0 check (stock >= 0),
  images       text[] not null default '{}',
  is_available boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- SCGPA
-- -----------------------------------------------------------------------------
create table if not exists public.scgpa_grades (
  grade      text primary key,
  points     numeric(3,2) not null check (points between 0 and 4),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scgpa_saves (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  semester      int check (semester is null or semester between 1 and 8),
  subjects      jsonb not null default '[]'::jsonb,
  sgpa          numeric(4,2) check (sgpa is null or sgpa between 0 and 4),
  total_credits numeric(6,1),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Analytics
-- -----------------------------------------------------------------------------
create table if not exists public.resource_views (
  id          uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  viewed_at   timestamptz not null default now(),
  session_key text
);

create table if not exists public.search_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  query      text not null check (char_length(query) <= 200),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Settings
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
  key        text primary key check (key in ('site', 'premium', 'referral', 'resources', 'payment', 'scgpa')),
  value      jsonb not null default '{}'::jsonb,
  is_public  boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index if not exists programs_active_idx        on public.programs (is_active, sort_order);
create index if not exists years_program_idx          on public.years (program_id);
create index if not exists semesters_year_idx         on public.semesters (year_id);
create index if not exists subjects_semester_idx      on public.subjects (semester_id, sort_order);
create index if not exists subjects_name_trgm_idx     on public.subjects using gin (name extensions.gin_trgm_ops);
create index if not exists subjects_code_trgm_idx     on public.subjects using gin (code extensions.gin_trgm_ops);

create index if not exists resources_subject_idx      on public.resources (subject_id);
create index if not exists resources_status_idx       on public.resources (status);
create index if not exists resources_subject_status_idx on public.resources (subject_id, status, resource_type);
create index if not exists resources_created_idx      on public.resources (created_at desc);
create index if not exists resources_uploaded_by_idx  on public.resources (uploaded_by);
create index if not exists resources_title_trgm_idx   on public.resources using gin (title extensions.gin_trgm_ops);
create index if not exists resources_desc_trgm_idx    on public.resources using gin (description extensions.gin_trgm_ops);

create index if not exists profiles_role_idx          on public.profiles (role) where role <> 'USER';
create index if not exists profiles_referred_by_idx   on public.profiles (referred_by);
create index if not exists profiles_program_idx       on public.profiles (program_id);
create index if not exists profiles_created_idx       on public.profiles (created_at desc);
create index if not exists profiles_email_trgm_idx    on public.profiles using gin (email extensions.gin_trgm_ops);
create index if not exists profiles_name_trgm_idx     on public.profiles using gin (full_name extensions.gin_trgm_ops);

create index if not exists premium_plans_active_idx   on public.premium_plans (is_active, sort_order);

create index if not exists payments_user_idx          on public.payments (user_id, created_at desc);
create index if not exists payments_status_idx        on public.payments (status, created_at desc);
create index if not exists payments_plan_idx          on public.payments (plan_id);
create unique index if not exists payments_txn_ref_uidx
  on public.payments (payment_method, lower(transaction_reference))
  where transaction_reference is not null and status <> 'REJECTED';

create index if not exists referrals_referrer_idx     on public.referrals (referrer_id, created_at desc);
create index if not exists referrals_status_idx       on public.referrals (status);

create index if not exists audit_logs_admin_idx       on public.audit_logs (admin_id, created_at desc);
create index if not exists audit_logs_created_idx     on public.audit_logs (created_at desc);
create index if not exists audit_logs_target_idx      on public.audit_logs (target_type, target_id);

create index if not exists student_uploads_user_idx   on public.student_uploads (user_id, created_at desc);
create index if not exists student_uploads_status_idx on public.student_uploads (status, created_at desc);
create index if not exists student_uploads_subject_idx on public.student_uploads (subject_id);

create index if not exists resource_requests_user_idx on public.resource_requests (user_id, created_at desc);
create index if not exists resource_requests_status_idx on public.resource_requests (status, created_at desc);
create index if not exists resource_requests_subject_idx on public.resource_requests (subject_id);

create index if not exists contact_messages_status_idx on public.contact_messages (status, created_at desc);
create index if not exists bug_reports_status_idx     on public.bug_reports (status, created_at desc);
create index if not exists bug_reports_user_idx       on public.bug_reports (user_id);
create index if not exists merch_available_idx        on public.merch_products (is_available, created_at desc);
create index if not exists scgpa_saves_user_idx       on public.scgpa_saves (user_id, created_at desc);

create index if not exists resource_views_dedupe_user_idx on public.resource_views (resource_id, user_id, viewed_at desc);
create index if not exists resource_views_dedupe_sess_idx on public.resource_views (resource_id, session_key, viewed_at desc);
create index if not exists resource_views_viewed_idx  on public.resource_views (viewed_at desc);
create index if not exists resource_views_user_idx    on public.resource_views (user_id);
create index if not exists search_events_created_idx  on public.search_events (created_at desc);
create index if not exists search_events_user_idx     on public.search_events (user_id);

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'programs','years','semesters','subjects','profiles','resources','premium_plans',
    'payments','referrals','student_uploads','resource_requests','contact_messages',
    'bug_reports','merch_products','scgpa_grades','scgpa_saves','site_settings'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- resources.published_at bookkeeping
create or replace function public.resources_set_published_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'PUBLISHED' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists resources_set_published_at on public.resources;
create trigger resources_set_published_at
  before insert or update of status on public.resources
  for each row execute function public.resources_set_published_at();

-- -----------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so they bypass RLS and avoid recursion)
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('ADMIN', 'SUPER_ADMIN')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'SUPER_ADMIN'
  );
$$;

-- -----------------------------------------------------------------------------
-- Referral code generator: IOE-XXXXX (no ambiguous chars 0/O/1/I/L)
-- -----------------------------------------------------------------------------
create or replace function public.generate_referral_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
  attempts int := 0;
begin
  loop
    candidate := 'IOE-';
    for i in 1..5 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = candidate);
    attempts := attempts + 1;
    if attempts > 50 then
      -- fall back to a longer code; practically unreachable
      candidate := 'IOE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      exit;
    end if;
  end loop;
  return candidate;
end;
$$;

-- -----------------------------------------------------------------------------
-- auth.users insert -> profiles row (+ referral row)
-- raw_user_meta_data keys honoured: full_name | name, avatar_url | picture,
-- college, program (slug -> programs.id lookup), year, semester,
-- referral_code | referred_by (a referral code like IOE-ABCDE)
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  ref_code text;
  referrer uuid;
  program_id uuid;
  program_slug text;
  user_year int;
  user_semester int;
begin
  ref_code := upper(btrim(coalesce(meta->>'referral_code', meta->>'referred_by', '')));
  if ref_code <> '' then
    select id into referrer from public.profiles where referral_code = ref_code;
  end if;

  -- Lookup program by slug if provided
  program_slug := nullif(btrim(coalesce(meta->>'program', '')), '');
  if program_slug is not null then
    select id into program_id from public.programs where slug = program_slug;
  end if;

  -- Parse year and semester if provided
  user_year := nullif((meta->>'year')::int, 0);
  user_semester := nullif((meta->>'semester')::int, 0);

  insert into public.profiles (
    id, email, full_name, avatar, college, program_id, year, semester,
    referral_code, referred_by
  )
  values (
    new.id,
    new.email,
    nullif(btrim(coalesce(meta->>'full_name', meta->>'name', '')), ''),
    nullif(coalesce(meta->>'avatar_url', meta->>'picture', ''), ''),
    nullif(btrim(coalesce(meta->>'college', '')), ''),
    program_id,
    case when user_year between 1 and 6 then user_year end,
    case when user_semester between 1 and 8 then user_semester end,
    public.generate_referral_code(),
    case when referrer is not null and referrer <> new.id then referrer end
  )
  on conflict (id) do nothing;

  if referrer is not null and referrer <> new.id then
    insert into public.referrals (referrer_id, referred_id)
    values (referrer, new.id)
    on conflict (referred_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- keep profiles.email in sync with auth.users.email
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- Guard: privileged profile columns cannot be changed by end users.
-- Applies only to API roles (anon/authenticated). SECURITY DEFINER functions
-- and the service role run as a different current_user and pass through.
-- -----------------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.referral_code is distinct from old.referral_code
     or new.referred_by is distinct from old.referred_by
     or new.email is distinct from old.email
     or new.created_at is distinct from old.created_at then
    raise exception 'Not allowed to modify protected profile fields'
      using errcode = '42501';
  end if;

  if new.role is distinct from old.role and not public.is_super_admin() then
    raise exception 'Only a super admin can change roles' using errcode = '42501';
  end if;

  if (new.is_premium is distinct from old.is_premium
      or new.premium_started_at is distinct from old.premium_started_at
      or new.premium_expires_at is distinct from old.premium_expires_at)
     and not public.is_admin() then
    raise exception 'Not allowed to modify premium fields' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- Payments: force server-trusted values on insert by end users.
-- (Intentionally NOT security definer: current_user must reflect the API role.)
create or replace function public.payments_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  plan_price numeric;
begin
  if current_user in ('anon', 'authenticated') then
    select price into plan_price
    from public.premium_plans
    where id = new.plan_id and is_active;

    if plan_price is null then
      raise exception 'Selected plan is not available' using errcode = '22023';
    end if;

    new.amount := plan_price;
    new.status := 'PENDING';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_before_insert on public.payments;
create trigger payments_before_insert
  before insert on public.payments
  for each row execute function public.payments_before_insert();
