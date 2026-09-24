-- Phase 12: version 1 metrics are recomputed from surviving owner records on every read.
-- No snapshot or materialized value can become stale after an edit or deletion.
-- Date-range scans and earliest surviving records use the same owner-first paths.
create index transactions_history_owner_type_date_idx
  on public.transactions(user_id, transaction_type, transaction_date);
create index tasks_history_owner_completed_idx
  on public.tasks(user_id, completed_at)
  where status = 'completed' and completed_at is not null;
create index weekly_reviews_history_owner_week_idx
  on public.weekly_reviews(user_id, week_start)
  where completed_at is not null and overall_score is not null;

create function public.atlas_historical_metrics(
  p_from date,
  p_through date,
  p_grain text
)
returns table (
  metric_key text,
  period_start date,
  period_end date,
  value numeric,
  source_count bigint,
  coverage text,
  first_recorded_on date
)
language plpgsql stable security invoker set search_path = '' as $$
declare
  today_manila date := timezone('Asia/Manila', now())::date;
  from_instant timestamptz := p_from::timestamp at time zone 'Asia/Manila';
  through_exclusive_instant timestamptz := (p_through + 1)::timestamp at time zone 'Asia/Manila';
begin
  if (select auth.uid()) is null
    or p_from is null or p_through is null or p_grain is null
    or p_grain not in ('day', 'week', 'month')
    or p_from > p_through or p_through > today_manila
    or p_from < today_manila - 365
    or (p_grain = 'day' and p_through - p_from > 89) then
    raise exception 'Invalid historical metrics request' using errcode = '22023';
  end if;

  return query
  with metric_names(metric_key) as (
    values ('income_centavos'), ('expense_centavos'), ('debt_payments_centavos'),
      ('task_completions'), ('knowledge_reviews'), ('review_overall_score')
  ), buckets as (
    select series.bucket_start::date as start_on,
      (series.bucket_start + case p_grain
        when 'day' then interval '1 day'
        when 'week' then interval '1 week'
        else interval '1 month' end - interval '1 day')::date as end_on
    from generate_series(
      date_trunc(p_grain, p_from::timestamp),
      date_trunc(p_grain, p_through::timestamp),
      case p_grain when 'day' then interval '1 day'
        when 'week' then interval '1 week' else interval '1 month' end
    ) series(bucket_start)
  ), first_dates(key, first_on) as (
    values
      ('income_centavos'::text, (
        select t.transaction_date from public.transactions t
        where t.user_id = (select auth.uid()) and t.transaction_type = 'income'
        order by t.transaction_date limit 1
      )),
      ('expense_centavos'::text, (
        select t.transaction_date from public.transactions t
        where t.user_id = (select auth.uid()) and t.transaction_type = 'expense'
        order by t.transaction_date limit 1
      )),
      ('debt_payments_centavos'::text, (
        select d.payment_date from public.debt_payments d
        where d.user_id = (select auth.uid())
        order by d.payment_date limit 1
      )),
      ('task_completions'::text, (
        select timezone('Asia/Manila', t.completed_at)::date from public.tasks t
        where t.user_id = (select auth.uid()) and t.status = 'completed'
          and t.completed_at is not null
        order by t.completed_at limit 1
      )),
      ('knowledge_reviews'::text, (
        select timezone('Asia/Manila', k.reviewed_at)::date from public.knowledge_reviews k
        where k.user_id = (select auth.uid())
        order by k.reviewed_at limit 1
      )),
      ('review_overall_score'::text, (
        select w.week_start from public.weekly_reviews w
        where w.user_id = (select auth.uid())
          and w.completed_at is not null and w.overall_score is not null
        order by w.week_start limit 1
      ))
  ), source_events as (
    select 'income_centavos'::text as key,
      t.transaction_date as occurred_on, t.amount_centavos::numeric as amount
    from public.transactions t
    where t.user_id = (select auth.uid()) and t.transaction_type = 'income'
      and t.transaction_date between p_from and p_through
    union all
    select 'expense_centavos', t.transaction_date, t.amount_centavos::numeric
    from public.transactions t
    where t.user_id = (select auth.uid()) and t.transaction_type = 'expense'
      and t.transaction_date between p_from and p_through
    union all
    select 'debt_payments_centavos', d.payment_date, d.amount_centavos::numeric
    from public.debt_payments d
    where d.user_id = (select auth.uid())
      and d.payment_date between p_from and p_through
    union all
    select 'task_completions', timezone('Asia/Manila', t.completed_at)::date, 1::numeric
    from public.tasks t where t.user_id = (select auth.uid())
      and t.status = 'completed' and t.completed_at is not null
      and t.completed_at >= from_instant
      and t.completed_at < through_exclusive_instant
    union all
    select 'knowledge_reviews', timezone('Asia/Manila', k.reviewed_at)::date, 1::numeric
    from public.knowledge_reviews k where k.user_id = (select auth.uid())
      and k.reviewed_at >= from_instant
      and k.reviewed_at < through_exclusive_instant
    union all
    select 'review_overall_score', w.week_start, w.overall_score::numeric
    from public.weekly_reviews w where w.user_id = (select auth.uid())
      and w.completed_at is not null and w.overall_score is not null
      and w.week_start between p_from and p_through
  ), totals as (
    select e.key, date_trunc(p_grain, e.occurred_on::timestamp)::date as start_on,
      count(*)::bigint as count_rows,
      sum(e.amount) as total, avg(e.amount) as average
    from source_events e
    group by 1, 2
  )
  select m.metric_key, b.start_on, b.end_on,
    case when f.first_on is null or f.first_on > least(b.end_on, p_through)
      then null::numeric
      when m.metric_key = 'review_overall_score' then round(t.average, 2)
      else coalesce(t.total, 0::numeric) end as value,
    coalesce(t.count_rows, 0::bigint) as source_count,
    case when f.first_on is null or f.first_on > least(b.end_on, p_through)
      then 'insufficient'
      when m.metric_key = 'review_overall_score' and t.count_rows is null
      then 'insufficient'
      when b.start_on < p_from or b.end_on > p_through
        or b.end_on >= today_manila or f.first_on > b.start_on
      then 'partial'
      else 'recorded' end as coverage,
    f.first_on as first_recorded_on
  from metric_names m cross join buckets b
  left join first_dates f on f.key = m.metric_key
  left join totals t on t.key = m.metric_key and t.start_on = b.start_on
  order by m.metric_key, b.start_on;
end;
$$;

revoke all on function public.atlas_historical_metrics(date,date,text) from public, anon;
grant execute on function public.atlas_historical_metrics(date,date,text) to authenticated;

-- Completed reviews are a Phase 12 source. The legacy shared Timeline trigger
-- references task-only fields before reaching its review branch, so isolate the
-- review writer while retaining its original one-time completion behavior.
create function private.record_completed_review_timeline_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.completed_at is null then return new; end if;
  if tg_op = 'UPDATE' then
    if old.completed_at is not null then return new; end if;
  end if;
  perform private.upsert_timeline_activity(
    new.user_id, 'weekly_review_submitted', 'weekly_reviews', new.id,
    timezone('Asia/Manila', new.completed_at)::date, new.completed_at,
    'timestamp', 'reviews', 'Week of ' || new.week_start::text,
    coalesce(new.next_week_focus, new.wins, 'Weekly review submitted'),
    null, null,
    case when new.overall_score is null then null else 'Overall score' end,
    case when new.overall_score is null then null else new.overall_score::text end,
    '/reviews?view=archive&highlight=' || new.id,
    'review:' || new.id, '{}'::jsonb
  );
  return new;
end;
$$;
revoke all on function private.record_completed_review_timeline_activity() from public;
drop trigger reviews_timeline_activity on public.weekly_reviews;
create trigger reviews_timeline_activity
after insert or update of completed_at on public.weekly_reviews
for each row execute function private.record_completed_review_timeline_activity();
