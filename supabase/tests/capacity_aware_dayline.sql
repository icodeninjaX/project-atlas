begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000071',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'dayline@example.test',
  '',
  now(),
  now(),
  now(),
  '{}',
  '{}'
);

select is(
  (
    select dayline_capacity_minutes
    from public.user_preferences
    where user_id = '00000000-0000-0000-0000-000000000071'
  ),
  180::smallint,
  'new users receive a three-hour Dayline capacity default'
);

select is(
  (
    select dayline_energy_level
    from public.user_preferences
    where user_id = '00000000-0000-0000-0000-000000000071'
  ),
  'medium'::text,
  'new users receive a medium Dayline energy default'
);

select lives_ok(
  $$insert into public.tasks (
    user_id, title, status, priority, energy_required
  ) values (
    '00000000-0000-0000-0000-000000000071',
    'Low-energy admin',
    'inbox',
    'medium',
    'low'
  )$$,
  'a supported task energy requirement can be stored'
);

select throws_ok(
  $$insert into public.tasks (
    user_id, title, status, priority, energy_required
  ) values (
    '00000000-0000-0000-0000-000000000071',
    'Invalid energy task',
    'inbox',
    'medium',
    'extreme'
  )$$,
  '23514',
  null,
  'unsupported task energy requirements are rejected'
);

select throws_ok(
  $$update public.user_preferences
    set dayline_capacity_minutes = 10
    where user_id = '00000000-0000-0000-0000-000000000071'$$,
  '23514',
  null,
  'Dayline capacity cannot be set below the supported range'
);

select * from finish();
rollback;
