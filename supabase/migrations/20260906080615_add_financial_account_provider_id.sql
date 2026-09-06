begin;

alter table public.financial_accounts
add column provider_id text;

alter table public.financial_accounts
add constraint financial_accounts_provider_id_format_check
check (
  provider_id is null
  or provider_id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
);

comment on column public.financial_accounts.provider_id is
'Stable application provider ID from src/lib/money/ph-account-providers.ts. Null preserves custom and legacy accounts.';

update public.financial_accounts
set provider_id = 'gcash'
where provider_id is null
  and account_type = 'e_wallet'
  and regexp_replace(lower(trim(name)), '[^a-z0-9]+', '', 'g') = 'gcash';

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
  a.include_in_runway,
  a.provider_id
from public.financial_accounts a
left join public.transactions t on t.account_id = a.id
group by a.id;

grant select on public.financial_account_balances to authenticated;

commit;
