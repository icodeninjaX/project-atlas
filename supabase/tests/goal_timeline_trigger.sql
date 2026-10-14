begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values (
  '98000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'goal-timeline@example.test', '',
  now(), now(), now(), '{}', '{}'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"98000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into public.goals (id, user_id, title, area, status)
values (
  '98100000-0000-4000-8000-000000000001',
  '98000000-0000-4000-8000-000000000001',
  'Timeline goal', 'personal', 'active'
);

-- The goal form always sends its status, so an edit fires the status trigger.
select lives_ok(
  $$update public.goals
    set title = 'Renamed timeline goal', status = 'active'
    where id = '98100000-0000-4000-8000-000000000001'$$,
  'editing a goal without changing its status succeeds'
);

select lives_ok(
  $$update public.goals
    set status = 'completed'
    where id = '98100000-0000-4000-8000-000000000001'$$,
  'completing a goal succeeds'
);

select is(
  (select count(*) from public.life_timeline(p_module := 'goals') where event_type = 'goal_completed'),
  1::bigint,
  'completing a goal records one timeline event'
);

select lives_ok(
  $$insert into public.weekly_reviews (id, user_id, week_start, wins, completed_at)
    values ('98200000-0000-4000-8000-000000000001', '98000000-0000-4000-8000-000000000001',
            '2026-10-12', 'Shipped', now())$$,
  'submitting a weekly review succeeds'
);

select is(
  (select count(*) from public.life_timeline(p_module := 'reviews') where event_type = 'weekly_review_submitted'),
  1::bigint,
  'submitting a weekly review records one timeline event'
);

select * from finish();
rollback;
