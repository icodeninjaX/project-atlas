begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  (
    '98000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'delete-a@example.test',
    '', now(), now(), now(), '{}', '{}'
  ),
  (
    '98000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'delete-b@example.test',
    '', now(), now(), now(), '{}', '{}'
  );

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

insert into public.financial_accounts (
  id, user_id, name, account_type, opening_balance_centavos, is_archived
)
values
  (
    '99000000-0000-4000-8000-000000000001',
    '98000000-0000-4000-8000-000000000001',
    'Empty archive',
    'cash',
    0,
    true
  ),
  (
    '99000000-0000-4000-8000-000000000002',
    '98000000-0000-4000-8000-000000000001',
    'Active account',
    'cash',
    0,
    false
  ),
  (
    '99000000-0000-4000-8000-000000000003',
    '98000000-0000-4000-8000-000000000001',
    'Archive with history',
    'cash',
    10000,
    true
  );

insert into public.transactions (
  user_id,
  account_id,
  category_id,
  transaction_type,
  amount_centavos,
  transaction_date,
  description
)
select
  '98000000-0000-4000-8000-000000000001',
  '99000000-0000-4000-8000-000000000003',
  c.id,
  'income',
  1000,
  current_date,
  'Deletion protection test'
from public.transaction_categories c
where c.user_id = '98000000-0000-4000-8000-000000000001'
  and c.name = 'Salary'
  and c.category_type = 'income';

select is(
  public.delete_archived_financial_account(
    '99000000-0000-4000-8000-000000000001',
    'Wrong name'
  ),
  'confirmation_mismatch',
  'the account name must match exactly'
);

select is(
  public.delete_archived_financial_account(
    '99000000-0000-4000-8000-000000000002',
    'Active account'
  ),
  'not_archived',
  'active accounts cannot be permanently deleted'
);

delete from public.financial_accounts
where id = '99000000-0000-4000-8000-000000000002';

select is(
  (
    select count(*)
    from public.financial_accounts
    where id = '99000000-0000-4000-8000-000000000002'
  ),
  1::bigint,
  'the delete policy also protects active accounts'
);

select is(
  public.delete_archived_financial_account(
    '99000000-0000-4000-8000-000000000003',
    'Archive with history'
  ),
  'has_history',
  'accounts with financial history cannot be deleted'
);

select is(
  (
    select count(*)
    from public.financial_accounts
    where id = '99000000-0000-4000-8000-000000000003'
  ),
  1::bigint,
  'history-protected accounts remain archived'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);

select is(
  public.delete_archived_financial_account(
    '99000000-0000-4000-8000-000000000001',
    'Empty archive'
  ),
  'not_found',
  'another user cannot delete the archived account'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"98000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

select is(
  public.delete_archived_financial_account(
    '99000000-0000-4000-8000-000000000001',
    'Empty archive'
  ),
  'deleted',
  'an empty archived account can be permanently deleted'
);

select is(
  (
    select count(*)
    from public.financial_accounts
    where id = '99000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'the deleted account is gone'
);

select * from finish();
rollback;
