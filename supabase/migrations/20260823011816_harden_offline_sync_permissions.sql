alter table public.offline_mutation_receipts force row level security;

revoke all on table public.offline_mutation_receipts from anon, authenticated;
grant select, insert, update on table public.offline_mutation_receipts to authenticated;

create index if not exists account_balance_adjustments_account_owner_idx
on public.account_balance_adjustments(account_id, user_id);
