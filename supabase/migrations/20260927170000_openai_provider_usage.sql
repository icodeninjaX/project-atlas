-- OpenAI's own count of today's usage per free pool, read from the
-- organization Usage API with an admin key. The meter counts the larger of
-- its ledger and OpenAI's figure plus what it has reserved since that figure,
-- so usage outside the meter (before it existed, the Playground, other apps
-- on the organization) still counts towards the stop point. Usage data lags,
-- so reservations from shortly before a sync are counted on top of it too.

create table public.ai_pool_provider_usage (
  pool text not null check (pool in ('large', 'small')),
  usage_day date not null,
  tokens bigint not null check (tokens >= 0),
  -- Per model and service tier, for review; never read by the meter.
  details jsonb not null default '[]'::jsonb check (jsonb_typeof(details) = 'array'),
  synced_at timestamptz not null default now(),
  primary key (pool, usage_day)
);

alter table public.ai_pool_provider_usage enable row level security;
alter table public.ai_pool_provider_usage force row level security;
revoke all on public.ai_pool_provider_usage from anon, authenticated;

-- Tokens a pool has committed today: the ledger, or OpenAI's figure plus
-- reservations made since 15 minutes before it was read, whichever is larger.
create function public.ai_pool_committed(p_pool text, p_day date)
returns bigint language sql stable set search_path = '' as $$
  with ledger as (
    select coalesce(sum(coalesce(used_tokens, reserved_tokens)), 0) as total
    from public.ai_pool_usage where usage_day = p_day and pool = p_pool
  ), provider as (
    select tokens, synced_at from public.ai_pool_provider_usage
    where usage_day = p_day and pool = p_pool
  )
  select greatest(
    (select total from ledger),
    coalesce((
      select provider.tokens + coalesce((
        select sum(coalesce(used_tokens, reserved_tokens))
        from public.ai_pool_usage
        where usage_day = p_day and pool = p_pool
          and created_at >= provider.synced_at - interval '15 minutes'
      ), 0)
      from provider
    ), 0)
  )::bigint
$$;
revoke all on function public.ai_pool_committed(text, date) from public, anon, authenticated;

-- Written only by the server, from the Usage API.
create function public.record_ai_pool_provider_usage(p_day date, p_large bigint, p_small bigint, p_details jsonb default '[]'::jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_day is null or p_large is null or p_small is null or p_large < 0 or p_small < 0
    or jsonb_typeof(coalesce(p_details, '[]'::jsonb)) <> 'array' then return; end if;
  insert into public.ai_pool_provider_usage (pool, usage_day, tokens, details, synced_at)
  values
    ('large', p_day, p_large, coalesce(p_details, '[]'::jsonb), now()),
    ('small', p_day, p_small, coalesce(p_details, '[]'::jsonb), now())
  on conflict (pool, usage_day) do update
    set tokens = excluded.tokens, details = excluded.details, synced_at = excluded.synced_at;
end; $$;
revoke all on function public.record_ai_pool_provider_usage(date, bigint, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.record_ai_pool_provider_usage(date, bigint, bigint, jsonb) to service_role;

create or replace function public.reserve_ai_pool_tokens(p_user_id uuid, p_model text, p_feature text, p_tokens integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  target_pool text := public.ai_pool_for_model(p_model);
  today date := (now() at time zone 'utc')::date;
  pool_budget bigint;
  committed bigint;
  reservation_id bigint;
  provider_synced_at timestamptz;
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
  -- One reservation per pool at a time, so concurrent requests cannot both
  -- take the last room in the pool.
  perform pg_catalog.pg_advisory_xact_lock(6107, case target_pool when 'large' then 1 else 2 end);
  committed := public.ai_pool_committed(target_pool, today);
  select synced_at into provider_synced_at
    from public.ai_pool_provider_usage where pool = target_pool and usage_day = today;
  if pool_budget is null or committed + p_tokens > pool_budget then
    return jsonb_build_object(
      'status', 'exhausted',
      'pool', target_pool,
      'remaining', greatest(coalesce(pool_budget, 0) - committed, 0),
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

create or replace function public.ai_pool_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'utc')::date;
begin
  if (select auth.uid()) is null then return null; end if;
  return (
    select jsonb_agg(jsonb_build_object(
      'pool', limits.pool,
      'dailyTokens', limits.daily_tokens,
      'budget', floor(limits.daily_tokens * limits.stop_ratio),
      'used', public.ai_pool_committed(limits.pool, today),
      'syncedAt', provider.synced_at
    ) order by limits.pool)
    from public.ai_pool_limits limits
    left join public.ai_pool_provider_usage provider
      on provider.pool = limits.pool and provider.usage_day = today
  );
end; $$;
revoke all on function public.ai_pool_status() from public, anon;
grant execute on function public.ai_pool_status() to authenticated;
