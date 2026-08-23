create table public.account_balance_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  previous_balance_centavos bigint not null,
  target_balance_centavos bigint not null,
  adjustment_centavos bigint not null check (adjustment_centavos <> 0),
  adjustment_date date not null,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  foreign key (account_id, user_id)
    references public.financial_accounts(id, user_id) on delete restrict,
  check (
    previous_balance_centavos + adjustment_centavos
      = target_balance_centavos
  )
);

create index account_balance_adjustments_account_date_idx
on public.account_balance_adjustments(account_id, adjustment_date desc, created_at desc);

create index account_balance_adjustments_user_date_idx
on public.account_balance_adjustments(user_id, adjustment_date desc, created_at desc);

alter table public.account_balance_adjustments enable row level security;
alter table public.account_balance_adjustments force row level security;

grant select, insert on table public.account_balance_adjustments to authenticated;

create policy account_balance_adjustments_select
on public.account_balance_adjustments
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy account_balance_adjustments_insert
on public.account_balance_adjustments
for insert
to authenticated
with check ((select auth.uid()) = user_id);

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
  a.updated_at
from public.financial_accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

create or replace function public.adjust_account_balance(
  p_account_id uuid,
  p_target_balance_centavos bigint,
  p_adjustment_date date,
  p_note text default null
)
returns uuid
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  account_archived boolean;
  current_balance bigint;
  balance_delta bigint;
  adjustment_id uuid;
  cleaned_note text := nullif(trim(p_note), '');
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  if p_adjustment_date is null then
    raise exception 'Adjustment date is required';
  end if;

  if cleaned_note is not null and char_length(cleaned_note) > 300 then
    raise exception 'Adjustment note is too long';
  end if;

  select a.is_archived
    into account_archived
  from public.financial_accounts a
  where a.id = p_account_id
    and a.user_id = caller_id
  for update;

  if not found then
    raise exception 'Account not found';
  end if;

  if account_archived then
    raise exception 'Archived accounts cannot be adjusted';
  end if;

  select b.current_balance_centavos
    into current_balance
  from public.financial_account_balances b
  where b.id = p_account_id
    and b.user_id = caller_id;

  if current_balance is null then
    raise exception 'Account balance is unavailable';
  end if;

  balance_delta := p_target_balance_centavos - current_balance;
  if balance_delta = 0 then
    return null;
  end if;

  insert into public.account_balance_adjustments (
    user_id,
    account_id,
    previous_balance_centavos,
    target_balance_centavos,
    adjustment_centavos,
    adjustment_date,
    note
  )
  values (
    caller_id,
    p_account_id,
    current_balance,
    p_target_balance_centavos,
    balance_delta,
    p_adjustment_date,
    cleaned_note
  )
  returning id into adjustment_id;

  return adjustment_id;
end;
$$;

revoke all on function public.adjust_account_balance(uuid, bigint, date, text)
from public, anon;
grant execute on function public.adjust_account_balance(uuid, bigint, date, text)
to authenticated;
