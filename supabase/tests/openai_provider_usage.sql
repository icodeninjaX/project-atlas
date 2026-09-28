begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
 ('d9000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','usage-a@example.test','',now(),now(),now(),'{}','{}');

create temp table today as select (now() at time zone 'utc')::date as day;
grant select on today to authenticated, service_role;
create temp table claims (name text primary key, token uuid);
grant all on claims to service_role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d9000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok(
  $$select public.record_ai_pool_provider_usage(gen_random_uuid(), (select day from today), 1, 1)$$,
  '42501', null, 'an account cannot record OpenAI usage');
select throws_ok($$select * from public.ai_pool_provider_usage$$, '42501', null,
  'accounts cannot read the OpenAI usage table');

set local role service_role;
select public.reserve_ai_pool_tokens('d9000000-0000-4000-8000-000000000001', 'gpt-6-sol', 'analyst_answer', 10000);
set local role authenticated;
select is(
  (select item->>'used' from jsonb_array_elements(public.ai_pool_status()) item where item->>'pool' = 'large'),
  '10000', 'without an OpenAI figure the ledger counts');
select is(
  (select item->>'syncedAt' from jsonb_array_elements(public.ai_pool_status()) item where item->>'pool' = 'large'),
  null, 'status says when OpenAI has not been read');

-- OpenAI reports usage the meter never saw, such as earlier requests.
set local role service_role;
insert into claims values ('first', public.claim_ai_pool_provider_sync());
select is(public.record_ai_pool_provider_usage((select token from claims where name = 'first'),
  (select day from today), 150000, 69542,
  '[{"model":"gpt-6-sol","serviceTier":"default","pool":"large","tokens":150000}]'),
  true, 'the claim holder records OpenAI''s figure');
set local role authenticated;
select is(
  (select item->>'used' from jsonb_array_elements(public.ai_pool_status()) item where item->>'pool' = 'large'),
  '160000', 'OpenAI''s figure plus reservations since shortly before it counts');
select is(
  (select item->>'used' from jsonb_array_elements(public.ai_pool_status()) item where item->>'pool' = 'small'),
  '69542', 'usage before the meter existed is counted');
select isnt(
  (select item->>'syncedAt' from jsonb_array_elements(public.ai_pool_status()) item where item->>'pool' = 'large'),
  null, 'status reports when OpenAI was read');

-- Reservations use the combined figure against the stop point (225,000).
set local role service_role;
select is(public.reserve_ai_pool_tokens('d9000000-0000-4000-8000-000000000001', 'gpt-5.4-2026-03-05', 'analyst_answer', 70000)->>'status',
  'exhausted', 'a reservation past the combined figure is refused');

-- A lower OpenAI figure never drops below the meter's own ledger.
select public.record_ai_pool_provider_usage((select token from claims where name = 'first'),
  (select day from today), 0, 0);
select public.release_ai_pool_provider_sync((select token from claims where name = 'first'));
set local role authenticated;
select is(
  (select item->>'used' from jsonb_array_elements(public.ai_pool_status()) item where item->>'pool' = 'large'),
  '10000', 'the ledger is a floor under OpenAI''s figure');

-- Only one caller at a time may refresh from OpenAI.
set local role authenticated;
select throws_ok($$select public.claim_ai_pool_provider_sync()$$, '42501', null,
  'an account cannot claim a refresh');
set local role service_role;
insert into claims values ('second', public.claim_ai_pool_provider_sync());
select isnt((select token from claims where name = 'second'), null,
  'the first caller claims the refresh');
select is(public.claim_ai_pool_provider_sync(), null, 'a second caller waits instead');
select is((public.ai_pool_provider_sync_state()->>'claimActive')::boolean, true,
  'waiting callers see an active claim');
select isnt(public.ai_pool_provider_sync_state()->>'syncedAt', null,
  'waiting callers see when the figure was recorded');
select ok((public.ai_pool_provider_sync_state()->>'claimRemainingMs')::bigint between 1 and 15000,
  'waiting callers see how long the claim has left');
reset role;
update public.ai_pool_provider_sync set claimed_at = now() - interval '20 seconds';
set local role service_role;
insert into claims values ('third', public.claim_ai_pool_provider_sync());
select isnt((select token from claims where name = 'third'), null,
  'a lapsed claim can be taken again');
-- The stalled holder of the lapsed claim can neither record nor release.
select is(public.record_ai_pool_provider_usage((select token from claims where name = 'second'),
  (select day from today), 1, 1), false, 'a lapsed claim cannot record a figure');
select public.release_ai_pool_provider_sync((select token from claims where name = 'second'));
select is((public.ai_pool_provider_sync_state()->>'claimActive')::boolean, true,
  'a lapsed claim cannot release the newer one');
select is(public.claim_ai_pool_provider_sync(), null,
  'the newer claim still holds after the stale release');
select public.release_ai_pool_provider_sync((select token from claims where name = 'third'));
select is((public.ai_pool_provider_sync_state()->>'claimActive')::boolean, false,
  'a finished refresh releases its claim');
select is((public.ai_pool_provider_sync_state()->>'claimRemainingMs')::bigint, 0::bigint,
  'a released claim has no time left');
insert into claims values ('fourth', public.claim_ai_pool_provider_sync());
select isnt((select token from claims where name = 'fourth'), null,
  'the next refresh can claim at once');
reset role;
update public.ai_pool_provider_sync set claimed_at = now() - interval '20 seconds';
set local role service_role;
-- Even with no newer claim, a claim past its lease cannot record.
select is(public.record_ai_pool_provider_usage(
  (select token from claims where name = 'fourth'),
  (select day from today), 1, 1), false, 'an expired claim cannot record a figure');

select * from finish();
rollback;
