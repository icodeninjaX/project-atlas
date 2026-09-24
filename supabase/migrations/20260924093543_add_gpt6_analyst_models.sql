-- Extend Analyst's server-validated model choices without changing its quotas.
create or replace function public.reserve_ai_analyst_request(p_type text, p_model text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare requesting_user uuid := (select auth.uid()); request_id bigint; reservation_time timestamptz := now();
begin
  if requesting_user is null or p_type not in ('spending_change','debt_progress','task_focus','career_pipeline','goal_progress','weekly_review_trends','signals_summary')
    or p_model not in ('gpt-4o-mini-2024-07-18','gpt-4.1-mini','gpt-5.4-nano','gpt-5.4-mini','gpt-4o','gpt-5.4','gpt-6-astra','gpt-6-sol','gpt-6-luna') then return null; end if;
  perform pg_catalog.pg_advisory_xact_lock(6106, 2);
  if (select count(*) from public.ai_analyst_requests where user_id = requesting_user and created_at >= reservation_time - interval '1 hour') >= 8
    or (select count(*) from public.ai_analyst_requests where user_id = requesting_user and created_at >= reservation_time - interval '1 day') >= 25
    or (select count(*) from public.ai_analyst_requests where created_at >= reservation_time - interval '1 day') >= 300 then return null; end if;
  insert into public.ai_analyst_requests(user_id,analysis_type,model) values(requesting_user,p_type,p_model) returning id into request_id;
  return request_id;
end; $$;
revoke all on function public.reserve_ai_analyst_request(text,text) from public,anon;
grant execute on function public.reserve_ai_analyst_request(text,text) to authenticated;
