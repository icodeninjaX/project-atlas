begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('be000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mfa-a@example.test','',now(),now(),now(),'{}','{}'),
       ('be000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mfa-b@example.test','',now(),now(),now(),'{}','{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"be000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);
insert into public.tasks(id,user_id,title,status,priority)
values ('bf000000-0000-4000-8000-000000000001', auth.uid(), 'Private MFA task','inbox','medium');
select is((select count(*) from public.tasks), 1::bigint, 'no factor: AAL1 owner access remains available');

reset role;
insert into auth.mfa_factors(id,user_id,factor_type,status,created_at,updated_at)
values ('bf000000-0000-4000-8000-000000000002','be000000-0000-4000-8000-000000000001','totp','unverified',now(),now());
set local role authenticated;
select is((select count(*) from public.tasks), 1::bigint, 'unverified enrollment does not lock the owner out');
reset role;
update auth.mfa_factors set status='verified' where id='bf000000-0000-4000-8000-000000000002';
set local role authenticated;
select is((select count(*) from public.tasks), 0::bigint, 'stale AAL1 JWT cannot read after factor verification');
select throws_ok($$insert into public.tasks(user_id,title,status,priority) values(auth.uid(),'Blocked','inbox','medium')$$, '42501', null, 'AAL1 cannot write');
with changed as (update public.tasks set title='Blocked' returning id) select is((select count(*) from changed), 0::bigint, 'AAL1 cannot update');
with removed as (delete from public.tasks returning id) select is((select count(*) from removed), 0::bigint, 'AAL1 cannot delete');

select throws_ok($$select public.review_knowledge_concept(null,'good',null)$$, '42501', 'MFA required', 'knowledge definer enforces MFA');
select throws_ok($$select public.reserve_ai_capture_request()$$, '42501', 'MFA required', 'capture quota definer enforces MFA');
select throws_ok($$select public.reserve_ai_analyst_request('spending_change','gpt-4o-mini-2024-07-18')$$, '42501', 'MFA required', 'legacy analyst quota enforces MFA');
select throws_ok($$select public.reserve_ai_analyst_request_result('spending_change','gpt-4o-mini-2024-07-18')$$, '42501', 'MFA required', 'typed analyst quota enforces MFA');
select throws_ok($$select public.finish_ai_analyst_request(1,'success')$$, '42501', 'MFA required', 'analyst completion enforces MFA');
select throws_ok($$select public.choose_career_followup(null,null,null,'confirmed')$$, '42501', 'MFA required', 'career definer enforces MFA');
select throws_ok($$select public.claim_capture_preview(null,'create')$$, '42501', 'MFA required', 'capture claim enforces MFA');
select throws_ok($$select public.ai_pool_status()$$, '42501', 'MFA required', 'pool status definer enforces MFA');
select throws_ok($$select public.finish_capture_preview(null,'saved','test')$$, '42501', 'MFA required', 'capture finish enforces MFA');

select set_config('request.jwt.claims', '{"sub":"be000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*) from public.tasks), 0::bigint, 'missing assurance fails closed for enrolled owner');
select set_config('request.jwt.claims', '{"sub":"be000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}', true);
select is((select count(*) from public.tasks), 1::bigint, 'verified AAL2 owner retains access');
select lives_ok($$update public.tasks set title='Allowed' where user_id=auth.uid()$$, 'AAL2 owner can update');
select is(public.reserve_ai_analyst_request_result('spending_change','gpt-4o-mini-2024-07-18')->>'status', 'reserved', 'AAL2 definer retains legitimate behavior');
select lives_ok($$select public.ai_pool_status()$$, 'AAL2 pool status remains available');
select is(public.reserve_ai_analyst_request_result('freeform','gpt-6-sol')->>'status', 'reserved', 'current model remains allowed');
select lives_ok($$select public.finish_ai_analyst_request(((public.reserve_ai_analyst_request_result('freeform','gpt-6-sol')->>'request_id')::bigint), 'pool_exhausted')$$, 'pool exhausted outcome remains accepted');
select set_config('request.jwt.claims', '{"sub":"be000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}', true);
select is((select count(*) from public.tasks), 0::bigint, 'AAL2 never bypasses owner isolation');
reset role;
-- Some local setups omit service-role table grants. Isolate RLS behavior from
-- deployment-specific privileges, and roll this fixture grant back below.
grant select on public.tasks to service_role;
set local role service_role;
select is((select count(*) from public.tasks where id='bf000000-0000-4000-8000-000000000001'), 1::bigint, 'service-role schedulers retain access');
reset role;

select is((select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and not exists (select 1 from pg_policy p where p.polrelid=c.oid and p.polname='Require enrolled MFA' and not p.polpermissive)), 0::bigint, 'every private table has restrictive MFA enforcement');
select * from finish();
rollback;
