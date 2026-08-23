begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'task-time@example.test',
  '',
  now(),
  now(),
  now(),
  '{}',
  '{}'
);

select lives_ok(
  $$insert into public.tasks (
    user_id, title, status, priority, scheduled_for, scheduled_time
  ) values (
    '00000000-0000-0000-0000-000000000001',
    'Scheduled focus session',
    'planned',
    'high',
    '2026-08-14',
    '09:30'
  )$$,
  'an exact time can be stored with a scheduled date'
);

select throws_ok(
  $$insert into public.tasks (
    user_id, title, status, priority, scheduled_time
  ) values (
    '00000000-0000-0000-0000-000000000001',
    'Invalid focus session',
    'planned',
    'high',
    '09:30'
  )$$,
  '23514',
  null,
  'an exact time requires a scheduled date'
);

select * from finish();
rollback;
