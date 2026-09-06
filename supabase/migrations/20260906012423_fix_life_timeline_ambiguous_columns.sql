-- Qualify the timeline projection so PL/pgSQL does not confuse result-column
-- variables with columns from the scoped CTE.
create or replace function public.life_timeline(
  p_query text default null,
  p_module text default null,
  p_from_date date default null,
  p_to_date date default null,
  p_before_on date default null,
  p_before_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 31
)
returns table (
  event_id uuid,
  occurred_on date,
  occurred_at timestamptz,
  occurred_precision text,
  module text,
  event_type text,
  title text,
  description text,
  amount_centavos bigint,
  amount_direction text,
  metric_label text,
  metric_value text,
  source_href text,
  source_available boolean
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  normalized_query text := nullif(btrim(p_query), '');
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if p_module is not null and p_module not in ('money', 'debt', 'tasks', 'goals', 'career', 'reviews') then
    raise exception 'Invalid timeline module';
  end if;
  if p_limit < 1 or p_limit > 51 then raise exception 'Invalid timeline limit'; end if;
  if normalized_query is not null and char_length(normalized_query) > 120 then
    raise exception 'Timeline search is too long';
  end if;
  if p_from_date is not null and p_to_date is not null and p_from_date > p_to_date then
    raise exception 'Timeline date range is invalid';
  end if;
  if (p_before_on is null) <> (p_before_at is null)
    or (p_before_on is null) <> (p_before_id is null) then
    raise exception 'Timeline cursor is incomplete';
  end if;

  return query
  with scoped as (
    select
      activity.*,
      case activity.entity_type
        when 'transactions' then exists (
          select 1 from public.transactions source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'account_transfers' then exists (
          select 1 from public.account_transfers source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'debt_payments' then exists (
          select 1 from public.debt_payments source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'tasks' then exists (
          select 1 from public.tasks source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'goals' then exists (
          select 1 from public.goals source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'goal_milestones' then exists (
          select 1 from public.goal_milestones source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'job_applications' then exists (
          select 1 from public.job_applications source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        when 'weekly_reviews' then exists (
          select 1 from public.weekly_reviews source
          where source.id = activity.entity_id and source.user_id = caller_id
        )
        else false
      end as source_available
    from public.activity_log as activity
    where activity.user_id = caller_id
      and activity.module in ('money', 'debt', 'tasks', 'goals', 'career', 'reviews')
      and (p_module is null or activity.module = p_module)
      and (p_from_date is null or activity.occurred_on >= p_from_date)
      and (p_to_date is null or activity.occurred_on <= p_to_date)
      and (normalized_query is null or concat_ws(' ', activity.title, activity.description) ilike '%' || normalized_query || '%')
      and (p_before_on is null or (activity.occurred_on, activity.occurred_at, activity.id) < (p_before_on, p_before_at, p_before_id))
  )
  select
    scoped.id,
    scoped.occurred_on,
    scoped.occurred_at,
    scoped.occurred_precision,
    scoped.module,
    scoped.action,
    scoped.title,
    scoped.description,
    scoped.amount_centavos,
    scoped.amount_direction,
    scoped.metric_label,
    scoped.metric_value,
    case when scoped.source_available then scoped.source_href else null end,
    scoped.source_available
  from scoped
  order by scoped.occurred_on desc, scoped.occurred_at desc, scoped.id desc
  limit p_limit;
end;
$$;
