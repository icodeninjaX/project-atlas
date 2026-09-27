begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
 ('d9000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','usage-a@example.test','',now(),now(),now(),'{}','{}');

create temp table today as select (now() at time zone 'utc')::date as day;
grant select on today to authenticated, service_role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"d9000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select throws_ok(
  $$select public.record_ai_pool_provider_usage((select day from today), 1, 1)$$,
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
select public.record_ai_pool_provider_usage((select day from today), 150000, 69542,
  '[{"model":"gpt-6-sol","serviceTier":"default","pool":"large","tokens":150000}]');
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
select public.record_ai_pool_provider_usage((select day from today), 0, 0);
set local role authenticated;
select is(
  (select item->>'used' from jsonb_array_elements(public.ai_pool_status()) item where item->>'pool' = 'large'),
  '10000', 'the ledger is a floor under OpenAI''s figure');

-- Only one caller at a time may refresh from OpenAI.
set local role authenticated;
select throws_ok($$select public.claim_ai_pool_provider_sync()$$, '42501', null,
  'an account cannot claim a refresh');
set local role service_role;
select is(public.claim_ai_pool_provider_sync(), true, 'the first caller claims the refresh');
select is(public.claim_ai_pool_provider_sync(), false, 'a second caller waits instead');
reset role;
update public.ai_pool_provider_sync set claimed_at = now() - interval '20 seconds';
set local role service_role;
select is(public.claim_ai_pool_provider_sync(), true, 'a lapsed claim can be taken again');
select is((public.ai_pool_provider_sync_state()->>'claimActive')::boolean, true,
  'waiting callers see an active claim');
select isnt(public.ai_pool_provider_sync_state()->>'syncedAt', null,
  'waiting callers see when the figure was recorded');
select public.release_ai_pool_provider_sync();
select is((public.ai_pool_provider_sync_state()->>'claimActive')::boolean, false,
  'a finished refresh releases its claim');
select is(public.claim_ai_pool_provider_sync(), true, 'the next refresh can claim at once');

select * from finish();
rollback;
