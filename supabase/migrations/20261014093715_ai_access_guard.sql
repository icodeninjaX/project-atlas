-- AI access guard: who may spend AI tokens, and how much.
--
-- Tiers live in the private schema, which the API never exposes, so only the
-- service role or the SQL editor can grant or revoke them:
--
--   insert into private.ai_user_tiers (user_id, tier, note)
--   select id, 'owner', 'site owner' from auth.users where email = '<you>';
--
-- 'owner'   Exempt from per-user and site-wide caps, may use the whole pool
--           (including a reserve no one else can touch), and keeps working
--           when public AI is paused. Applies only while the account has a
--           verified MFA factor, so a stolen password alone cannot unlock it.
-- 'blocked' Refused every AI reservation. The account itself keeps working;
--           nothing here disables or deletes a user.
--
-- Everyone else is 'standard', or 'probation' while their account is new or
-- their email is unconfirmed (cheap sign-ups get the smallest allowance).

create table private.ai_user_tiers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null check (tier in ('owner', 'blocked')),
  note text check (char_length(note) <= 200),
  updated_at timestamptz not null default now()
);
alter table private.ai_user_tiers enable row level security;
revoke all on private.ai_user_tiers from public, anon, authenticated;

-- One row of tunables, editable without a migration.
create table private.ai_guard_settings (
  id boolean primary key default true check (id),
  -- false pauses AI for everyone except owners (incident kill switch).
  public_ai_enabled boolean not null default true,
  -- Share of each pool's daily budget held back for owners.
  owner_reserve_ratio numeric not null default 0.2
    check (owner_reserve_ratio >= 0 and owner_reserve_ratio < 1),
  -- Most of one pool's daily budget a single non-owner may use.
  user_pool_share numeric not null default 0.15
    check (user_pool_share > 0 and user_pool_share <= 1),
  probation_hours integer not null default 72 check (probation_hours >= 0),
  -- Runaway-loop ceiling for owners, per feature per day.
  owner_daily_requests integer not null default 200 check (owner_daily_requests > 0)
);
insert into private.ai_guard_settings default values;
alter table private.ai_guard_settings enable row level security;
revoke all on private.ai_guard_settings from public, anon, authenticated;

create index ai_pool_usage_user_day_idx
  on public.ai_pool_usage (user_id, usage_day, pool);

-- 'owner' | 'blocked' | 'paused' | 'probation' | 'standard'
create function private.ai_access_class(p_user uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  assigned text;
  settings private.ai_guard_settings%rowtype;
  account auth.users%rowtype;
begin
  if p_user is null then return 'blocked'; end if;
  select tier into assigned from private.ai_user_tiers where user_id = p_user;
  if assigned = 'blocked' then return 'blocked'; end if;
  if assigned = 'owner' and exists (
    select 1 from auth.mfa_factors where user_id = p_user and status = 'verified'
  ) then
    return 'owner';
  end if;
  select * into settings from private.ai_guard_settings;
  if not coalesce(settings.public_ai_enabled, false) then return 'paused'; end if;
  select * into account from auth.users where id = p_user;
  if not found then return 'blocked'; end if;
  if account.email_confirmed_at is null
    or account.created_at > now() - make_interval(hours => settings.probation_hours) then
    return 'probation';
  end if;
  return 'standard';
end; $$;
revoke all on function private.ai_access_class(uuid) from public, anon, authenticated;

-- Site-wide caps count only non-owner traffic, so sign-ups cannot lock the
-- owner out by exhausting them.
create function private.is_ai_owner_row(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.ai_user_tiers where user_id = p_user and tier = 'owner');
$$;
revoke all on function private.is_ai_owner_row(uuid) from public, anon, authenticated;

create or replace function public.reserve_ai_analyst_request_result(p_type text, p_model text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  requesting_user uuid := (select auth.uid());
  request_id bigint;
  reservation_time timestamptz := now();
  access_class text;
  hourly_cap integer;
  daily_cap integer;
begin
  if auth.uid() is not null and not public.has_required_assurance() then
    raise exception 'MFA required' using errcode = '42501';
  end if;
  if requesting_user is null then
    return jsonb_build_object('status', 'unauthenticated');
  end if;
  if p_type is null or p_type not in ('spending_change','debt_progress','task_focus','career_pipeline','goal_progress','weekly_review_trends','signals_summary','freeform') then
    return jsonb_build_object('status', 'invalid_type');
  end if;
  if p_model is null or p_model not in (
      'gpt-4o-mini-2024-07-18', 'gpt-5.4-mini-2026-03-17', 'gpt-5.6-terra',
      'gpt-5.6-luna', 'gpt-5.4-2026-03-05', 'gpt-6-sol', 'gpt-6-luna'
    ) then
    return jsonb_build_object('status', 'invalid_model');
  end if;
  access_class := private.ai_access_class(requesting_user);
  -- A blocked caller sees an ordinary limit, not that it was singled out.
  if access_class = 'blocked' then return jsonb_build_object('status', 'daily_quota'); end if;
  if access_class = 'paused' then return jsonb_build_object('status', 'site_quota'); end if;
  perform pg_catalog.pg_advisory_xact_lock(6106, 2);
  if access_class = 'owner' then
    if (select count(*) from public.ai_analyst_requests where user_id = requesting_user and created_at >= reservation_time - interval '1 day')
        >= (select owner_daily_requests from private.ai_guard_settings) then
      return jsonb_build_object('status', 'daily_quota');
    end if;
  else
    hourly_cap := case access_class when 'probation' then 3 else 8 end;
    daily_cap := case access_class when 'probation' then 10 else 25 end;
    if (select count(*) from public.ai_analyst_requests where user_id = requesting_user and created_at >= reservation_time - interval '1 hour') >= hourly_cap then
      return jsonb_build_object('status', 'hourly_quota');
    end if;
    if (select count(*) from public.ai_analyst_requests where user_id = requesting_user and created_at >= reservation_time - interval '1 day') >= daily_cap then
      return jsonb_build_object('status', 'daily_quota');
    end if;
    if (select count(*) from public.ai_analyst_requests where created_at >= reservation_time - interval '1 day' and not private.is_ai_owner_row(user_id)) >= 300 then
      return jsonb_build_object('status', 'site_quota');
    end if;
  end if;
  insert into public.ai_analyst_requests(user_id, analysis_type, model)
    values (requesting_user, p_type, p_model) returning id into request_id;
  return jsonb_build_object('status', 'reserved', 'request_id', request_id);
end; $$;
revoke all on function public.reserve_ai_analyst_request_result(text,text) from public, anon;
grant execute on function public.reserve_ai_analyst_request_result(text,text) to authenticated;

create or replace function public.reserve_ai_capture_request()
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  requesting_user uuid := (select auth.uid());
  reservation_time timestamptz := now();
  access_class text;
  hourly_cap integer;
  daily_cap integer;
begin
  if auth.uid() is not null and not public.has_required_assurance() then
    raise exception 'MFA required' using errcode = '42501';
  end if;
  if requesting_user is null then
    return false;
  end if;
  access_class := private.ai_access_class(requesting_user);
  if access_class in ('blocked', 'paused') then return false; end if;
  hourly_cap := case access_class when 'probation' then 5 else 10 end;
  daily_cap := case access_class when 'probation' then 10 else 30 end;

  -- Serialize reservations across workers before checking user and site caps.
  perform pg_catalog.pg_advisory_xact_lock(6106, 1);

  if access_class = 'owner' then
    if (select count(*) from public.ai_capture_requests
        where user_id = requesting_user and created_at >= reservation_time - interval '1 day')
        >= (select owner_daily_requests from private.ai_guard_settings) then
      return false;
    end if;
  elsif (select count(*) from public.ai_capture_requests
      where created_at >= reservation_time - interval '1 day' and not private.is_ai_owner_row(user_id)) >= 300
     or (select count(*) from public.ai_capture_requests
      where user_id = requesting_user and created_at >= reservation_time - interval '1 hour') >= hourly_cap
     or (select count(*) from public.ai_capture_requests
      where user_id = requesting_user and created_at >= reservation_time - interval '1 day') >= daily_cap then
    return false;
  end if;

  insert into public.ai_capture_requests(user_id) values (requesting_user);
  return true;
end;
$$;
revoke all on function public.reserve_ai_capture_request() from public, anon;
grant execute on function public.reserve_ai_capture_request() to authenticated;

-- Token pools: non-owners share the budget minus the owner reserve, and each
-- may take at most user_pool_share of it per day.
create or replace function public.reserve_ai_pool_tokens(p_user_id uuid, p_model text, p_feature text, p_tokens integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  target_pool text := public.ai_pool_for_model(p_model);
  today date := (now() at time zone 'utc')::date;
  pool_budget bigint;
  usable_budget bigint;
  committed bigint;
  user_committed bigint;
  user_budget bigint;
  reservation_id bigint;
  provider_synced_at timestamptz;
  access_class text;
  settings private.ai_guard_settings%rowtype;
begin
  if p_user_id is null then
    return jsonb_build_object('status', 'invalid_request');
  end if;
  if target_pool is null then
    return jsonb_build_object('status', 'unpooled_model');
  end if;
  if p_feature is null or p_feature not in (
      'analyst_planner', 'analyst_answer', 'analyst_preset',
      'capture', 'capture_batch', 'capture_media'
    ) or p_tokens is null or p_tokens < 1 or p_tokens > 200000 then
    return jsonb_build_object('status', 'invalid_request');
  end if;
  select floor(daily_tokens * stop_ratio) into pool_budget
    from public.ai_pool_limits where pool = target_pool;
  select * into settings from private.ai_guard_settings;
  access_class := private.ai_access_class(p_user_id);
  -- One reservation per pool at a time, so concurrent requests cannot both
  -- take the last room in the pool.
  perform pg_catalog.pg_advisory_xact_lock(6107, case target_pool when 'large' then 1 else 2 end);
  committed := public.ai_pool_committed(target_pool, today);
  select synced_at into provider_synced_at
    from public.ai_pool_provider_usage where pool = target_pool and usage_day = today;

  usable_budget := pool_budget;
  if access_class in ('blocked', 'paused') then
    usable_budget := 0;
  elsif access_class <> 'owner' then
    -- Hold the reserve back only when there is an owner to use it.
    if exists (select 1 from private.ai_user_tiers where tier = 'owner') then
      usable_budget := floor(pool_budget * (1 - settings.owner_reserve_ratio));
    end if;
    user_budget := floor(pool_budget * settings.user_pool_share);
    select coalesce(sum(coalesce(used_tokens, reserved_tokens)), 0) into user_committed
      from public.ai_pool_usage
     where user_id = p_user_id and usage_day = today and pool = target_pool;
    if user_committed + p_tokens > user_budget then
      return jsonb_build_object(
        'status', 'exhausted',
        'pool', target_pool,
        'remaining', greatest(user_budget - user_committed, 0),
        'provider_synced_at', provider_synced_at
      );
    end if;
  end if;

  if usable_budget is null or committed + p_tokens > usable_budget then
    return jsonb_build_object(
      'status', 'exhausted',
      'pool', target_pool,
      'remaining', greatest(coalesce(usable_budget, 0) - committed, 0),
      'provider_synced_at', provider_synced_at
    );
  end if;
  insert into public.ai_pool_usage (user_id, pool, model, feature, usage_day, reserved_tokens)
    values (p_user_id, target_pool, p_model, p_feature, today, p_tokens)
    returning id into reservation_id;
  return jsonb_build_object(
    'status', 'reserved',
    'reservation_id', reservation_id,
    'pool', target_pool,
    'provider_synced_at', provider_synced_at
  );
end; $$;
revoke all on function public.reserve_ai_pool_tokens(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_pool_tokens(uuid, text, text, integer) to service_role;
