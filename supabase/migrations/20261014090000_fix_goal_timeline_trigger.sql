-- Editing a goal always sends its status, which fires goals_timeline_activity.
-- The shared writer tested each table's branch in one flat chain of `if`s, so a
-- goal update that did not complete the goal fell through to the milestone and
-- weekly-review conditions, and PL/pgSQL failed on `new.completed_at` — a column
-- goals does not have. Every goal edit, pause, or status change was rejected.
--
-- Each table's branch now returns before the next table's fields are read, so a
-- row is only ever inspected for the columns its own table has.
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

  if tg_table_name = 'tasks' then
    if tg_op <> 'UPDATE' or new.status <> 'completed' or old.status = 'completed' then
      return new;
    end if;
    occurrence_at := coalesce(new.completed_at, timezone('utc', now()));
    perform private.upsert_timeline_activity(
      new.user_id, 'task_completed', 'tasks', new.id,
      timezone('Asia/Manila', occurrence_at)::date, occurrence_at, 'timestamp', 'tasks',
      new.title, coalesce(new.description, 'Task completed'), null, null,
      null, null, '/tasks?view=completed&highlight=' || new.id, null, '{}'::jsonb
    );
    return new;
  end if;

  if tg_table_name = 'goal_milestones' then
    if tg_op <> 'UPDATE' or new.completed_at is null or old.completed_at is not null then
      return new;
    end if;
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

  if tg_table_name = 'goals' then
    if tg_op <> 'UPDATE' or new.status <> 'completed' or old.status = 'completed' then
      return new;
    end if;
    occurrence_at := timezone('utc', now());
    perform private.upsert_timeline_activity(
      new.user_id, 'goal_completed', 'goals', new.id,
      timezone('Asia/Manila', occurrence_at)::date, occurrence_at, 'timestamp', 'goals',
      new.title, coalesce(new.success_definition, 'Goal completed'), null, null,
      'Progress', '100%', '/goals?highlight=' || new.id, null, '{}'::jsonb
    );
    return new;
  end if;

  if tg_table_name = 'weekly_reviews' then
    if new.completed_at is null or (tg_op = 'UPDATE' and old.completed_at is not null) then
      return new;
    end if;
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
