-- Phase 4: turn the existing activity log into the durable, normalized source
-- for the Life Timeline. Source records remain authoritative while they exist;
-- their safe presentation snapshot survives later deletion.

alter table public.activity_log
  add column if not exists occurred_on date,
  add column if not exists occurred_at timestamptz,
  add column if not exists occurred_precision text,
  add column if not exists module text,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists amount_centavos bigint,
  add column if not exists amount_direction text,
  add column if not exists metric_label text,
  add column if not exists metric_value text,
  add column if not exists source_href text,
  add column if not exists source_key text;

alter table public.activity_log
  drop constraint if exists activity_log_occurred_precision_check,
  drop constraint if exists activity_log_amount_centavos_check,
  drop constraint if exists activity_log_amount_direction_check;

alter table public.activity_log
  add constraint activity_log_occurred_precision_check
    check (occurred_precision in ('date', 'timestamp')) not valid,
  add constraint activity_log_amount_centavos_check
    check (amount_centavos is null or amount_centavos >= 0) not valid,
  add constraint activity_log_amount_direction_check
    check (amount_direction is null or amount_direction in ('inflow', 'outflow', 'neutral')) not valid;

-- Existing activity remains valid audit history. Give every old row a safe,
-- useful default before enriching records that still have a live source.
update public.activity_log
set
  occurred_on = coalesce(occurred_on, timezone('Asia/Manila', created_at)::date),
  occurred_at = coalesce(occurred_at, created_at),
  occurred_precision = coalesce(occurred_precision, 'timestamp'),
  module = coalesce(
    module,
    case entity_type
      when 'tasks' then 'tasks'
      when 'debt_payments' then 'debt'
      when 'job_applications' then 'career'
      when 'goals' then 'goals'
      when 'weekly_reviews' then 'reviews'
      else 'system'
    end
  ),
  title = coalesce(
    title,
    initcap(replace(coalesce(action, 'Activity'), '_', ' '))
  );

update public.activity_log as activity
set
  occurred_on = timezone('Asia/Manila', coalesce(task.completed_at, activity.created_at))::date,
  occurred_at = coalesce(task.completed_at, activity.created_at),
  occurred_precision = 'timestamp',
  title = task.title,
  description = coalesce(task.description, 'Task completed'),
  source_href = '/tasks?view=completed&highlight=' || task.id
from public.tasks as task
where activity.entity_type = 'tasks'
  and activity.entity_id = task.id
  and activity.user_id = task.user_id;

update public.activity_log as activity
set
  occurred_on = payment.payment_date,
  occurred_at = activity.created_at,
  occurred_precision = 'date',
  module = 'debt',
  title = 'Payment to ' || debt.creditor_name,
  description = coalesce(payment.notes, 'Debt payment recorded'),
  amount_centavos = payment.amount_centavos,
  amount_direction = 'outflow',
  source_href = '/debts/' || payment.debt_id || '?highlightPayment=' || payment.id,
  source_key = coalesce(activity.source_key, 'debt-payment:' || payment.id),
  metadata = activity.metadata || jsonb_build_object('debt_id', payment.debt_id)
from public.debt_payments as payment
join public.debts as debt
  on debt.id = payment.debt_id and debt.user_id = payment.user_id
where activity.entity_type = 'debt_payments'
  and activity.entity_id = payment.id
  and activity.user_id = payment.user_id;

update public.activity_log as activity
set
  title = application.company_name || ' · ' || application.role_title,
  description = case
    when activity.action = 'job_stage_changed' then
      concat_ws(' → ', activity.metadata ->> 'from', activity.metadata ->> 'to')
    else coalesce(application.stage, 'Career application')
  end,
  source_href = '/career?view=table&highlight=' || application.id
from public.job_applications as application
where activity.entity_type = 'job_applications'
  and activity.entity_id = application.id
  and activity.user_id = application.user_id;

update public.activity_log as activity
set
  title = goal.title,
  description = coalesce(goal.success_definition, 'Goal completed'),
  source_href = '/goals?highlight=' || goal.id
from public.goals as goal
where activity.entity_type = 'goals'
  and activity.entity_id = goal.id
  and activity.user_id = goal.user_id;

update public.activity_log as activity
set
  occurred_on = timezone('Asia/Manila', coalesce(review.completed_at, activity.created_at))::date,
  occurred_at = coalesce(review.completed_at, activity.created_at),
  title = 'Week of ' || review.week_start::text,
  description = coalesce(review.next_week_focus, review.wins, 'Weekly review submitted'),
  metric_label = case when review.overall_score is null then null else 'Overall score' end,
  metric_value = case when review.overall_score is null then null else review.overall_score::text end,
  source_href = '/reviews?view=archive&highlight=' || review.id
from public.weekly_reviews as review
where activity.entity_type = 'weekly_reviews'
  and activity.entity_id = review.id
  and activity.user_id = review.user_id;

alter table public.activity_log
  alter column occurred_on set not null,
  alter column occurred_at set not null,
  alter column occurred_precision set not null,
  alter column module set not null,
  alter column title set not null;

alter table public.activity_log
  validate constraint activity_log_occurred_precision_check,
  validate constraint activity_log_amount_centavos_check,
  validate constraint activity_log_amount_direction_check;

create unique index if not exists activity_log_source_key_idx
  on public.activity_log(user_id, source_key)
  where source_key is not null;

create index if not exists activity_log_timeline_cursor_idx
  on public.activity_log(user_id, occurred_on desc, occurred_at desc, id desc);

create index if not exists activity_log_timeline_module_idx
  on public.activity_log(user_id, module, occurred_on desc, occurred_at desc, id desc);

create index if not exists activity_log_timeline_search_idx
  on public.activity_log using gin
  ((coalesce(title, '') || ' ' || coalesce(description, '')) extensions.gin_trgm_ops);

create or replace function private.upsert_timeline_activity(
  p_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_occurred_on date,
  p_occurred_at timestamptz,
  p_occurred_precision text,
  p_module text,
  p_title text,
  p_description text,
  p_amount_centavos bigint,
  p_amount_direction text,
  p_metric_label text,
  p_metric_value text,
  p_source_href text,
  p_source_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null or p_entity_id is null or p_occurred_on is null
    or p_occurred_at is null or p_title is null then
    raise exception 'Timeline activity requires owner, source, occurrence, and title';
  end if;

  if p_source_key is null then
    insert into public.activity_log(
      user_id, action, entity_type, entity_id, metadata,
      occurred_on, occurred_at, occurred_precision, module, title, description,
      amount_centavos, amount_direction, metric_label, metric_value, source_href
    ) values (
      p_user_id, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb),
      p_occurred_on, p_occurred_at, p_occurred_precision, p_module, p_title, p_description,
      p_amount_centavos, p_amount_direction, p_metric_label, p_metric_value, p_source_href
    );
    return;
  end if;

  insert into public.activity_log(
    user_id, action, entity_type, entity_id, metadata,
    occurred_on, occurred_at, occurred_precision, module, title, description,
    amount_centavos, amount_direction, metric_label, metric_value, source_href, source_key
  ) values (
    p_user_id, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb),
    p_occurred_on, p_occurred_at, p_occurred_precision, p_module, p_title, p_description,
    p_amount_centavos, p_amount_direction, p_metric_label, p_metric_value, p_source_href, p_source_key
  )
  on conflict (user_id, source_key) where source_key is not null do update
  set
    action = excluded.action,
    entity_type = excluded.entity_type,
    entity_id = excluded.entity_id,
    metadata = excluded.metadata,
    occurred_on = excluded.occurred_on,
    occurred_at = excluded.occurred_at,
    occurred_precision = excluded.occurred_precision,
    module = excluded.module,
    title = excluded.title,
    description = excluded.description,
    amount_centavos = excluded.amount_centavos,
    amount_direction = excluded.amount_direction,
    metric_label = excluded.metric_label,
    metric_value = excluded.metric_value,
    source_href = excluded.source_href;
end;
$$;

create or replace function private.record_timeline_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_name text;
  category_name text;
  source_name text;
  destination_name text;
  debt_name text;
  goal_name text;
  occurrence_at timestamptz;
begin
  if tg_table_name = 'transactions' then
    select account.name, category.name
      into account_name, category_name
      from public.financial_accounts as account
      join public.transaction_categories as category
        on category.id = new.category_id and category.user_id = new.user_id
      where account.id = new.account_id and account.user_id = new.user_id;

    perform private.upsert_timeline_activity(
      new.user_id,
      case when new.transaction_type = 'income' then 'income_recorded' else 'expense_recorded' end,
      'transactions', new.id, new.transaction_date, new.created_at, 'date', 'money',
      coalesce(new.merchant_or_source, category_name, initcap(new.transaction_type)),
      concat_ws(' · ', category_name, account_name, new.description),
      new.amount_centavos,
      case when new.transaction_type = 'income' then 'inflow' else 'outflow' end,
      null, null,
      '/money/transactions?view=history&highlight=' || new.id,
      'transaction:' || new.id,
      jsonb_build_object('account_id', new.account_id, 'category_id', new.category_id)
    );
    return new;
  end if;

  if tg_table_name = 'account_transfers' then
    select source.name, destination.name
      into source_name, destination_name
      from public.financial_accounts as source
      join public.financial_accounts as destination
        on destination.id = new.destination_account_id and destination.user_id = new.user_id
      where source.id = new.source_account_id and source.user_id = new.user_id;

    perform private.upsert_timeline_activity(
      new.user_id, 'transfer_recorded', 'account_transfers', new.id,
      new.transfer_date, new.created_at, 'date', 'money',
      coalesce(source_name, 'Account') || ' → ' || coalesce(destination_name, 'Account'),
      coalesce(new.description, 'Transfer between accounts'), new.amount_centavos, 'neutral',
      null, null, '/money/transfers?highlight=' || new.id, 'transfer:' || new.id,
      jsonb_build_object('source_account_id', new.source_account_id, 'destination_account_id', new.destination_account_id)
    );
    return new;
  end if;

  if tg_table_name = 'debt_payments' then
    select creditor_name into debt_name
      from public.debts
      where id = new.debt_id and user_id = new.user_id;

    perform private.upsert_timeline_activity(
      new.user_id, 'debt_payment_recorded', 'debt_payments', new.id,
      new.payment_date, new.created_at, 'date', 'debt',
      'Payment to ' || coalesce(debt_name, 'debt'),
      coalesce(new.notes, 'Debt payment recorded'), new.amount_centavos, 'outflow',
      null, null, '/debts/' || new.debt_id || '?highlightPayment=' || new.id,
      'debt-payment:' || new.id, jsonb_build_object('debt_id', new.debt_id, 'transaction_id', new.transaction_id)
    );
    return new;
  end if;

  if tg_table_name = 'tasks' and tg_op = 'UPDATE'
    and new.status = 'completed' and old.status <> 'completed' then
    occurrence_at := coalesce(new.completed_at, timezone('utc', now()));
    perform private.upsert_timeline_activity(
      new.user_id, 'task_completed', 'tasks', new.id,
      timezone('Asia/Manila', occurrence_at)::date, occurrence_at, 'timestamp', 'tasks',
      new.title, coalesce(new.description, 'Task completed'), null, null,
      null, null, '/tasks?view=completed&highlight=' || new.id, null, '{}'::jsonb
    );
    return new;
  end if;

  if tg_table_name = 'goal_milestones' and tg_op = 'UPDATE'
    and new.completed_at is not null and old.completed_at is null then
    select title into goal_name from public.goals where id = new.goal_id and user_id = new.user_id;
    perform private.upsert_timeline_activity(
      new.user_id, 'goal_milestone_completed', 'goal_milestones', new.id,
      timezone('Asia/Manila', new.completed_at)::date, new.completed_at, 'timestamp', 'goals',
      new.title, 'Milestone for ' || coalesce(goal_name, 'goal'), null, null,
      null, null, '/goals?highlight=' || new.goal_id || '&milestone=' || new.id,
      null, jsonb_build_object('goal_id', new.goal_id)
    );
    return new;
  end if;

  if tg_table_name = 'job_applications' then
    perform private.upsert_timeline_activity(
      new.user_id, 'career_application_added', 'job_applications', new.id,
      timezone('Asia/Manila', new.created_at)::date, new.created_at, 'timestamp', 'career',
      new.company_name || ' · ' || new.role_title, 'Stage: ' || replace(new.stage, '_', ' '),
      null, null, null, null, '/career?view=table&highlight=' || new.id,
      'application:' || new.id, jsonb_build_object('stage', new.stage)
    );
    if tg_op = 'UPDATE' and new.stage <> old.stage then
      perform private.upsert_timeline_activity(
        new.user_id, 'job_stage_changed', 'job_applications', new.id,
        timezone('Asia/Manila', timezone('utc', now()))::date, timezone('utc', now()), 'timestamp', 'career',
        new.company_name || ' · ' || new.role_title,
        'Stage: ' || replace(old.stage, '_', ' ') || ' → ' || replace(new.stage, '_', ' '),
        null, null, null, null, '/career?view=table&highlight=' || new.id,
        null, jsonb_build_object('from', old.stage, 'to', new.stage)
      );
    end if;
    return new;
  end if;

  if tg_table_name = 'goals' and tg_op = 'UPDATE'
    and new.status = 'completed' and old.status <> 'completed' then
    occurrence_at := timezone('utc', now());
    perform private.upsert_timeline_activity(
      new.user_id, 'goal_completed', 'goals', new.id,
      timezone('Asia/Manila', occurrence_at)::date, occurrence_at, 'timestamp', 'goals',
      new.title, coalesce(new.success_definition, 'Goal completed'), null, null,
      'Progress', '100%', '/goals?highlight=' || new.id, null, '{}'::jsonb
    );
    return new;
  end if;

  if tg_table_name = 'weekly_reviews'
    and new.completed_at is not null
    and (tg_op = 'INSERT' or old.completed_at is null) then
    perform private.upsert_timeline_activity(
      new.user_id, 'weekly_review_submitted', 'weekly_reviews', new.id,
      timezone('Asia/Manila', new.completed_at)::date, new.completed_at, 'timestamp', 'reviews',
      'Week of ' || new.week_start::text,
      coalesce(new.next_week_focus, new.wins, 'Weekly review submitted'), null, null,
      case when new.overall_score is null then null else 'Overall score' end,
      case when new.overall_score is null then null else new.overall_score::text end,
      '/reviews?view=archive&highlight=' || new.id, 'review:' || new.id, '{}'::jsonb
    );
    return new;
  end if;

  return new;
end;
$$;

-- Retire the older narrow trigger in favour of the normalized writer.
drop trigger if exists tasks_activity on public.tasks;
drop trigger if exists debt_payments_activity on public.debt_payments;
drop trigger if exists applications_activity on public.job_applications;
drop trigger if exists goals_activity on public.goals;
drop trigger if exists reviews_activity on public.weekly_reviews;

create trigger transactions_timeline_activity
after insert or update of account_id, category_id, transaction_type, amount_centavos, transaction_date, merchant_or_source, description
on public.transactions for each row execute function private.record_timeline_activity();

create trigger transfers_timeline_activity
after insert or update of source_account_id, destination_account_id, amount_centavos, transfer_date, description
on public.account_transfers for each row execute function private.record_timeline_activity();

create trigger debt_payments_timeline_activity
after insert or update of debt_id, amount_centavos, payment_date, transaction_id, notes
on public.debt_payments for each row execute function private.record_timeline_activity();

create trigger tasks_timeline_activity
after update of status on public.tasks for each row execute function private.record_timeline_activity();

create trigger milestones_timeline_activity
after update of completed_at on public.goal_milestones for each row execute function private.record_timeline_activity();

create trigger applications_timeline_activity
after insert or update of company_name, role_title, stage
on public.job_applications for each row execute function private.record_timeline_activity();

create trigger goals_timeline_activity
after update of status on public.goals for each row execute function private.record_timeline_activity();

create trigger reviews_timeline_activity
after insert or update of completed_at on public.weekly_reviews for each row execute function private.record_timeline_activity();

-- Backfill records which the earlier activity trigger never captured.
select private.upsert_timeline_activity(
  transaction.user_id,
  case when transaction.transaction_type = 'income' then 'income_recorded' else 'expense_recorded' end,
  'transactions', transaction.id, transaction.transaction_date, transaction.created_at, 'date', 'money',
  coalesce(transaction.merchant_or_source, category.name, initcap(transaction.transaction_type)),
  concat_ws(' · ', category.name, account.name, transaction.description), transaction.amount_centavos,
  case when transaction.transaction_type = 'income' then 'inflow' else 'outflow' end,
  null, null, '/money/transactions?view=history&highlight=' || transaction.id,
  'transaction:' || transaction.id,
  jsonb_build_object('account_id', transaction.account_id, 'category_id', transaction.category_id)
)
from public.transactions as transaction
join public.financial_accounts as account on account.id = transaction.account_id and account.user_id = transaction.user_id
join public.transaction_categories as category on category.id = transaction.category_id and category.user_id = transaction.user_id;

select private.upsert_timeline_activity(
  transfer.user_id, 'transfer_recorded', 'account_transfers', transfer.id,
  transfer.transfer_date, transfer.created_at, 'date', 'money',
  source.name || ' → ' || destination.name, coalesce(transfer.description, 'Transfer between accounts'),
  transfer.amount_centavos, 'neutral', null, null, '/money/transfers?highlight=' || transfer.id,
  'transfer:' || transfer.id,
  jsonb_build_object('source_account_id', transfer.source_account_id, 'destination_account_id', transfer.destination_account_id)
)
from public.account_transfers as transfer
join public.financial_accounts as source on source.id = transfer.source_account_id and source.user_id = transfer.user_id
join public.financial_accounts as destination on destination.id = transfer.destination_account_id and destination.user_id = transfer.user_id;

select private.upsert_timeline_activity(
  payment.user_id, 'debt_payment_recorded', 'debt_payments', payment.id,
  payment.payment_date, payment.created_at, 'date', 'debt', 'Payment to ' || debt.creditor_name,
  coalesce(payment.notes, 'Debt payment recorded'), payment.amount_centavos, 'outflow',
  null, null, '/debts/' || payment.debt_id || '?highlightPayment=' || payment.id,
  'debt-payment:' || payment.id,
  jsonb_build_object('debt_id', payment.debt_id, 'transaction_id', payment.transaction_id)
)
from public.debt_payments as payment
join public.debts as debt on debt.id = payment.debt_id and debt.user_id = payment.user_id;

select private.upsert_timeline_activity(
  milestone.user_id, 'goal_milestone_completed', 'goal_milestones', milestone.id,
  timezone('Asia/Manila', milestone.completed_at)::date, milestone.completed_at, 'timestamp', 'goals',
  milestone.title, 'Milestone for ' || goal.title, null, null, null, null,
  '/goals?highlight=' || milestone.goal_id || '&milestone=' || milestone.id,
  'milestone-backfill:' || milestone.id, jsonb_build_object('goal_id', milestone.goal_id)
)
from public.goal_milestones as milestone
join public.goals as goal on goal.id = milestone.goal_id and goal.user_id = milestone.user_id
where milestone.completed_at is not null;

select private.upsert_timeline_activity(
  application.user_id, 'career_application_added', 'job_applications', application.id,
  timezone('Asia/Manila', application.created_at)::date, application.created_at, 'timestamp', 'career',
  application.company_name || ' · ' || application.role_title, 'Stage: ' || replace(application.stage, '_', ' '),
  null, null, null, null, '/career?view=table&highlight=' || application.id,
  'application:' || application.id, jsonb_build_object('stage', application.stage)
)
from public.job_applications as application;

select private.upsert_timeline_activity(
  review.user_id, 'weekly_review_submitted', 'weekly_reviews', review.id,
  timezone('Asia/Manila', review.completed_at)::date, review.completed_at, 'timestamp', 'reviews',
  'Week of ' || review.week_start::text,
  coalesce(review.next_week_focus, review.wins, 'Weekly review submitted'), null, null,
  case when review.overall_score is null then null else 'Overall score' end,
  case when review.overall_score is null then null else review.overall_score::text end,
  '/reviews?view=archive&highlight=' || review.id, 'review:' || review.id, '{}'::jsonb
)
from public.weekly_reviews as review
where review.completed_at is not null;

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
    id, occurred_on, occurred_at, occurred_precision, module, action, title, description,
    amount_centavos, amount_direction, metric_label, metric_value,
    case when source_available then source_href else null end,
    source_available
  from scoped
  order by occurred_on desc, occurred_at desc, id desc
  limit p_limit;
end;
$$;

-- Activity is now an internal timeline/audit stream. Users retain read access;
-- source-table mutations invoke the private writer above.
drop policy if exists activity_log_insert on public.activity_log;
drop policy if exists activity_log_update on public.activity_log;
drop policy if exists activity_log_delete on public.activity_log;
revoke insert, update, delete on table public.activity_log from authenticated;
grant select on table public.activity_log to authenticated;

revoke all on function private.upsert_timeline_activity(uuid, text, text, uuid, date, timestamptz, text, text, text, text, bigint, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function private.record_timeline_activity() from public, anon, authenticated;
revoke all on function public.life_timeline(text, text, date, date, date, timestamptz, uuid, integer) from public, anon;
grant execute on function public.life_timeline(text, text, date, date, date, timestamptz, uuid, integer) to authenticated;
