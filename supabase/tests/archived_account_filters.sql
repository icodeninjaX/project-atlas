begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values (
  '96000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'account-filter@example.test',
  '',
  now(),
  now(),
  now(),
  '{}',
  '{}'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"96000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

insert into public.financial_accounts (
  id, user_id, name, account_type, opening_balance_centavos, is_archived
)
values
  (
    '97000000-0000-4000-8000-000000000001',
    '96000000-0000-4000-8000-000000000001',
    'Active cash',
    'cash',
    10000,
    false
  ),
  (
    '97000000-0000-4000-8000-000000000002',
    '96000000-0000-4000-8000-000000000001',
    'Archived cash',
    'cash',
    20000,
    true
  );

select is(
  (
    select array_agg(name order by name)
    from public.financial_account_balances
    where is_archived = false
  ),
  array['Active cash']::text[],
  'the active filter excludes archived accounts'
);

select is(
  (
    select array_agg(name order by name)
    from public.financial_account_balances
    where is_archived = true
  ),
  array['Archived cash']::text[],
  'the archived filter excludes active accounts'
);

select * from finish();
rollback;
