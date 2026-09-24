begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('aa000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'capture-a@example.test', '', now(), now(), now(), '{}', '{}'),
  ('aa000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'capture-b@example.test', '', now(), now(), now(), '{}', '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

select is(public.reserve_ai_capture_request(), true, 'an owner can reserve an AI request');
select throws_ok(
  $$select count(*) from public.ai_capture_requests$$,
  '42501', null, 'clients cannot read the private request ledger'
);

do $$
begin
  for i in 1..9 loop
    perform public.reserve_ai_capture_request();
  end loop;
end;
$$;

select is(public.reserve_ai_capture_request(), false, 'the eleventh request within an hour is rejected');

select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is(public.reserve_ai_capture_request(), true, 'another owner has an independent quota');

insert into public.tasks(user_id, title, status, priority)
values ('aa000000-0000-4000-8000-000000000002', 'Captured task', 'inbox', 'medium');
select is((select count(*) from public.activity_log where action = 'task_added'), 1::bigint, 'new tasks appear in activity history');

reset role;
insert into public.ai_capture_requests(user_id)
select 'aa000000-0000-4000-8000-000000000001'::uuid
from generate_series(1, 289);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aa000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is(public.reserve_ai_capture_request(), false, 'the site-wide daily cap prevents further provider calls');

select * from finish();
rollback;
