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

-- One refresh at a time across server instances: the first caller claims
-- it, and others wait for its figure instead of calling the Usage API too.
-- Each claim carries a fencing token, so a claimant that stalls past its
-- lease can neither record an older figure nor release a newer claim.
create table public.ai_pool_provider_sync (
  id boolean primary key default true check (id),
  claimed_at timestamptz,
  token uuid
);
insert into public.ai_pool_provider_sync (id, claimed_at, token) values (true, null, null);

alter table public.ai_pool_provider_sync enable row level security;
alter table public.ai_pool_provider_sync force row level security;
revoke all on public.ai_pool_provider_sync from anon, authenticated;

-- The claim's token for the one caller that may refresh now, or null; a
-- claim lapses after 15 seconds.
create function public.claim_ai_pool_provider_sync()
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  claim_token uuid;
begin
  update public.ai_pool_provider_sync
    set claimed_at = now(), token = pg_catalog.gen_random_uuid()
    where id and (claimed_at is null or claimed_at < now() - interval '15 seconds')
    returning token into claim_token;
  return claim_token;
end; $$;
revoke all on function public.claim_ai_pool_provider_sync() from public, anon, authenticated;
grant execute on function public.claim_ai_pool_provider_sync() to service_role;

-- Written only by the server, from the Usage API, and only by the current
-- claim's holder. Returns whether the figure was recorded.
create function public.record_ai_pool_provider_usage(p_token uuid, p_day date, p_large bigint, p_small bigint, p_details jsonb default '[]'::jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_token is null or p_day is null or p_large is null or p_small is null
    or p_large < 0 or p_small < 0
    or jsonb_typeof(coalesce(p_details, '[]'::jsonb)) <> 'array' then return false; end if;
  -- Lock the claim so it cannot change hands between this check and the write.
  perform 1 from public.ai_pool_provider_sync where id and token = p_token for update;
  if not found then return false; end if;
  insert into public.ai_pool_provider_usage (pool, usage_day, tokens, details, synced_at)
  values
    ('large', p_day, p_large, coalesce(p_details, '[]'::jsonb), now()),
    ('small', p_day, p_small, coalesce(p_details, '[]'::jsonb), now())
  on conflict (pool, usage_day) do update
    set tokens = excluded.tokens, details = excluded.details, synced_at = excluded.synced_at;
  return true;
end; $$;
revoke all on function public.record_ai_pool_provider_usage(uuid, date, bigint, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.record_ai_pool_provider_usage(uuid, date, bigint, bigint, jsonb) to service_role;

-- Ends a claim once its refresh has finished, whether or not it succeeded,
-- so waiting callers learn the outcome instead of timing out. Only the
-- current holder's token can release it.
create function public.release_ai_pool_provider_sync(p_token uuid)
returns void language sql security definer set search_path = '' as $$
  update public.ai_pool_provider_sync set claimed_at = null, token = null
  where id and token = p_token
$$;
revoke all on function public.release_ai_pool_provider_sync(uuid) from public, anon, authenticated;
grant execute on function public.release_ai_pool_provider_sync(uuid) to service_role;

-- For callers waiting on another instance's refresh: when today's figure was
-- last recorded, and whether a refresh is still claimed.
create function public.ai_pool_provider_sync_state()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'syncedAt', (
      select min(synced_at) from public.ai_pool_provider_usage
      where usage_day = (now() at time zone 'utc')::date
    ),
    'claimActive', coalesce((
      select claimed_at >= now() - interval '15 seconds'
      from public.ai_pool_provider_sync where id
    ), false)
  )
$$;
revoke all on function public.ai_pool_provider_sync_state() from public, anon, authenticated;
grant execute on function public.ai_pool_provider_sync_state() to service_role;

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
