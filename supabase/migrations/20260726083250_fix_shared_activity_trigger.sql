-- Safely read fields shared across multiple trigger source tables.
create or replace function private.record_activity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owner_id uuid;
  target_id uuid;
  action_name text;
  entity_name text;
  safe_metadata jsonb := '{}'::jsonb;
  new_row jsonb := to_jsonb(new);
  old_row jsonb := to_jsonb(old);
begin
  owner_id := (new_row ->> 'user_id')::uuid;
  target_id := (new_row ->> 'id')::uuid;
  entity_name := tg_table_name;

  case
    when tg_table_name = 'tasks'
      and tg_op = 'UPDATE'
      and new_row ->> 'status' = 'completed'
      and old_row ->> 'status' <> 'completed' then
      action_name := 'task_completed';
    when tg_table_name = 'debt_payments' and tg_op = 'INSERT' then
      action_name := 'debt_payment_recorded';
      safe_metadata := jsonb_build_object(
        'amount_centavos',
        (new_row ->> 'amount_centavos')::bigint
      );
    when tg_table_name = 'job_applications'
      and tg_op = 'UPDATE'
      and new_row ->> 'stage' <> old_row ->> 'stage' then
      action_name := 'job_stage_changed';
      safe_metadata := jsonb_build_object(
        'from',
        old_row ->> 'stage',
        'to',
        new_row ->> 'stage'
      );
    when tg_table_name = 'goals'
      and tg_op = 'UPDATE'
      and new_row ->> 'status' = 'completed'
      and old_row ->> 'status' <> 'completed' then
      action_name := 'goal_completed';
    when tg_table_name = 'weekly_reviews'
      and tg_op = 'UPDATE'
      and new_row ->> 'completed_at' is not null
      and old_row ->> 'completed_at' is null then
      action_name := 'weekly_review_submitted';
    else
      return new;
  end case;

  insert into public.activity_log(user_id, action, entity_type, entity_id, metadata)
  values (owner_id, action_name, entity_name, target_id, safe_metadata);
  return new;
end;
$$;

revoke all on function private.record_activity() from public, anon, authenticated;
