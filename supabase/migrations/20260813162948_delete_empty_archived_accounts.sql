drop policy if exists financial_accounts_delete on public.financial_accounts;

create policy financial_accounts_delete
on public.financial_accounts
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and is_archived = true
);

create or replace function public.delete_archived_financial_account(
  p_account_id uuid,
  p_confirmation_name text
)
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  account_name text;
  account_archived boolean;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  select a.name, a.is_archived
    into account_name, account_archived
  from public.financial_accounts a
  where a.id = p_account_id
    and a.user_id = caller_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if not account_archived then
    return 'not_archived';
  end if;

  if p_confirmation_name is distinct from account_name then
    return 'confirmation_mismatch';
  end if;

  if exists (
    select 1
    from public.transactions t
    where t.account_id = p_account_id
      and t.user_id = caller_id
  ) or exists (
    select 1
    from public.account_transfers at
    where at.user_id = caller_id
      and (
        at.source_account_id = p_account_id
        or at.destination_account_id = p_account_id
      )
  ) or exists (
    select 1
    from public.account_balance_adjustments aba
    where aba.account_id = p_account_id
      and aba.user_id = caller_id
  ) then
    return 'has_history';
  end if;

  delete from public.financial_accounts a
  where a.id = p_account_id
    and a.user_id = caller_id
    and a.is_archived = true;

  if not found then
    return 'not_found';
  end if;

  return 'deleted';
end;
$$;

revoke all on function public.delete_archived_financial_account(uuid, text)
from public, anon;
grant execute on function public.delete_archived_financial_account(uuid, text)
to authenticated;
