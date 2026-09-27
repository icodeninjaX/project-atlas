begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
 ('d7000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','insight-a@example.test','',now(),now(),now(),'{}','{}'),
 ('d7000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','insight-b@example.test','',now(),now(),now(),'{}','{}');

select is(
  (select column_default from information_schema.columns
    where table_schema = 'public' and table_name = 'user_preferences'
      and column_name = 'weekly_insight_auto'),
  'false', 'automatic insights are off by default');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d7000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.weekly_insights (user_id, week_start, status, claims, evidence)
values ('d7000000-0000-4000-8000-000000000001','2026-09-14','answered','[]','[]');
select is((select count(*) from public.weekly_insights), 1::bigint, 'owner reads own insight');
select throws_ok(
  $$insert into public.weekly_insights (user_id, week_start, status, evidence)
    values ('d7000000-0000-4000-8000-000000000001','2026-09-14','answered','[]')$$,
  '23505', null, 'one insight per owner and week');
select throws_ok(
  $$insert into public.weekly_insights (user_id, week_start, status, evidence)
    values ('d7000000-0000-4000-8000-000000000001','2026-09-16','answered','[]')$$,
  '23514', null, 'week start must be a Monday');
select throws_ok(
  $$insert into public.weekly_insights (user_id, week_start, status, evidence)
    values ('d7000000-0000-4000-8000-000000000001','2026-09-07','answered',
      to_jsonb(array[repeat('a', 70000)]))$$,
  '23514', null, 'oversized insight payload is refused');
select throws_ok(
  $$insert into public.weekly_insights (user_id, week_start, status, evidence)
    values ('d7000000-0000-4000-8000-000000000002','2026-09-07','answered','[]')$$,
  '42501', null, 'owner cannot store an insight for another user');
select ok(not has_table_privilege('authenticated','public.weekly_insights','UPDATE'),
  'no table-wide update privilege');
update public.weekly_insights set status = 'failed'
  where week_start = '2026-09-14';
select is((select status from public.weekly_insights where week_start = '2026-09-14'),
  'answered', 'a finished insight cannot be changed');

insert into public.weekly_insights (user_id, week_start, status)
values ('d7000000-0000-4000-8000-000000000001','2026-09-21','pending');
select throws_ok(
  $$insert into public.weekly_insights (user_id, week_start, status)
    values ('d7000000-0000-4000-8000-000000000001','2026-09-21','pending')$$,
  '23505', null, 'only one claim per owner and week');
select throws_ok(
  $$update public.weekly_insights set claims = '[]' where week_start = '2026-09-21'$$,
  '42501', null, 'a claim cannot stay pending when completed');

select set_config('request.jwt.claims','{"sub":"d7000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.weekly_insights), 0::bigint, 'other owner cannot read insight');
update public.weekly_insights set status = 'answered' where week_start = '2026-09-21';
delete from public.weekly_insights;
select set_config('request.jwt.claims','{"sub":"d7000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select status from public.weekly_insights where week_start = '2026-09-21'),
  'pending', 'other owner cannot complete a claim');
select is((select count(*) from public.weekly_insights), 2::bigint, 'other owner cannot delete insights');
update public.weekly_insights
  set status = 'answered', claims = '[{"kind":"observation"}]', evidence = '[1]'
  where week_start = '2026-09-21';
select is((select status from public.weekly_insights where week_start = '2026-09-21'),
  'answered', 'owner completes a pending claim once');
update public.weekly_insights set status = 'failed' where week_start = '2026-09-21';
select is((select status from public.weekly_insights where week_start = '2026-09-21'),
  'answered', 'a completed claim is final');
select throws_ok(
  $$insert into public.weekly_insights (user_id, week_start, status)
    values ('d7000000-0000-4000-8000-000000000001','2026-09-28','unknown')$$,
  '23514', null, 'status must be a known value');
reset role;

select * from finish();
rollback;
