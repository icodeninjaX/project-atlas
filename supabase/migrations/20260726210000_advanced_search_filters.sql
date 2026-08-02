drop function if exists public.search_atlas(text, integer);

create or replace function public.search_atlas(
  p_query text,
  p_limit integer default 40,
  p_entity_type text default 'all',
  p_status text default 'all',
  p_from_date date default null,
  p_to_date date default null
)
returns table (
  entity_type text,
  entity_id uuid,
  title text,
  subtitle text,
  occurred_at timestamptz,
  entity_path text,
  entity_status text
)
language sql stable security invoker set search_path = ''
as $$
  select result.entity_type, result.entity_id, result.title, result.subtitle,
    result.occurred_at, result.entity_path, result.entity_status
  from (
    select 'Tasks'::text entity_type, t.id entity_id, t.title,
      coalesce(t.description, t.status) subtitle, t.updated_at occurred_at,
      '/tasks?highlight=' || t.id entity_path, t.status entity_status
    from public.tasks t where t.user_id = (select auth.uid())
      and (t.title ilike '%' || p_query || '%' or coalesce(t.description, '') ilike '%' || p_query || '%')
    union all
    select 'Goals', g.id, g.title, coalesce(g.description, g.area), g.updated_at,
      '/goals?highlight=' || g.id, g.status from public.goals g
    where g.user_id = (select auth.uid()) and (g.title ilike '%' || p_query || '%' or coalesce(g.description, '') ilike '%' || p_query || '%')
    union all
    select 'Debts', d.id, d.creditor_name, d.debt_type, d.updated_at,
      '/debts?highlight=' || d.id, d.status from public.debts d
    where d.user_id = (select auth.uid()) and d.creditor_name ilike '%' || p_query || '%'
    union all
    select 'Transactions', t.id, coalesce(t.merchant_or_source, 'Transaction'),
      coalesce(t.description, t.transaction_type), t.updated_at,
      '/money/transactions?highlight=' || t.id, t.transaction_type from public.transactions t
    where t.user_id = (select auth.uid()) and (coalesce(t.merchant_or_source, '') ilike '%' || p_query || '%' or coalesce(t.description, '') ilike '%' || p_query || '%')
    union all
    select 'Career', j.id, j.company_name || ' · ' || j.role_title,
      coalesce(j.next_action, j.stage), j.updated_at, '/career?highlight=' || j.id, j.stage
    from public.job_applications j where j.user_id = (select auth.uid())
      and (j.company_name ilike '%' || p_query || '%' or j.role_title ilike '%' || p_query || '%' or coalesce(j.notes, '') ilike '%' || p_query || '%')
    union all
    select 'Reviews', w.id, 'Week of ' || w.week_start::text,
      coalesce(w.next_week_focus, w.wins, 'Weekly review'), w.updated_at,
      '/reviews?highlight=' || w.id, 'submitted'::text from public.weekly_reviews w
    where w.user_id = (select auth.uid()) and concat_ws(' ', w.wins, w.challenges, w.lessons, w.next_week_focus) ilike '%' || p_query || '%'
  ) result
  where (lower(p_entity_type) = 'all' or lower(result.entity_type) = lower(p_entity_type))
    and (p_from_date is null or result.occurred_at >= p_from_date::timestamptz)
    and (p_to_date is null or result.occurred_at < (p_to_date + 1)::timestamptz)
    and (lower(p_status) = 'all' or lower(result.entity_status) = lower(p_status)
      or (lower(p_status) = 'open' and lower(result.entity_status) not in ('completed','cancelled','paid','rejected','withdrawn','accepted','abandoned')))
  order by result.occurred_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function public.search_atlas(text, integer, text, text, date, date) from public, anon;
grant execute on function public.search_atlas(text, integer, text, text, date, date) to authenticated;
