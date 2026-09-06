begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

select has_column(
  'public',
  'financial_accounts',
  'provider_id',
  'financial accounts expose an optional provider ID'
);

select has_column(
  'public',
  'financial_account_balances',
  'provider_id',
  'the account balance view exposes the provider ID'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values (
  '99000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'provider-test@example.test',
  '',
  now(),
  now(),
  now(),
  '{}',
  '{}'
);

select lives_ok(
  $$insert into public.financial_accounts (
    user_id, name, account_type, provider_id, opening_balance_centavos
  ) values (
    '99000000-0000-4000-8000-000000000001',
    'GCash',
    'e_wallet',
    'gcash',
    0
  )$$,
  'a catalog provider slug can be stored'
);

select lives_ok(
  $$insert into public.financial_accounts (
    user_id, name, account_type, opening_balance_centavos
  ) values (
    '99000000-0000-4000-8000-000000000001',
    'Custom cash account',
    'cash',
    0
  )$$,
  'custom and legacy accounts can keep a null provider ID'
);

select throws_ok(
  $$insert into public.financial_accounts (
    user_id, name, account_type, provider_id, opening_balance_centavos
  ) values (
    '99000000-0000-4000-8000-000000000001',
    'Invalid provider',
    'bank',
    'Invalid Provider!',
    0
  )$$,
  '23514',
  null,
  'provider IDs must use stable lowercase slugs'
);

select * from finish();
rollback;
