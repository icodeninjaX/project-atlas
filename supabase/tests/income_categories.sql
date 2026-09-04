begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values (
  '97000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'income-categories@example.test',
  '', now(), now(), now(), '{}', '{}'
);

select is(
  (
    select count(*)
    from public.transaction_categories
    where user_id = '97000000-0000-4000-8000-000000000001'
      and category_type = 'income'
  ),
  10::bigint,
  'new users receive the expanded income category set'
);

select results_eq(
  $$
    select name
    from public.transaction_categories
    where user_id = '97000000-0000-4000-8000-000000000001'
      and category_type = 'income'
    order by name
  $$,
  $$
    values
      ('Allowance'::text),
      ('Bonus'::text),
      ('Business Income'::text),
      ('Commission'::text),
      ('Freelance'::text),
      ('Gifts'::text),
      ('Investment Income'::text),
      ('Other Income'::text),
      ('Rental Income'::text),
      ('Salary'::text)
  $$,
  'income categories have the expected names'
);

select * from finish();
rollback;
