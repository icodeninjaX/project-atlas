-- Enforce optional MFA at the data boundary, including direct PostgREST calls.
-- Read current verified factors, not enrollment information in an older JWT.
create or replace function public.has_required_assurance()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    not exists (
      select 1 from auth.mfa_factors
      where user_id = auth.uid() and status = 'verified'
    ) or coalesce(auth.jwt()->>'aal' = 'aal2', false)
  );
$$;
revoke all on function public.has_required_assurance() from public, anon;
grant execute on function public.has_required_assurance() to authenticated;

-- Restrictive policies compose with every existing owner policy, including views.
do $$
declare relation record;
begin
  for relation in
    select c.relname from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  loop
    execute format(
      'create policy "Require enrolled MFA" on public.%I as restrictive for all to authenticated using ((select public.has_required_assurance())) with check ((select public.has_required_assurance()))',
      relation.relname
    );
  end loop;
end;
$$;

-- Definer RPCs bypass RLS; retain their contracts and check before any side effect.

create or replace function public.review_knowledge_concept(
  p_concept_id uuid,
  p_outcome text,
  p_recalled_answer text default null
)
returns table (next_review_at timestamptz, interval_days integer, confidence smallint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  concept public.knowledge_concepts%rowtype;
  reviewed_at timestamptz := timezone('utc', now());
  next_interval integer;
  next_at timestamptz;
  next_confidence smallint;
begin
  if auth.uid() is not null and not public.has_required_assurance() then
    raise exception 'MFA required' using errcode = '42501';
  end if;
  if caller_id is null then raise exception 'Authentication required'; end if;
  if p_outcome not in ('again', 'hard', 'good', 'easy') then raise exception 'Invalid review outcome'; end if;
  if char_length(coalesce(p_recalled_answer, '')) > 5000 then raise exception 'Recall answer is too long'; end if;

  select * into concept from public.knowledge_concepts
  where id = p_concept_id and user_id = caller_id and archived_at is null for update;
  if not found then raise exception 'Knowledge concept not found'; end if;

  if p_outcome = 'again' then
    next_interval := 0;
    next_at := reviewed_at + interval '10 minutes';
    next_confidence := greatest(1, concept.confidence - 1);
  elsif p_outcome = 'hard' then
    next_interval := greatest(1, round(greatest(1, concept.interval_days) * 1.2)::integer);
    next_at := reviewed_at + make_interval(days => next_interval);
    next_confidence := concept.confidence;
  elsif p_outcome = 'good' then
    next_interval := greatest(3, round(greatest(1, concept.interval_days) * 2.2)::integer);
    next_at := reviewed_at + make_interval(days => next_interval);
    next_confidence := least(5, concept.confidence + 1);
  else
    next_interval := greatest(7, round(greatest(1, concept.interval_days) * 3.5)::integer);
    next_at := reviewed_at + make_interval(days => next_interval);
    next_confidence := least(5, concept.confidence + 2);
  end if;

  insert into public.knowledge_reviews(
    user_id, concept_id, outcome, recalled_answer, previous_interval_days,
    next_interval_days, reviewed_at, next_review_at
  ) values (
    caller_id, concept.id, p_outcome, nullif(btrim(p_recalled_answer), ''),
    concept.interval_days, next_interval, reviewed_at, next_at
  );

  update public.knowledge_concepts set
    confidence = next_confidence,
    review_count = review_count + 1,
    interval_days = next_interval,
    last_reviewed_at = reviewed_at,
    next_review_at = next_at
  where id = concept.id and user_id = caller_id;

  insert into public.activity_log(
    user_id, action, entity_type, entity_id, metadata, occurred_on, occurred_at,
    occurred_precision, module, title, description, source_href
  ) values (
    caller_id, 'knowledge_reviewed', 'knowledge_concepts', concept.id,
    jsonb_build_object('outcome', p_outcome, 'next_interval_days', next_interval),
    timezone('Asia/Manila', reviewed_at)::date, reviewed_at, 'timestamp', 'knowledge',
    concept.title, 'Recall rated ' || initcap(p_outcome), '/knowledge?highlight=' || concept.id
  );

  return query select next_at, next_interval, next_confidence;
end;
$$;

create or replace function public.reserve_ai_capture_request()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  requesting_user uuid := (select auth.uid());
  reservation_time timestamptz := now();
begin
  if auth.uid() is not null and not public.has_required_assurance() then
    raise exception 'MFA required' using errcode = '42501';
  end if;
  if requesting_user is null then
    return false;
  end if;

  -- Serialize reservations across workers before checking user and site caps.
  perform pg_catalog.pg_advisory_xact_lock(6106, 1);

  if (select count(*) from public.ai_capture_requests
      where created_at >= reservation_time - interval '1 day') >= 300
     or (select count(*) from public.ai_capture_requests
      where user_id = requesting_user and created_at >= reservation_time - interval '1 hour') >= 10
     or (select count(*) from public.ai_capture_requests
      where user_id = requesting_user and created_at >= reservation_time - interval '1 day') >= 30 then
    return false;
  end if;

  insert into public.ai_capture_requests(user_id) values (requesting_user);
  return true;
end;
$$;

create or replace function public.reserve_ai_analyst_request(p_type text, p_model text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare requesting_user uuid := (select auth.uid()); request_id bigint; reservation_time timestamptz := now();
begin
  if auth.uid() is not null and not public.has_required_assurance() then
    raise exception 'MFA required' using errcode = '42501';
  end if;
  if requesting_user is null or p_type not in ('spending_change','debt_progress','task_focus','career_pipeline','goal_progress','weekly_review_trends','signals_summary')
    or p_model not in ('gpt-4o-mini-2024-07-18','gpt-4.1-mini','gpt-5.4-nano','gpt-5.4-mini','gpt-4o','gpt-5.4','gpt-6-astra','gpt-6-sol','gpt-6-luna') then return null; end if;
  perform pg_catalog.pg_advisory_xact_lock(6106, 2);
  if (select count(*) from public.ai_analyst_requests where user_id = requesting_user and created_at >= reservation_time - interval '1 hour') >= 8
    or (select count(*) from public.ai_analyst_requests where user_id = requesting_user and created_at >= reservation_time - interval '1 day') >= 25
    or (select count(*) from public.ai_analyst_requests where created_at >= reservation_time - interval '1 day') >= 300 then return null; end if;
  insert into public.ai_analyst_requests(user_id,analysis_type,model) values(requesting_user,p_type,p_model) returning id into request_id;
  return request_id;
end; $$;

create or replace function public.reserve_ai_analyst_request_result(p_type text, p_model text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  requesting_user uuid := (select auth.uid());
  request_id bigint;
  reservation_time timestamptz := now();
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

create or replace function public.finish_ai_analyst_request(p_id bigint, p_outcome text, p_input_tokens integer default null, p_output_tokens integer default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.has_required_assurance() then
    raise exception 'MFA required' using errcode = '42501';
  end if;
  if p_outcome not in ('success','insufficient','invalid_response','provider_error','timeout','context_limit','pool_exhausted','openai_auth_error','openai_model_access','openai_rate_limit','openai_invalid_request','openai_provider_error')
    or p_input_tokens < 0 or p_output_tokens < 0 then return; end if;
  update public.ai_analyst_requests set outcome = p_outcome, input_tokens = p_input_tokens, output_tokens = p_output_tokens
    where id = p_id and user_id = (select auth.uid()) and outcome = 'reserved';
end; $$;

create or replace function public.choose_career_followup(
  p_application_id uuid,
  p_expected_next_action_at timestamptz,
  p_expected_updated_at timestamptz,
  p_choice text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_application public.job_applications%rowtype;
  v_task_id uuid;
  v_existing text;
  v_today date := (now() at time zone 'Asia/Manila')::date;
begin
  if auth.uid() is not null and not public.has_required_assurance() then
    raise exception 'MFA required' using errcode = '42501';
  end if;
  if v_owner is null then return 'unauthorized'; end if;
  if p_choice not in ('dismissed', 'confirmed') or p_choice is null
    or p_application_id is null or p_expected_next_action_at is null
    or p_expected_updated_at is null then
    return 'invalid';
  end if;

  select * into v_application
    from public.job_applications
   where id = p_application_id and user_id = v_owner
   for update;
  if not found then return 'stale'; end if;
  if v_application.stage in ('rejected', 'withdrawn', 'accepted')
    or v_application.next_action_at is distinct from p_expected_next_action_at
    or v_application.updated_at is distinct from p_expected_updated_at
    or (v_application.next_action_at at time zone 'Asia/Manila')::date > v_today + 3 then
    return 'stale';
  end if;

  select choice into v_existing
    from public.next_best_action_choices
   where user_id = v_owner and application_id = p_application_id
     and expected_next_action_at = p_expected_next_action_at;
  if found then return 'already_' || v_existing; end if;

  if p_choice = 'dismissed' then
    insert into public.next_best_action_choices
      (user_id, application_id, expected_next_action_at, choice)
    values (v_owner, p_application_id, p_expected_next_action_at, 'dismissed');
    return 'dismissed';
  end if;

  insert into public.tasks
    (user_id, title, description, status, priority, scheduled_for, source_module)
  values (
    v_owner,
    left(coalesce(nullif(btrim(v_application.next_action), ''),
      'Follow up with ' || v_application.company_name), 160),
    'Follow-up for ' || v_application.company_name || ' application.',
    'planned', 'high',
    greatest(v_today, (v_application.next_action_at at time zone 'Asia/Manila')::date),
    'next_best_action'
  ) returning id into v_task_id;

  insert into public.next_best_action_choices
    (user_id, application_id, expected_next_action_at, choice, task_id)
  values (v_owner, p_application_id, p_expected_next_action_at,
    'confirmed', v_task_id);
  return 'confirmed';
end;
$$;

create or replace function public.claim_capture_preview(p_id uuid, p_operation text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_preview public.capture_batch_previews%rowtype;
begin
  if auth.uid() is not null and not public.has_required_assurance() then
    raise exception 'MFA required' using errcode = '42501';
  end if;
  if auth.uid() is null or p_id is null then return null; end if;
  update public.capture_batch_previews
     set status = 'processing'
   where id = p_id and user_id = auth.uid() and status = 'pending'
     and operation = p_operation and expires_at > now()
  returning * into v_preview;
  if not found then return null; end if;
  return pg_catalog.jsonb_build_object(
    'operation', v_preview.operation,
    'proposal', v_preview.proposal,
    'targetId', v_preview.target_id,
    'targetUpdatedAt', v_preview.target_updated_at
  );
end;
$$;

create or replace function public.finish_capture_preview(
  p_id uuid, p_status text, p_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.has_required_assurance() then
    raise exception 'MFA required' using errcode = '42501';
  end if;
  if auth.uid() is null or p_status not in ('saved', 'failed', 'rejected')
    or p_message is null or length(p_message) > 300 then return false; end if;
  update public.capture_batch_previews
     set status = p_status, result_message = p_message
   where id = p_id and user_id = auth.uid()
     and status = case when p_status = 'rejected' then 'pending' else 'processing' end;
  return found;
end;
$$;

create or replace function public.ai_pool_status()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'utc')::date;
begin
  if auth.uid() is not null and not public.has_required_assurance() then
    raise exception 'MFA required' using errcode = '42501';
  end if;
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
