-- =============================================================================
-- IOE Connect :: 0003 RPC functions
--   approve_payment(payment_id, expiry_override)
--   reject_payment(payment_id, reason)
--   search_catalog(q, max_results)
--   record_resource_view(resource_id, session_key)
-- =============================================================================

-- Internal: is the caller allowed to run admin RPCs?
-- (an ADMIN/SUPER_ADMIN session, or the service role from trusted server code)
create or replace function public._rpc_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or coalesce(auth.role(), '') = 'service_role';
$$;
revoke execute on function public._rpc_is_admin() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- approve_payment
--   * admin check inside
--   * premium_started_at / premium_expires_at from plan.duration_days
--   * extends from current expiry if premium is still active
--   * p_expiry_override (optional) sets an explicit expiry instead
--   * activates referral reward (per site_settings.referral)
--   * writes audit log
-- Returns jsonb summary.
-- -----------------------------------------------------------------------------
create or replace function public.approve_payment(
  p_payment_id uuid,
  p_expiry_override timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin    uuid := auth.uid();
  v_payment  public.payments%rowtype;
  v_plan     public.premium_plans%rowtype;
  v_profile  public.profiles%rowtype;
  v_active   boolean;
  v_started  timestamptz;
  v_expires  timestamptz;
  v_ref      public.referrals%rowtype;
  v_ref_cfg  jsonb;
  v_reward_days int;
  v_reward_amount numeric;
  v_referrer public.profiles%rowtype;
  v_ref_expires timestamptz;
  v_ref_result text := 'none';
begin
  if not public._rpc_is_admin() then
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;
  if v_payment.status <> 'PENDING' then
    raise exception 'Payment already %', lower(v_payment.status::text) using errcode = '22023';
  end if;

  select * into v_plan from public.premium_plans where id = v_payment.plan_id;
  if not found then
    raise exception 'Plan not found' using errcode = 'P0002';
  end if;

  select * into v_profile from public.profiles where id = v_payment.user_id for update;
  if not found then
    raise exception 'User profile not found' using errcode = 'P0002';
  end if;

  v_active := v_profile.is_premium
              and v_profile.premium_expires_at is not null
              and v_profile.premium_expires_at > now();

  v_started := case when v_active then coalesce(v_profile.premium_started_at, now()) else now() end;

  if p_expiry_override is not null then
    if p_expiry_override <= now() then
      raise exception 'Expiry override must be in the future' using errcode = '22023';
    end if;
    v_expires := p_expiry_override;
  else
    v_expires := (case when v_active then v_profile.premium_expires_at else now() end)
                 + make_interval(days => v_plan.duration_days);
  end if;

  update public.profiles
     set is_premium = true,
         premium_started_at = v_started,
         premium_expires_at = v_expires
   where id = v_profile.id;

  update public.payments
     set status = 'APPROVED',
         reviewed_by = v_admin,
         reviewed_at = now(),
         rejection_reason = null
   where id = v_payment.id;

  -- ---- referral reward ------------------------------------------------------
  select value into v_ref_cfg from public.site_settings where key = 'referral';
  v_ref_cfg := coalesce(v_ref_cfg, '{}'::jsonb);

  if coalesce((v_ref_cfg->>'enabled')::boolean, true) then
    select * into v_ref from public.referrals
     where referred_id = v_profile.id and status = 'PENDING'
     for update;

    if found then
      v_reward_days   := greatest(coalesce((v_ref_cfg->>'reward_days')::int, 0), 0);
      v_reward_amount := greatest(coalesce((v_ref_cfg->>'reward_amount')::numeric, 0), 0);

      if v_reward_days > 0 then
        select * into v_referrer from public.profiles where id = v_ref.referrer_id for update;
        if found then
          v_ref_expires :=
            (case when v_referrer.is_premium and v_referrer.premium_expires_at > now()
                  then v_referrer.premium_expires_at else now() end)
            + make_interval(days => v_reward_days);

          update public.profiles
             set is_premium = true,
                 premium_started_at = case
                   when v_referrer.is_premium and v_referrer.premium_expires_at > now()
                     then coalesce(v_referrer.premium_started_at, now())
                   else now() end,
                 premium_expires_at = v_ref_expires
           where id = v_referrer.id;
        end if;

        update public.referrals
           set status = 'REWARDED', reward_amount = v_reward_amount, payment_id = v_payment.id
         where id = v_ref.id;
        v_ref_result := 'rewarded';
      else
        -- no automatic premium reward configured: mark qualified for manual payout
        update public.referrals
           set status = 'QUALIFIED', reward_amount = v_reward_amount, payment_id = v_payment.id
         where id = v_ref.id;
        v_ref_result := 'qualified';
      end if;

      insert into public.audit_logs (admin_id, action, target_type, target_id, metadata)
      values (v_admin, 'referral.' || v_ref_result, 'referral', v_ref.id::text,
              jsonb_build_object(
                'referrer_id', v_ref.referrer_id,
                'referred_id', v_ref.referred_id,
                'payment_id', v_payment.id,
                'reward_days', v_reward_days,
                'reward_amount', v_reward_amount,
                'referrer_new_expiry', v_ref_expires));
    end if;
  end if;

  insert into public.audit_logs (admin_id, action, target_type, target_id, metadata)
  values (v_admin, 'payment.approve', 'payment', v_payment.id::text,
          jsonb_build_object(
            'user_id', v_profile.id,
            'plan_id', v_plan.id,
            'plan_name', v_plan.name,
            'amount', v_payment.amount,
            'duration_days', v_plan.duration_days,
            'expiry_override', p_expiry_override,
            'was_active', v_active,
            'previous_expires_at', v_profile.premium_expires_at,
            'premium_started_at', v_started,
            'premium_expires_at', v_expires,
            'referral', v_ref_result));

  return jsonb_build_object(
    'payment_id', v_payment.id,
    'user_id', v_profile.id,
    'status', 'APPROVED',
    'premium_started_at', v_started,
    'premium_expires_at', v_expires,
    'extended', v_active,
    'referral', v_ref_result);
end;
$$;

-- -----------------------------------------------------------------------------
-- reject_payment
-- -----------------------------------------------------------------------------
create or replace function public.reject_payment(
  p_payment_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin   uuid := auth.uid();
  v_payment public.payments%rowtype;
  v_reason  text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public._rpc_is_admin() then
    raise exception 'Forbidden: admin only' using errcode = '42501';
  end if;
  if v_reason is null then
    raise exception 'A rejection reason is required' using errcode = '22023';
  end if;

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;
  if v_payment.status <> 'PENDING' then
    raise exception 'Payment already %', lower(v_payment.status::text) using errcode = '22023';
  end if;

  update public.payments
     set status = 'REJECTED',
         reviewed_by = v_admin,
         reviewed_at = now(),
         rejection_reason = left(v_reason, 1000)
   where id = v_payment.id;

  insert into public.audit_logs (admin_id, action, target_type, target_id, metadata)
  values (v_admin, 'payment.reject', 'payment', v_payment.id::text,
          jsonb_build_object(
            'user_id', v_payment.user_id,
            'plan_id', v_payment.plan_id,
            'amount', v_payment.amount,
            'reason', left(v_reason, 1000)));

  return jsonb_build_object('payment_id', v_payment.id, 'status', 'REJECTED');
end;
$$;

revoke execute on function public.approve_payment(uuid, timestamptz) from public, anon;
revoke execute on function public.reject_payment(uuid, text) from public, anon;
grant execute on function public.approve_payment(uuid, timestamptz) to authenticated, service_role;
grant execute on function public.reject_payment(uuid, text) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- search_catalog: trigram search over subjects + PUBLISHED resources.
-- SECURITY INVOKER: caller RLS + column privileges apply (never touches
-- telegram columns).
-- -----------------------------------------------------------------------------
create or replace function public.search_catalog(
  q text,
  max_results int default 20
)
returns table (
  kind          text,          -- 'subject' | 'resource'
  id            uuid,
  title         text,
  subtitle      text,
  subject_id    uuid,
  subject_slug  text,
  subject_name  text,
  program_slug  text,
  year_number   int,
  semester_number int,
  resource_type public.resource_type,
  access_type   public.access_type,
  score         real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select left(btrim(coalesce(q, '')), 100) as term,
           '%' || replace(replace(replace(left(btrim(coalesce(q, '')), 100),
                  '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat,
           least(greatest(coalesce(max_results, 20), 1), 50) as lim
  ),
  subj as (
    select
      'subject'::text as kind,
      s.id,
      s.name as title,
      coalesce(s.code, p.name) as subtitle,
      s.id as subject_id,
      s.slug as subject_slug,
      s.name as subject_name,
      p.slug as program_slug,
      y.number as year_number,
      se.number as semester_number,
      null::public.resource_type as resource_type,
      null::public.access_type as access_type,
      greatest(
        extensions.word_similarity((select term from params), s.name),
        extensions.similarity(coalesce(s.code, ''), (select term from params))
      ) + case when s.name ilike (select term from params) || '%' then 0.5 else 0 end
        + case when s.code ilike (select term from params) then 1.0 else 0 end
        as score
    from public.subjects s
    join public.semesters se on se.id = s.semester_id
    join public.years y on y.id = se.year_id
    join public.programs p on p.id = y.program_id and p.is_active
    where char_length((select term from params)) >= 2
      and (
        s.name ilike (select pat from params)
        or s.code ilike (select pat from params)
        or extensions.word_similarity((select term from params), s.name) > 0.35
      )
  ),
  res as (
    select
      'resource'::text as kind,
      r.id,
      r.title,
      s.name as subtitle,
      s.id as subject_id,
      s.slug as subject_slug,
      s.name as subject_name,
      p.slug as program_slug,
      y.number as year_number,
      se.number as semester_number,
      r.resource_type,
      r.access_type,
      greatest(
        extensions.word_similarity((select term from params), r.title),
        extensions.word_similarity((select term from params), s.name) * 0.8
      ) + case when r.title ilike (select term from params) || '%' then 0.4 else 0 end
        as score
    from public.resources r
    join public.subjects s on s.id = r.subject_id
    join public.semesters se on se.id = s.semester_id
    join public.years y on y.id = se.year_id
    join public.programs p on p.id = y.program_id and p.is_active
    where r.status = 'PUBLISHED'
      and char_length((select term from params)) >= 2
      and (
        r.title ilike (select pat from params)
        or r.description ilike (select pat from params)
        or s.name ilike (select pat from params)
        or extensions.word_similarity((select term from params), r.title) > 0.35
      )
  )
  select * from (
    select * from subj
    union all
    select * from res
  ) u
  order by u.score desc, u.title asc
  limit (select lim from params);
$$;

grant execute on function public.search_catalog(text, int) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- record_resource_view: dedupe one view per user (or session_key for anon)
-- per resource per N minutes (site_settings.resources.view_dedupe_minutes,
-- default 30). Increments resources.view_count. Returns true if counted.
-- -----------------------------------------------------------------------------
create or replace function public.record_resource_view(
  p_resource_id uuid,
  p_session_key text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user    uuid := auth.uid();
  v_session text := nullif(left(btrim(coalesce(p_session_key, '')), 128), '');
  v_minutes int;
begin
  if v_user is null and v_session is null then
    return false;
  end if;

  if not exists (select 1 from public.resources where id = p_resource_id and status = 'PUBLISHED') then
    return false;
  end if;

  select coalesce((value->>'view_dedupe_minutes')::int, 30) into v_minutes
    from public.site_settings where key = 'resources';
  v_minutes := greatest(coalesce(v_minutes, 30), 1);

  if exists (
    select 1 from public.resource_views
     where resource_id = p_resource_id
       and viewed_at > now() - make_interval(mins => v_minutes)
       and (
         (v_user is not null and user_id = v_user)
         or (v_user is null and user_id is null and session_key = v_session)
       )
  ) then
    return false;
  end if;

  insert into public.resource_views (resource_id, user_id, session_key)
  values (p_resource_id, v_user, v_session);

  update public.resources set view_count = view_count + 1 where id = p_resource_id;
  return true;
end;
$$;

revoke execute on function public.record_resource_view(uuid, text) from public;
grant execute on function public.record_resource_view(uuid, text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- expire_premium: housekeeping (call from a cron / pg_cron). Clears the
-- is_premium flag after expiry. Access checks already compare expires_at.
-- -----------------------------------------------------------------------------
create or replace function public.expire_premium()
returns int
language sql
security definer
set search_path = ''
as $$
  with upd as (
    update public.profiles
       set is_premium = false
     where is_premium and premium_expires_at is not null and premium_expires_at <= now()
    returning 1
  )
  select count(*)::int from upd;
$$;
revoke execute on function public.expire_premium() from public, anon, authenticated;
grant execute on function public.expire_premium() to service_role;
