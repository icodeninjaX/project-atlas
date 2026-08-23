begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.offline_mutation_receipts'::regclass),
  'offline mutation receipts have RLS enabled'
);
select ok(
  has_table_privilege('authenticated', 'public.offline_mutation_receipts', 'select'),
  'authenticated users can read owned sync receipts'
);
select ok(
  has_table_privilege('authenticated', 'public.offline_mutation_receipts', 'insert'),
  'authenticated users can create owned sync receipts'
);
select ok(
  has_table_privilege('authenticated', 'public.offline_mutation_receipts', 'update'),
  'authenticated users can update owned sync receipts'
);
select ok(
  not has_table_privilege('anon', 'public.offline_mutation_receipts', 'select'),
  'anonymous users cannot read sync receipts'
);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('94000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'offline-a@example.test', '', now(), now(), now(), '{}', '{}'),
  ('94000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'offline-b@example.test', '', now(), now(), now(), '{}', '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"94000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.offline_mutation_receipts (
    user_id, mutation_id, mutation_type, status
  ) values (
    '94000000-0000-4000-8000-000000000001',
    '94100000-0000-4000-8000-000000000001',
    'task.create',
    'processing'
  )$$,
  'an authenticated user can create an owned receipt'
);
select is(
  (select count(*) from public.offline_mutation_receipts),
  1::bigint,
  'the owner can read the receipt'
);
select lives_ok(
  $$update public.offline_mutation_receipts
    set status = 'succeeded'
    where mutation_id = '94100000-0000-4000-8000-000000000001'$$,
  'the owner can update the receipt'
);
select throws_ok(
  $$insert into public.offline_mutation_receipts (
    user_id, mutation_id, mutation_type, status
  ) values (
    '94000000-0000-4000-8000-000000000002',
    '94100000-0000-4000-8000-000000000002',
    'task.create',
    'processing'
  )$$,
  '42501',
  null,
  'a user cannot create a receipt owned by someone else'
);

select set_config('request.jwt.claims', '{"sub":"94000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is(
  (select count(*) from public.offline_mutation_receipts),
  0::bigint,
  'another user cannot read the owner receipt'
);

select * from finish();
rollback;
