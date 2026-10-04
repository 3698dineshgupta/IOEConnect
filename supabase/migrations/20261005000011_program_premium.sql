-- =============================================================================
-- IOE Connect :: 0011 premium per program
--   A premium purchase unlocks ONE program (CSE, Civil, BEX, BEL, BME ...). Access to premium
--   resources and to download/print is granted per (user, program) in premium_access.
--   Subjects shared between programs (subjects.share_group) are open to premium members of any
--   program that shares them; that rule lives in application code.
--   * payments.program_id: the program the buyer asked for (required for new payments)
--   * premium_access: one row per (user, program) with its own validity window
--   * approve_payment: grants/extends that program's access (and the referrer's reward for the same program)
--   * existing premium members are grandfathered into every active program until their current expiry
-- Requires 20261003000001..20261005000010.
-- =============================================================================

alter table public.payments
  add column if not exists program_id uuid references public.programs(id) on delete set null;

create index if not exists payments_program_idx on public.payments (program_id);

create table if not exists public.premium_access (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  program_id  uuid not null references public.programs(id) on delete cascade,
  started_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  updated_at  timestamptz not null default now(),
  primary key (user_id, program_id)
);

create index if not exists premium_access_expires_idx on public.premium_access (expires_at);

alter table public.premium_access enable row level security;

drop policy if exists premium_access_own_read on public.premium_access;
create policy premium_access_own_read on public.premium_access
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Writes only through SECURITY DEFINER functions / the service role.
revoke all on public.premium_access from anon;
revoke insert, update, delete on public.premium_access from authenticated;

-- Grandfather current premium members into every active program (until their existing expiry).
insert into public.premium_access (user_id, program_id, started_at, expires_at)
select p.id, pr.id, coalesce(p.premium_started_at, now()), p.premium_expires_at
from public.profiles p
cross join public.programs pr
where p.is_premium and p.premium_expires_at is not null and p.premium_expires_at > now() and pr.is_active
on conflict (user_id, program_id) do nothing;

-- New payments by end users must name an active program.
create or replace function public.payments_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  plan_price numeric;
  prog_ok boolean;
begin
  if current_user in ('anon', 'authenticated') then
    select price into plan_price
    from public.premium_plans
    where id = new.plan_id and is_active;

    if plan_price is null then
      raise exception 'Selected plan is not available' using errcode = '22023';
    end if;

    select exists (select 1 from public.programs where id = new.program_id and is_active) into prog_ok;
    if not coalesce(prog_ok, false) then
      raise exception 'Choose the program you want premium for' using errcode = '22023';
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

-- -----------------------------------------------------------------------------
-- approve_payment: same contract as before, but premium is granted for the payment's program.
-- profiles.is_premium / premium_* stay as a "has any premium" summary for the account pages.
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
  v_access   public.premium_access%rowtype;
  v_active   boolean;
  v_started  timestamptz;
  v_expires  timestamptz;
  v_ref      public.referrals%rowtype;
  v_ref_cfg  jsonb;
  v_reward_days int;
  v_reward_amount numeric;
  v_referrer public.profiles%rowtype;
  v_ref_access public.premium_access%rowtype;
  v_ref_expires timestamptz;
  v_ref_started timestamptz;
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

  -- Current window: the program's own access when the payment names a program, else the account summary.
  if v_payment.program_id is not null then
    select * into v_access from public.premium_access
     where user_id = v_profile.id and program_id = v_payment.program_id for update;
    v_active := found and v_access.expires_at > now();
    v_started := case when v_active then v_access.started_at else now() end;
  else
    v_active := v_profile.is_premium
                and v_profile.premium_expires_at is not null
                and v_profile.premium_expires_at > now();
    v_started := case when v_active then coalesce(v_profile.premium_started_at, now()) else now() end;
  end if;

  if p_expiry_override is not null then
    if p_expiry_override <= now() then
      raise exception 'Expiry override must be in the future' using errcode = '22023';
    end if;
    v_expires := p_expiry_override;
  else
    v_expires := (case
                    when v_payment.program_id is not null and v_active then v_access.expires_at
                    when v_payment.program_id is null and v_active then v_profile.premium_expires_at
                    else now() end)
                 + make_interval(days => v_plan.duration_days);
  end if;

  if v_payment.program_id is not null then
    insert into public.premium_access (user_id, program_id, started_at, expires_at, updated_at)
    values (v_profile.id, v_payment.program_id, v_started, v_expires, now())
    on conflict (user_id, program_id)
    do update set started_at = excluded.started_at, expires_at = excluded.expires_at, updated_at = now();
  end if;

  -- Account summary = the latest expiry across programs.
  update public.profiles
     set is_premium = true,
         premium_started_at = case
           when v_profile.is_premium and v_profile.premium_expires_at > now()
             then coalesce(v_profile.premium_started_at, v_started) else v_started end,
         premium_expires_at = greatest(v_expires,
           case when v_profile.is_premium and v_profile.premium_expires_at > now()
                then v_profile.premium_expires_at else v_expires end)
   where id = v_profile.id;

  update public.payments
     set status = 'APPROVED',
         reviewed_by = v_admin,
         reviewed_at = now(),
         rejection_reason = null
   where id = v_payment.id;

  -- ---- referral reward (same program as the purchase) -----------------------
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
          if v_payment.program_id is not null then
            select * into v_ref_access from public.premium_access
             where user_id = v_referrer.id and program_id = v_payment.program_id for update;
            v_ref_started := case when found and v_ref_access.expires_at > now() then v_ref_access.started_at else now() end;
            v_ref_expires := (case when found and v_ref_access.expires_at > now() then v_ref_access.expires_at else now() end)
                             + make_interval(days => v_reward_days);
            insert into public.premium_access (user_id, program_id, started_at, expires_at, updated_at)
            values (v_referrer.id, v_payment.program_id, v_ref_started, v_ref_expires, now())
            on conflict (user_id, program_id)
            do update set started_at = excluded.started_at, expires_at = excluded.expires_at, updated_at = now();
          else
            v_ref_expires := (case when v_referrer.is_premium and v_referrer.premium_expires_at > now()
                                   then v_referrer.premium_expires_at else now() end)
                             + make_interval(days => v_reward_days);
          end if;

          update public.profiles
             set is_premium = true,
                 premium_started_at = case
                   when v_referrer.is_premium and v_referrer.premium_expires_at > now()
                     then coalesce(v_referrer.premium_started_at, now())
                   else now() end,
                 premium_expires_at = greatest(v_ref_expires,
                   case when v_referrer.is_premium and v_referrer.premium_expires_at > now()
                        then v_referrer.premium_expires_at else v_ref_expires end)
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
                'program_id', v_payment.program_id,
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
            'program_id', v_payment.program_id,
            'amount', v_payment.amount,
            'duration_days', v_plan.duration_days,
            'expiry_override', p_expiry_override,
            'was_active', v_active,
            'premium_started_at', v_started,
            'premium_expires_at', v_expires,
            'referral', v_ref_result));

  return jsonb_build_object(
    'payment_id', v_payment.id,
    'user_id', v_profile.id,
    'program_id', v_payment.program_id,
    'status', 'APPROVED',
    'premium_started_at', v_started,
    'premium_expires_at', v_expires,
    'extended', v_active,
    'referral', v_ref_result);
end;
$$;
