begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
 ('d8000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pool-a@example.test','',now(),now(),now(),'{}','{}'),
 ('d8000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pool-b@example.test','',now(),now(),now(),'{}','{}');

create temp table reservations (name text primary key, id bigint);
grant all on reservations to authenticated;

set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select is(public.reserve_ai_pool_tokens('gpt-6-sol', 'analyst_answer', 1000)->>'status',
  'unauthenticated', 'a signed-out caller cannot reserve');

select set_config('request.jwt.claims','{"sub":"d8000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.reserve_ai_pool_tokens('gpt-4o-mini', 'analyst_answer', 1000)->>'status',
  'unpooled_model', 'an alias is not in any pool');
select is(public.reserve_ai_pool_tokens('gpt-4o-mini-2024-07-18', 'unknown', 1000)->>'status',
  'invalid_request', 'an unknown feature is refused');
select is(public.reserve_ai_pool_tokens('gpt-4o-mini-2024-07-18', 'analyst_answer', 200001)->>'status',
  'invalid_request', 'one reservation is capped');
select is(public.reserve_ai_pool_tokens('gpt-4o-mini-2024-07-18', 'analyst_planner', 5000)->>'pool',
  'small', 'an exact small model reserves from the small pool');

-- The large pool stops at 90% of 250,000 tokens, shared by its models.
insert into reservations
  select 'large', (public.reserve_ai_pool_tokens('gpt-6-sol', 'analyst_answer', 200000)->>'reservation_id')::bigint;
select isnt((select id from reservations where name = 'large'), null,
  'a reservation inside the large pool succeeds');
select is(public.reserve_ai_pool_tokens('gpt-5.4-2026-03-05', 'analyst_answer', 30000)->>'status',
  'exhausted', 'the whole next request is refused when it would pass the stop point');
select is((public.reserve_ai_pool_tokens('gpt-6-luna', 'analyst_answer', 30000)->>'remaining')::int,
  25000, 'the refusal reports the room left in the shared pool');

-- Only the owner settles, once, with the real usage.
select set_config('request.jwt.claims','{"sub":"d8000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select public.settle_ai_pool_tokens((select id from reservations where name = 'large'), 0);
select is(public.reserve_ai_pool_tokens('gpt-6-sol', 'analyst_answer', 30000)->>'status',
  'exhausted', 'another account cannot settle a reservation');
select set_config('request.jwt.claims','{"sub":"d8000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select public.settle_ai_pool_tokens((select id from reservations where name = 'large'), 12000);
select is(public.reserve_ai_pool_tokens('gpt-6-sol', 'analyst_answer', 30000)->>'status',
  'reserved', 'settled usage replaces the reserved size');
select public.settle_ai_pool_tokens((select id from reservations where name = 'large'), 1);
select is(
  (select item->>'used' from jsonb_array_elements(public.ai_pool_status()) item where item->>'pool' = 'large'),
  '42000', 'a reservation settles only once, and status reports today''s use');
insert into reservations
  select 'timeout', (public.reserve_ai_pool_tokens('gpt-6-luna', 'analyst_answer', 1000)->>'reservation_id')::bigint;
select public.settle_ai_pool_tokens((select id from reservations where name = 'timeout'), null);
select is(
  (select item->>'used' from jsonb_array_elements(public.ai_pool_status()) item where item->>'pool' = 'large'),
  '43000', 'unknown usage keeps the full reserved size');
select is(
  (select item->>'budget' from jsonb_array_elements(public.ai_pool_status()) item where item->>'pool' = 'small'),
  '2250000', 'status reports the small pool stop point');
select throws_ok($$select * from public.ai_pool_usage$$, '42501', null,
  'accounts cannot read the ledger directly');

select is(public.reserve_ai_analyst_request_result('freeform', 'gpt-5.6-terra')->>'status',
  'reserved', 'Analyst accepts an exact pooled model');
select is(public.reserve_ai_analyst_request_result('freeform', 'gpt-4o')->>'status',
  'invalid_model', 'Analyst refuses an alias');
select public.finish_ai_analyst_request(
  (public.reserve_ai_analyst_request_result('freeform', 'gpt-6-luna')->>'request_id')::bigint,
  'pool_exhausted');
reset role;
select is(
  (select count(*) from public.ai_analyst_requests where outcome = 'pool_exhausted'),
  1::bigint, 'a refused pool is recorded as its own outcome');

select * from finish();
rollback;
