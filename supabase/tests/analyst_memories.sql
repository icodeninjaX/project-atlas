begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
 ('e8000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','memory-a@example.test','',now(),now(),now(),'{}','{}'),
 ('e8000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','memory-b@example.test','',now(),now(),now(),'{}','{}');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"e8000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.analyst_memories (text) values ('Saving for a laptop');
select is((select count(*) from public.analyst_memories), 1::bigint, 'owner saves and reads a priority');
select throws_ok(
  $$insert into public.analyst_memories (text) values ('Save 5000 a month')$$,
  '23514', null, 'a priority never holds a figure');
select throws_ok(
  $$update public.analyst_memories set text = 'Something else'$$,
  '42501', null, 'the text is never edited in place');
select lives_ok(
  $$update public.analyst_memories set last_mentioned_at = now()$$,
  'the last mention can be refreshed');
insert into public.analyst_memories (text)
select 'Priority number ' || chr(64 + n) from generate_series(1, 9) as series(n);
select throws_ok(
  $$insert into public.analyst_memories (text) values ('One more priority')$$,
  '23514', null, 'at most ten priorities per owner');

select set_config('request.jwt.claims','{"sub":"e8000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.analyst_memories), 0::bigint, 'another owner sees none');
select throws_ok(
  $$insert into public.analyst_memories (user_id, text)
    values ('e8000000-0000-4000-8000-000000000001', 'Planted priority')$$,
  '42501', null, 'no one saves a priority for another owner');
delete from public.analyst_memories;
set local role postgres;
select is((select count(*) from public.analyst_memories), 10::bigint, 'another owner cannot delete them');

select * from finish();
rollback;
