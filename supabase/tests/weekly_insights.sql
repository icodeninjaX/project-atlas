begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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
  'stored insights cannot be edited');

select set_config('request.jwt.claims','{"sub":"d7000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.weekly_insights), 0::bigint, 'other owner cannot read insight');
delete from public.weekly_insights;
reset role;
select is((select count(*) from public.weekly_insights), 1::bigint, 'other owner cannot delete insight');

select * from finish();
rollback;
