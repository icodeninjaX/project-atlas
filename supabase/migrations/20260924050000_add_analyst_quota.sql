-- Separate, durable Analyst allowance and minimal audit metadata. No prompts or evidence.
create table public.ai_analyst_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_type text not null check (analysis_type in ('spending_change','debt_progress','task_focus','career_pipeline','goal_progress','weekly_review_trends','signals_summary')),
  model text not null,
  created_at timestamptz not null default now(),
  outcome text not null default 'reserved' check (outcome in ('reserved','success','insufficient','invalid_response','provider_error','timeout')),
  input_tokens integer check (input_tokens >= 0),
  output_tokens integer check (output_tokens >= 0)
);
create index ai_analyst_requests_owner_time_idx on public.ai_analyst_requests(user_id, created_at desc);
alter table public.ai_analyst_requests enable row level security;
revoke all on public.ai_analyst_requests from anon, authenticated;

create function public.reserve_ai_analyst_request(p_type text, p_model text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare requesting_user uuid := (select auth.uid()); request_id bigint; reservation_time timestamptz := now();
begin
  if requesting_user is null or p_type not in ('spending_change','debt_progress','task_focus','career_pipeline','goal_progress','weekly_review_trends','signals_summary')
    or p_model not in ('gpt-4o-mini-2024-07-18','gpt-4.1-mini') then return null; end if;
  perform pg_catalog.pg_advisory_xact_lock(6106, 2);
  if (select count(*) from public.ai_analyst_requests where user_id = requesting_user and created_at >= reservation_time - interval '1 hour') >= 8
    or (select count(*) from public.ai_analyst_requests where user_id = requesting_user and created_at >= reservation_time - interval '1 day') >= 25
    or (select count(*) from public.ai_analyst_requests where created_at >= reservation_time - interval '1 day') >= 300 then return null; end if;
  insert into public.ai_analyst_requests(user_id,analysis_type,model) values(requesting_user,p_type,p_model) returning id into request_id;
  return request_id;
end; $$;
revoke all on function public.reserve_ai_analyst_request(text,text) from public,anon;
grant execute on function public.reserve_ai_analyst_request(text,text) to authenticated;

create function public.finish_ai_analyst_request(p_id bigint, p_outcome text, p_input_tokens integer default null, p_output_tokens integer default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_outcome not in ('success','insufficient','invalid_response','provider_error','timeout')
    or p_input_tokens < 0 or p_output_tokens < 0 then return; end if;
  update public.ai_analyst_requests set outcome = p_outcome, input_tokens = p_input_tokens, output_tokens = p_output_tokens
    where id = p_id and user_id = (select auth.uid()) and outcome = 'reserved';
end; $$;
revoke all on function public.finish_ai_analyst_request(bigint,text,integer,integer) from public,anon;
grant execute on function public.finish_ai_analyst_request(bigint,text,integer,integer) to authenticated;
