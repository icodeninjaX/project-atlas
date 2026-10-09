begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- owner (MFA), owner without MFA, standard, probation (new), blocked
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('c2000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','guard-owner@example.test','',now(),now() - interval '30 days',now(),'{}','{}'),
       ('c2000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','guard-owner-nomfa@example.test','',now(),now() - interval '30 days',now(),'{}','{}'),
       ('c2000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','guard-standard@example.test','',now(),now() - interval '30 days',now(),'{}','{}'),
       ('c2000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','guard-new@example.test','',now(),now(),now(),'{}','{}'),
       ('c2000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','guard-blocked@example.test','',now(),now() - interval '30 days',now(),'{}','{}');
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
values ('c3000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001','totp','verified',now(),now());
insert into private.ai_user_tiers(user_id, tier) values
  ('c2000000-0000-4000-8000-000000000001','owner'),
  ('c2000000-0000-4000-8000-000000000002','owner'),
  ('c2000000-0000-4000-8000-000000000005','blocked');

select is(private.ai_access_class('c2000000-0000-4000-8000-000000000001'), 'owner', 'owner with verified MFA is an owner');
select is(private.ai_access_class('c2000000-0000-4000-8000-000000000002'), 'standard', 'owner tier without MFA gets no owner perks');
select is(private.ai_access_class('c2000000-0000-4000-8000-000000000003'), 'standard', 'established account is standard');
select is(private.ai_access_class('c2000000-0000-4000-8000-000000000004'), 'probation', 'new account is on probation');
select is(private.ai_access_class('c2000000-0000-4000-8000-000000000005'), 'blocked', 'blocked tier is blocked');

-- Request caps.
insert into public.ai_analyst_requests(user_id, analysis_type, model)
select u, 'spending_change', 'gpt-4o-mini-2024-07-18'
from unnest(array['c2000000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000002','c2000000-0000-4000-8000-000000000003']::uuid[]) u,
     generate_series(1, 8);
insert into public.ai_analyst_requests(user_id, analysis_type, model)
select 'c2000000-0000-4000-8000-000000000004', 'spending_change', 'gpt-4o-mini-2024-07-18' from generate_series(1, 3);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(public.reserve_ai_analyst_request_result('spending_change','gpt-4o-mini-2024-07-18')->>'status', 'hourly_quota', 'standard user stops at 8 per hour');
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is(public.reserve_ai_analyst_request_result('spending_change','gpt-4o-mini-2024-07-18')->>'status', 'hourly_quota', 'owner without MFA keeps standard caps');
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select is(public.reserve_ai_analyst_request_result('spending_change','gpt-4o-mini-2024-07-18')->>'status', 'hourly_quota', 'probation user stops at 3 per hour');
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
select is(public.reserve_ai_analyst_request_result('spending_change','gpt-4o-mini-2024-07-18')->>'status', 'daily_quota', 'blocked user sees an ordinary limit');
select is(public.reserve_ai_capture_request(), false, 'blocked user cannot capture');
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);
select is(public.reserve_ai_analyst_request_result('spending_change','gpt-4o-mini-2024-07-18')->>'status', 'reserved', 'owner is not bound by the hourly cap');
select throws_ok($$select count(*) from private.ai_user_tiers$$, '42501', null, 'users cannot read tiers');
reset role;

-- Other accounts exhausting the site-wide cap cannot lock the owner out.
insert into public.ai_analyst_requests(user_id, analysis_type, model)
select 'c2000000-0000-4000-8000-000000000004', 'spending_change', 'gpt-4o-mini-2024-07-18' from generate_series(1, 300);
set local role authenticated;
select is(public.reserve_ai_analyst_request_result('spending_change','gpt-4o-mini-2024-07-18')->>'status', 'reserved', 'owner bypasses the site-wide cap');
reset role;
delete from public.ai_analyst_requests where user_id = 'c2000000-0000-4000-8000-000000000004';
-- Owner rows do not count toward the site-wide cap.
insert into public.ai_analyst_requests(user_id, analysis_type, model)
select 'c2000000-0000-4000-8000-000000000001', 'spending_change', 'gpt-4o-mini-2024-07-18' from generate_series(1, 300);
delete from public.ai_analyst_requests where user_id = 'c2000000-0000-4000-8000-000000000003';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(public.reserve_ai_analyst_request_result('spending_change','gpt-4o-mini-2024-07-18')->>'status', 'reserved', 'owner usage does not consume the public site cap');
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);
select is(public.reserve_ai_analyst_request_result('spending_change','gpt-4o-mini-2024-07-18')->>'status', 'daily_quota', 'owner still has a runaway ceiling');
reset role;

-- Kill switch.
update private.ai_guard_settings set public_ai_enabled = false;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select is(public.reserve_ai_analyst_request_result('spending_change','gpt-4o-mini-2024-07-18')->>'status', 'site_quota', 'paused AI refuses standard users');
select is(public.reserve_ai_capture_request(), false, 'paused AI refuses standard capture');
select set_config('request.jwt.claims', '{"sub":"c2000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);
select is(public.reserve_ai_capture_request(), true, 'owner capture works while paused');
reset role;
update private.ai_guard_settings set public_ai_enabled = true;

-- Token pools (large budget 225000 = 250000 * 0.9; share 15% = 33750; reserve 20%).
grant execute on function public.reserve_ai_pool_tokens(uuid, text, text, integer) to service_role;
set local role service_role;
select is(public.reserve_ai_pool_tokens('c2000000-0000-4000-8000-000000000003','gpt-5.4-2026-03-05','analyst_answer',30000)->>'status', 'reserved', 'standard user reserves within their share');
select is(public.reserve_ai_pool_tokens('c2000000-0000-4000-8000-000000000003','gpt-5.4-2026-03-05','analyst_answer',5000)->>'status', 'exhausted', 'standard user cannot pass their daily share');
select is(public.reserve_ai_pool_tokens('c2000000-0000-4000-8000-000000000005','gpt-5.4-2026-03-05','analyst_answer',10)->>'status', 'exhausted', 'blocked user gets no pool tokens');
reset role;
-- Fill the pool to the edge of the owner reserve with someone else's usage.
insert into public.ai_pool_usage(user_id, pool, model, feature, usage_day, reserved_tokens, used_tokens, status)
values (null, 'large', 'gpt-5.4-2026-03-05', 'analyst_answer', (now() at time zone 'utc')::date, 150000, 150000, 'settled');
set local role service_role;
select is(public.reserve_ai_pool_tokens('c2000000-0000-4000-8000-000000000002','gpt-5.4-2026-03-05','analyst_answer',1000)->>'status', 'exhausted', 'non-owners cannot spend the owner reserve');
select is(public.reserve_ai_pool_tokens('c2000000-0000-4000-8000-000000000001','gpt-5.4-2026-03-05','analyst_answer',40000)->>'status', 'reserved', 'owner can spend the reserve');
select is(public.reserve_ai_pool_tokens('c2000000-0000-4000-8000-000000000001','gpt-5.4-2026-03-05','analyst_answer',10000)->>'status', 'exhausted', 'owner is still bound by the pool budget');
reset role;

select * from finish();
rollback;
