begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('97000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'runway-a@example.test', '', now(), now(), now(), '{}', '{}'),
  ('97000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'runway-b@example.test', '', now(), now(), now(), '{}', '{}');

select is(
  (select runway_target_months from public.user_preferences where user_id = '97000000-0000-4000-8000-000000000001'),
  3::smallint,
  'new users receive a three-month runway target'
);

select is(
  (select is_essential from public.transaction_categories where user_id = '97000000-0000-4000-8000-000000000001' and name = 'Housing' and category_type = 'expense'),
  true,
  'new users receive Housing as an essential system expense category'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into public.financial_accounts (id, user_id, name, account_type, opening_balance_centavos)
values
  ('98000000-0000-4000-8000-000000000001', '97000000-0000-4000-8000-000000000001', 'Wallet A', 'e_wallet', 100000),
  ('98000000-0000-4000-8000-000000000002', '97000000-0000-4000-8000-000000000001', 'Invest A', 'investment', 200000);

select is(
  (select include_in_runway from public.financial_accounts where id = '98000000-0000-4000-8000-000000000001'),
  true,
  'new e-wallet accounts default into runway'
);

select is(
  (select include_in_runway from public.financial_accounts where id = '98000000-0000-4000-8000-000000000002'),
  false,
  'new investment accounts default out of runway'
);

select is(
  (select include_in_runway from public.financial_account_balances where id = '98000000-0000-4000-8000-000000000001'),
  true,
  'the RLS-safe account balance view exposes runway inclusion'
);

select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into public.financial_accounts (id, user_id, name, account_type, opening_balance_centavos)
values ('98000000-0000-4000-8000-000000000003', '97000000-0000-4000-8000-000000000002', 'Wallet B', 'cash', 250000);
select is(
  (select count(*) from public.financial_account_balances where id = '98000000-0000-4000-8000-000000000001'),
  0::bigint,
  'the security-invoker balance view does not expose another owner account'
);
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select throws_ok(
  $$select public.save_runway_preferences(
    array['98000000-0000-4000-8000-000000000003'::uuid],
    array[(select id from public.transaction_categories where user_id = '97000000-0000-4000-8000-000000000001' and name = 'Food' and category_type = 'expense')],
    3
  )$$,
  'P0001',
  'One or more accounts are unavailable',
  'cross-user account IDs are rejected'
);

select is(
  (select include_in_runway from public.financial_accounts where id = '98000000-0000-4000-8000-000000000001'),
  true,
  'a rejected preference save leaves existing account choices unchanged'
);

insert into public.transactions (user_id, account_id, category_id, transaction_type, amount_centavos, transaction_date)
values ('97000000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001', (select id from public.transaction_categories where user_id = '97000000-0000-4000-8000-000000000001' and name = 'Food' and category_type = 'expense'), 'expense', 12000, '2026-01-15');

select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
insert into public.transactions (user_id, account_id, category_id, transaction_type, amount_centavos, transaction_date)
values ('97000000-0000-4000-8000-000000000002', '98000000-0000-4000-8000-000000000003', (select id from public.transaction_categories where user_id = '97000000-0000-4000-8000-000000000002' and name = 'Food' and category_type = 'expense'), 'expense', 34000, '2026-01-15');
select set_config('request.jwt.claims', '{"sub":"97000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is(
  (select sum(amount_centavos) from public.runway_monthly_totals('2026-01-01', '2026-02-01')),
  12000::bigint,
  'monthly aggregation returns only the authenticated owner transaction totals'
);

select lives_ok(
  $$select public.save_runway_preferences(
    array['98000000-0000-4000-8000-000000000001'::uuid],
    array[(select id from public.transaction_categories where user_id = '97000000-0000-4000-8000-000000000001' and name = 'Housing' and category_type = 'expense')],
    6
  )$$,
  'valid owner-scoped runway preferences save atomically'
);

select is(
  (select runway_target_months from public.user_preferences where user_id = '97000000-0000-4000-8000-000000000001'),
  6::smallint,
  'preference target update is stored with the selected assumptions'
);

select * from finish();
rollback;
