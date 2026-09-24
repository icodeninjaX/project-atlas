-- Count freeform analysis against the existing Analyst allowance.
alter table public.ai_analyst_requests
  drop constraint ai_analyst_requests_analysis_type_check;
alter table public.ai_analyst_requests
  add constraint ai_analyst_requests_analysis_type_check check (analysis_type in (
    'spending_change','debt_progress','task_focus','career_pipeline',
    'goal_progress','weekly_review_trends','signals_summary','freeform'
  ));

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
  if p_model is null or p_model not in ('gpt-4o-mini-2024-07-18','gpt-4.1-mini','gpt-5.4-nano','gpt-5.4-mini','gpt-4o','gpt-5.4','gpt-6-astra','gpt-6-sol','gpt-6-luna') then
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
