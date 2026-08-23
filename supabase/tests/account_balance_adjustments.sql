begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('94000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'balance-a@example.test', '', now(), now(), now(), '{}', '{}'),
  ('94000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'balance-b@example.test', '', now(), now(), now(), '{}', '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into public.financial_accounts (
  id, user_id, name, account_type, opening_balance_centavos
)
values (
  '95000000-0000-4000-8000-000000000001',
  '94000000-0000-4000-8000-000000000001',
  'Test wallet',
  'e_wallet',
  100000
);

select isnt(
  public.adjust_account_balance(
    '95000000-0000-4000-8000-000000000001',
    150000,
    current_date,
    'Counted the wallet balance'
  ),
  null,
  'raising the target creates an adjustment'
);

select is(
  (select current_balance_centavos::bigint from public.financial_account_balances where id = '95000000-0000-4000-8000-000000000001'),
  150000::bigint,
  'a positive adjustment changes the derived balance'
);

select is(
  (select adjustment_centavos from public.account_balance_adjustments where account_id = '95000000-0000-4000-8000-000000000001'),
  50000::bigint,
  'the adjustment stores only the difference'
);

select isnt(
  public.adjust_account_balance(
    '95000000-0000-4000-8000-000000000001',
    90000,
    current_date,
    null
  ),
  null,
  'lowering the target creates another adjustment'
);

select is(
  (select current_balance_centavos::bigint from public.financial_account_balances where id = '95000000-0000-4000-8000-000000000001'),
  90000::bigint,
  'a negative adjustment changes the derived balance'
);

select is(
  (select count(*) from public.transactions where account_id = '95000000-0000-4000-8000-000000000001'),
  0::bigint,
  'balance adjustments do not inflate income or expenses'
);

select is(
  public.adjust_account_balance(
    '95000000-0000-4000-8000-000000000001',
    90000,
    current_date,
    null
  ),
  null,
  'matching the existing balance is a no-op'
);

update public.financial_accounts
set is_archived = true
where id = '95000000-0000-4000-8000-000000000001';

select throws_ok(
  $$select public.adjust_account_balance(
    '95000000-0000-4000-8000-000000000001',
    100000,
    current_date,
    null
  )$$,
  'P0001',
  'Archived accounts cannot be adjusted',
  'archived accounts cannot be adjusted'
);

select set_config('request.jwt.claims', '{"sub":"94000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select throws_ok(
  $$select public.adjust_account_balance(
    '95000000-0000-4000-8000-000000000001',
    1,
    current_date,
    null
  )$$,
  'P0001',
  'Account not found',
  'another user cannot adjust the account'
);

select * from finish();
rollback;
