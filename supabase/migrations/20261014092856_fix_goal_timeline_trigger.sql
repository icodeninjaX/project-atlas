-- PL/pgSQL evaluates every field an IF condition names before it short-
-- circuits, so `tg_table_name = 'goal_milestones' and new.completed_at ...`
-- fails on a goals row ("record new has no field completed_at"), and the
-- tasks branch's `new.status` fails on a weekly review. Every goal edit sends
-- its status, so every goal edit was rejected. Read each table's fields only
-- inside that table's own branch. Milestones and applications have their own
-- trigger functions now, so their branches are dropped here.
--
-- Timeline recording is observational: an audit failure is reported as a
-- warning and never blocks the change to the source row.
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
  occurrence_at timestamptz;
begin
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
    elsif tg_table_name = 'account_transfers' then
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
    elsif tg_table_name = 'debt_payments' then
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
    elsif tg_table_name = 'tasks' then
      if tg_op = 'UPDATE' and new.status = 'completed' and old.status <> 'completed' then
        occurrence_at := coalesce(new.completed_at, timezone('utc', now()));
        perform private.upsert_timeline_activity(
          new.user_id, 'task_completed', 'tasks', new.id,
          timezone('Asia/Manila', occurrence_at)::date, occurrence_at, 'timestamp', 'tasks',
          new.title, coalesce(new.description, 'Task completed'), null, null,
          null, null, '/tasks?view=completed&highlight=' || new.id, null, '{}'::jsonb
        );
      end if;
    elsif tg_table_name = 'goals' then
      if tg_op = 'UPDATE' and new.status = 'completed' and old.status <> 'completed' then
        occurrence_at := timezone('utc', now());
        perform private.upsert_timeline_activity(
          new.user_id, 'goal_completed', 'goals', new.id,
          timezone('Asia/Manila', occurrence_at)::date, occurrence_at, 'timestamp', 'goals',
          new.title, coalesce(new.success_definition, 'Goal completed'), null, null,
          'Progress', '100%', '/goals?highlight=' || new.id, null, '{}'::jsonb
        );
      end if;
    elsif tg_table_name = 'weekly_reviews' then
      if new.completed_at is not null
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
      end if;
    end if;
  exception
    when others then
      raise warning 'Could not record timeline activity for % %: %', tg_table_name, new.id, sqlerrm;
  end;

  return new;
end;
$$;

revoke all on function private.record_timeline_activity()
  from public, anon, authenticated;
