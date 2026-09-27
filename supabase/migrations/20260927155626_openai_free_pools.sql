-- Daily meter for OpenAI's complimentary tokens on traffic shared with
-- OpenAI (https://help.openai.com/en/articles/10306912). Each pool is shared
-- by its models and resets at 00:00 UTC. A request that would take the day's
-- total past the limit is billed in full, so every pooled OpenAI call first
-- reserves its largest possible size here and is refused once the pool would
-- pass its stop point. The app settles each reservation with the real usage.
-- Reserving and settling run only with the server's service-role key: a
-- signed-in account could otherwise fill a pool without calling OpenAI, or
-- settle a reservation below its real usage.

create table public.ai_pool_limits (
  pool text primary key check (pool in ('large', 'small')),
  daily_tokens integer not null check (daily_tokens > 0),
  stop_ratio numeric not null check (stop_ratio > 0 and stop_ratio <= 1)
);

-- Usage tiers 1-2. Update these rows (1000000 and 10000000) at tier 3.
insert into public.ai_pool_limits (pool, daily_tokens, stop_ratio)
values ('large', 250000, 0.9), ('small', 2500000, 0.9);

alter table public.ai_pool_limits enable row level security;
alter table public.ai_pool_limits force row level security;
revoke all on public.ai_pool_limits from anon, authenticated;

create table public.ai_pool_usage (
  id bigint generated always as identity primary key,
  -- Kept when an account is deleted so today's total never drops.
  user_id uuid references auth.users(id) on delete set null,
  pool text not null check (pool in ('large', 'small')),
  model text not null check (char_length(model) <= 64),
  feature text not null check (feature in (
    'analyst_planner', 'analyst_answer', 'analyst_preset',
    'capture', 'capture_batch', 'capture_media'
  )),
  usage_day date not null,
  reserved_tokens integer not null check (reserved_tokens between 1 and 200000),
  used_tokens integer check (used_tokens >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'settled')),
  created_at timestamptz not null default now()
);

create index ai_pool_usage_day_pool_idx on public.ai_pool_usage (usage_day, pool);

alter table public.ai_pool_usage enable row level security;
alter table public.ai_pool_usage force row level security;
revoke all on public.ai_pool_usage from anon, authenticated;

-- The exact model IDs in each pool. Aliases are deliberately absent.
create function public.ai_pool_for_model(p_model text)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_model in (
      'gpt-6-astra', 'gpt-6-sol', 'gpt-6-luna', 'gpt-5.6-sol',
      'gpt-5.5-2026-04-23', 'gpt-5.4-2026-03-05', 'gpt-5.2-2025-12-11',
      'gpt-5.1-2025-11-13', 'gpt-5.1-codex', 'gpt-5-codex',
      'gpt-5-2025-08-07', 'gpt-5-chat-latest', 'gpt-4.1-2025-04-14',
      'gpt-4o-2024-05-13', 'gpt-4o-2024-08-06', 'gpt-4o-2024-11-20',
      'o3-2025-04-16', 'o1-preview-2024-09-12', 'o1-2024-12-17'
    ) then 'large'
    when p_model in (
      'gpt-5.6-terra', 'gpt-5.6-luna', 'gpt-5.4-mini-2026-03-17',
      'gpt-5.4-nano-2026-03-17', 'gpt-5.1-codex-mini',
      'gpt-5-mini-2025-08-07', 'gpt-5-nano-2025-08-07',
      'gpt-4.1-mini-2025-04-14', 'gpt-4.1-nano-2025-04-14',
      'gpt-4o-mini-2024-07-18', 'o4-mini-2025-04-16',
      'o1-mini-2024-09-12', 'codex-mini-latest'
    ) then 'small'
  end
$$;
revoke all on function public.ai_pool_for_model(text) from public, anon, authenticated;

-- p_user_id is the account the server verified for this request.
create function public.reserve_ai_pool_tokens(p_user_id uuid, p_model text, p_feature text, p_tokens integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  target_pool text := public.ai_pool_for_model(p_model);
  today date := (now() at time zone 'utc')::date;
  pool_budget bigint;
  committed bigint;
  reservation_id bigint;
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
  select coalesce(sum(coalesce(used_tokens, reserved_tokens)), 0) into committed
    from public.ai_pool_usage where usage_day = today and pool = target_pool;
  if pool_budget is null or committed + p_tokens > pool_budget then
    return jsonb_build_object(
      'status', 'exhausted',
      'pool', target_pool,
      'remaining', greatest(coalesce(pool_budget, 0) - committed, 0)
    );
  end if;
  insert into public.ai_pool_usage (user_id, pool, model, feature, usage_day, reserved_tokens)
    values (p_user_id, target_pool, p_model, p_feature, today, p_tokens)
    returning id into reservation_id;
  return jsonb_build_object('status', 'reserved', 'reservation_id', reservation_id, 'pool', target_pool);
end; $$;
revoke all on function public.reserve_ai_pool_tokens(uuid, text, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_pool_tokens(uuid, text, text, integer) to service_role;

-- Records the real usage once. Unknown usage (a timeout, say) keeps the
-- reserved size, since OpenAI may still have billed the request.
create function public.settle_ai_pool_tokens(p_id bigint, p_used integer default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_used is not null and p_used < 0 then return; end if;
  update public.ai_pool_usage
    set used_tokens = coalesce(p_used, reserved_tokens), status = 'settled'
    where id = p_id and status = 'reserved';
end; $$;
revoke all on function public.settle_ai_pool_tokens(bigint, integer) from public, anon, authenticated;
grant execute on function public.settle_ai_pool_tokens(bigint, integer) to service_role;

-- Today's use of each pool against ATLAS's stop point, for the model picker.
create function public.ai_pool_status()
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
      'used', coalesce(usage.used, 0)
    ) order by limits.pool)
    from public.ai_pool_limits limits
    left join (
      select pool, sum(coalesce(used_tokens, reserved_tokens)) as used
      from public.ai_pool_usage where usage_day = today group by pool
    ) usage using (pool)
  );
end; $$;
revoke all on function public.ai_pool_status() from public, anon;
grant execute on function public.ai_pool_status() to authenticated;

-- Analyst records the exact model it explains with, and a refused pool.
create or replace function public.reserve_ai_analyst_request_result(p_type text, p_model text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  requesting_user uuid := (select auth.uid());
  request_id bigint;
  reservation_time timestamptz := now();
begin
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
  perform pg_catalog.pg_advisory_xact_lock(6106, 2);
  if (select count(*) from public.ai_analyst_requests where user_id = requesting_user and created_at >= reservation_time - interval '1 hour') >= 8 then
    return jsonb_build_object('status', 'hourly_quota');
  end if;
  if (select count(*) from public.ai_analyst_requests where user_id = requesting_user and created_at >= reservation_time - interval '1 day') >= 25 then
    return jsonb_build_object('status', 'daily_quota');
  end if;
  if (select count(*) from public.ai_analyst_requests where created_at >= reservation_time - interval '1 day') >= 300 then
    return jsonb_build_object('status', 'site_quota');
  end if;
  insert into public.ai_analyst_requests(user_id, analysis_type, model)
    values (requesting_user, p_type, p_model) returning id into request_id;
  return jsonb_build_object('status', 'reserved', 'request_id', request_id);
end; $$;
revoke all on function public.reserve_ai_analyst_request_result(text,text) from public, anon;
grant execute on function public.reserve_ai_analyst_request_result(text,text) to authenticated;

alter table public.ai_analyst_requests
  drop constraint ai_analyst_requests_outcome_check;
alter table public.ai_analyst_requests
  add constraint ai_analyst_requests_outcome_check check (outcome in (
    'reserved', 'success', 'insufficient', 'invalid_response', 'provider_error',
    'timeout', 'context_limit', 'pool_exhausted', 'openai_auth_error',
    'openai_model_access', 'openai_rate_limit', 'openai_invalid_request',
    'openai_provider_error'
  ));

create or replace function public.finish_ai_analyst_request(p_id bigint, p_outcome text, p_input_tokens integer default null, p_output_tokens integer default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_outcome not in ('success','insufficient','invalid_response','provider_error','timeout','context_limit','pool_exhausted','openai_auth_error','openai_model_access','openai_rate_limit','openai_invalid_request','openai_provider_error')
    or p_input_tokens < 0 or p_output_tokens < 0 then return; end if;
  update public.ai_analyst_requests set outcome = p_outcome, input_tokens = p_input_tokens, output_tokens = p_output_tokens
    where id = p_id and user_id = (select auth.uid()) and outcome = 'reserved';
end; $$;
revoke all on function public.finish_ai_analyst_request(bigint,text,integer,integer) from public,anon;
grant execute on function public.finish_ai_analyst_request(bigint,text,integer,integer) to authenticated;
