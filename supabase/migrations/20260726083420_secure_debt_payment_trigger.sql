-- Keep the helper private while validating authenticated ownership.
create or replace function private.debt_payment_recalculation_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  affected_user_id uuid := case when tg_op = 'DELETE' then old.user_id else new.user_id end;
begin
  if caller_id is not null and caller_id <> affected_user_id then
    raise exception 'Debt payment ownership mismatch';
  end if;

  if tg_op = 'DELETE' then
    perform private.recalculate_debt(old.debt_id, old.user_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and (old.debt_id, old.user_id) is distinct from (new.debt_id, new.user_id) then
    perform private.recalculate_debt(old.debt_id, old.user_id);
  end if;

  perform private.recalculate_debt(new.debt_id, new.user_id);
  return new;
end;
$$;

revoke all on function private.debt_payment_recalculation_trigger()
  from public, anon, authenticated;
