begin;

alter table public.financial_accounts
  add column if not exists include_in_runway boolean;

update public.financial_accounts
set include_in_runway = account_type in ('cash', 'bank', 'e_wallet', 'savings')
where include_in_runway is null;

alter table public.financial_accounts
  alter column include_in_runway set default null,
  alter column include_in_runway set not null;

create or replace function private.set_financial_account_runway_default()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.include_in_runway is null then
    new.include_in_runway := new.account_type in ('cash', 'bank', 'e_wallet', 'savings');
  end if;
  return new;
end;
$$;

drop trigger if exists set_financial_account_runway_default on public.financial_accounts;
create trigger set_financial_account_runway_default
before insert on public.financial_accounts
for each row execute function private.set_financial_account_runway_default();

alter table public.transaction_categories
  add column if not exists is_essential boolean;

update public.transaction_categories
set is_essential = (
  category_type = 'expense'
  and lower(name) in ('housing', 'food', 'transportation', 'utilities', 'family', 'health')
)
where is_essential is null;

alter table public.transaction_categories
  alter column is_essential set default false,
  alter column is_essential set not null;

alter table public.user_preferences
  add column if not exists runway_target_months smallint not null default 3
  check (runway_target_months between 1 and 24);

insert into public.transaction_categories(
  user_id,
  name,
  category_type,
  icon,
  is_system,
  is_essential
)
select users.id, 'Housing', 'expense', 'house', true, true
from auth.users as users
on conflict (user_id, name, category_type) do update
set is_essential = true;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id) values (new.id) on conflict (id) do nothing;
  insert into public.user_preferences(user_id) values (new.id) on conflict (user_id) do nothing;

  insert into public.transaction_categories(
    user_id,
    name,
    category_type,
    icon,
    is_system,
    is_essential
  )
  values
    (new.id, 'Salary', 'income', 'briefcase', true, false),
    (new.id, 'Freelance', 'income', 'laptop', true, false),
    (new.id, 'Bonus', 'income', 'gift', true, false),
    (new.id, 'Commission', 'income', 'badge-percent', true, false),
    (new.id, 'Business Income', 'income', 'building', true, false),
    (new.id, 'Investment Income', 'income', 'trending-up', true, false),
    (new.id, 'Rental Income', 'income', 'house', true, false),
    (new.id, 'Allowance', 'income', 'wallet-cards', true, false),
    (new.id, 'Gifts', 'income', 'hand-heart', true, false),
    (new.id, 'Other Income', 'income', 'circle-ellipsis', true, false),
    (new.id, 'Housing', 'expense', 'house', true, true),
    (new.id, 'Food', 'expense', 'utensils', true, true),
    (new.id, 'Transportation', 'expense', 'bus', true, true),
    (new.id, 'Utilities', 'expense', 'bolt', true, true),
    (new.id, 'Debt Payment', 'expense', 'landmark', true, false),
    (new.id, 'Family', 'expense', 'users', true, true),
    (new.id, 'Health', 'expense', 'heart-pulse', true, true),
    (new.id, 'Shopping', 'expense', 'shopping-bag', true, false),
    (new.id, 'Entertainment', 'expense', 'film', true, false),
    (new.id, 'Business', 'expense', 'building', true, false),
    (new.id, 'Savings', 'transfer', 'piggy-bank', true, false),
    (new.id, 'Other', 'expense', 'circle-ellipsis', true, false)
  on conflict (user_id, name, category_type) do nothing;
  return new;
end;
$$;

create or replace view public.financial_account_balances
with (security_invoker = true)
as
select
  a.id,
  a.user_id,
  a.name,
  a.account_type,
  a.institution,
  a.is_archived,
  a.opening_balance_centavos
    + coalesce(sum(case when t.transaction_type = 'income' then t.amount_centavos else -t.amount_centavos end), 0)
    + coalesce((select sum(at.amount_centavos) from public.account_transfers at where at.destination_account_id = a.id), 0)
    - coalesce((select sum(at.amount_centavos) from public.account_transfers at where at.source_account_id = a.id), 0)
    + coalesce((select sum(aba.adjustment_centavos) from public.account_balance_adjustments aba where aba.account_id = a.id), 0)
    as current_balance_centavos,
  a.created_at,
  a.updated_at,
  a.include_in_runway
from public.financial_accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

create or replace function public.runway_monthly_totals(
  p_start_date date,
  p_end_date date
)
returns table(
  month_start date,
  category_id uuid,
  transaction_type text,
  amount_centavos bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    date_trunc('month', t.transaction_date)::date as month_start,
    t.category_id,
    t.transaction_type,
    sum(t.amount_centavos)::bigint as amount_centavos
  from public.transactions as t
  where t.user_id = (select auth.uid())
    and p_end_date > p_start_date
    and p_end_date <= p_start_date + 366
    and t.transaction_date >= p_start_date
    and t.transaction_date < p_end_date
  group by 1, 2, 3
  order by 1 desc, 2, 3;
$$;

create or replace function public.save_runway_preferences(
  p_account_ids uuid[],
  p_category_ids uuid[],
  p_target_months smallint
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  account_ids uuid[];
  category_ids uuid[];
  valid_accounts integer;
  valid_categories integer;
begin
  if caller_id is null then
    raise exception 'Authentication is required';
  end if;
  if p_target_months not between 1 and 24 then
    raise exception 'Runway target must be between 1 and 24 months';
  end if;

  select coalesce(array_agg(distinct value), '{}'::uuid[])
  into account_ids
  from unnest(coalesce(p_account_ids, '{}'::uuid[])) as input(value);
  select coalesce(array_agg(distinct value), '{}'::uuid[])
  into category_ids
  from unnest(coalesce(p_category_ids, '{}'::uuid[])) as input(value);

  if cardinality(account_ids) = 0 or cardinality(category_ids) = 0 then
    raise exception 'Select at least one account and essential category';
  end if;

  select count(*) into valid_accounts
  from public.financial_accounts
  where user_id = caller_id
    and not is_archived
    and id = any(account_ids);
  if valid_accounts <> cardinality(account_ids) then
    raise exception 'One or more accounts are unavailable';
  end if;

  select count(*) into valid_categories
  from public.transaction_categories
  where user_id = caller_id
    and category_type = 'expense'
    and lower(name) <> 'debt payment'
    and id = any(category_ids);
  if valid_categories <> cardinality(category_ids) then
    raise exception 'One or more categories are unavailable';
  end if;

  update public.financial_accounts
  set include_in_runway = false
  where user_id = caller_id;
  update public.financial_accounts
  set include_in_runway = true
  where user_id = caller_id and id = any(account_ids);

  update public.transaction_categories
  set is_essential = false
  where user_id = caller_id and category_type = 'expense';
  update public.transaction_categories
  set is_essential = true
  where user_id = caller_id and id = any(category_ids);

  insert into public.user_preferences(user_id, runway_target_months)
  values (caller_id, p_target_months)
  on conflict (user_id) do update
  set runway_target_months = excluded.runway_target_months;
end;
$$;

revoke all on function public.runway_monthly_totals(date, date) from public, anon;
grant execute on function public.runway_monthly_totals(date, date) to authenticated;
revoke all on function public.save_runway_preferences(uuid[], uuid[], smallint) from public, anon;
grant execute on function public.save_runway_preferences(uuid[], uuid[], smallint) to authenticated;
revoke all on function private.set_financial_account_runway_default() from public, anon, authenticated;
grant select on public.financial_account_balances to authenticated;

commit;
