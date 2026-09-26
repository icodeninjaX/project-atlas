begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data)
values
 ('c1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','outcome-a@example.test','',now(),now(),now(),'{}','{}'),
 ('c1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','outcome-b@example.test','',now(),now(),now(),'{}','{}');
insert into public.goals(id,user_id,title,area) values
 ('c1100000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Find work','career');
insert into public.tasks(id,user_id,title,status,completed_at) values
 ('c1200000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Apply to jobs','completed','2026-09-10T02:00:00Z'),
 ('c1200000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000002','Other task','inbox',null);
insert into public.financial_accounts(id,user_id,name,account_type) values
 ('c1300000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Wallet','cash');
insert into public.transaction_categories(id,user_id,name,category_type) values
 ('c1400000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Outcome groceries','expense');
insert into public.transactions(id,user_id,account_id,category_id,transaction_type,amount_centavos,transaction_date,merchant_or_source)
values ('c1500000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','c1300000-0000-4000-8000-000000000001','c1400000-0000-4000-8000-000000000001','expense',12000,'2026-09-10','Market');
insert into public.job_applications(id,user_id,company_name,role_title) values
 ('c1600000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Acme','Developer');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$insert into public.decisions(id,user_id,title,decision_on,intent,expected_outcome,review_on,goal_id,action_task_id,metric_key)
 values ('c1700000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','Apply weekly','2026-09-01','Ten applications a week','More interviews','2026-09-20','c1100000-0000-4000-8000-000000000001','c1200000-0000-4000-8000-000000000001','task_completions')$$,
 'owner can link a decision to a task and goal');
select throws_ok($$update public.decisions set action_task_id='c1200000-0000-4000-8000-000000000002' where id='c1700000-0000-4000-8000-000000000001'$$,
 '23503',null,'foreign action task rejected');
select lives_ok($$insert into public.decision_observations(id,user_id,decision_id,observed_on,note,source_transaction_id)
 values ('c1800000-0000-4000-8000-000000000001','c1000000-0000-4000-8000-000000000001','c1700000-0000-4000-8000-000000000001','2026-09-10','Spent less','c1500000-0000-4000-8000-000000000001')$$,
 'observation cites an owned transaction');
select lives_ok($$insert into public.decision_observations(id,user_id,decision_id,observed_on,note,source_application_id)
 values ('c1800000-0000-4000-8000-000000000002','c1000000-0000-4000-8000-000000000001','c1700000-0000-4000-8000-000000000001','2026-09-11','Applied to Acme','c1600000-0000-4000-8000-000000000001')$$,
 'observation cites an owned application');
select throws_ok($$insert into public.decision_observations(user_id,decision_id,observed_on,note,source_task_id)
 values ('c1000000-0000-4000-8000-000000000001','c1700000-0000-4000-8000-000000000001','2026-09-12','Foreign task','c1200000-0000-4000-8000-000000000002')$$,
 '23503',null,'foreign observation source rejected');
select throws_ok($$insert into public.decision_observations(user_id,decision_id,observed_on,note,source_task_id,source_transaction_id)
 values ('c1000000-0000-4000-8000-000000000001','c1700000-0000-4000-8000-000000000001','2026-09-12','Two sources','c1200000-0000-4000-8000-000000000001','c1500000-0000-4000-8000-000000000001')$$,
 '23514',null,'observation accepts at most one cited source');
select is((select relationship_count from public.atlas_goal_relationship_counts(array['c1100000-0000-4000-8000-000000000001'::uuid]) where entity_type='decision'),1::bigint,'Graph goal count includes decision');
select is((select count(*) from public.life_timeline(p_module := 'decisions') where event_type='decision_recorded'),1::bigint,'decision appears in Timeline');
select is((select count(*) from public.life_timeline(p_module := 'decisions') where event_type='decision_observation'),2::bigint,'observations appear in Timeline');
select is((select source_id from public.decision_metric_sources('expense_centavos','2026-09-01','2026-09-20',51) limit 1),'c1500000-0000-4000-8000-000000000001'::uuid,'metric source returns inspectable owner record');
select throws_ok($$select * from public.decision_metric_sources('expense_centavos','2026-08-01','2026-09-20',51)$$,
 '22023','Invalid decision source request','source date range is bounded');
update public.decisions set intent='Five targeted applications a week', assumptions='Job market is stable' where id='c1700000-0000-4000-8000-000000000001';
select is((select count(*) from public.decision_revisions where decision_id='c1700000-0000-4000-8000-000000000001'),1::bigint,'changed plan creates one revision');
select is((select previous_intent from public.decision_revisions where decision_id='c1700000-0000-4000-8000-000000000001'),'Ten applications a week','prior intent remains inspectable');
select is((select previous_assumptions from public.decision_revisions where decision_id='c1700000-0000-4000-8000-000000000001'),null::text,'prior unstated assumptions remain inspectable');
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.life_timeline(p_module := 'decisions')),0::bigint,'Timeline hides another owner');
select is((select count(*) from public.decision_metric_sources('expense_centavos','2026-09-01','2026-09-20',51)),0::bigint,'source RPC hides another owner');
select is((select count(*) from public.decision_revisions),0::bigint,'revisions are owner-only');
select set_config('request.jwt.claims','{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
with removed as (delete from public.job_applications where id='c1600000-0000-4000-8000-000000000001' returning id)
select is((select count(*) from removed),1::bigint,'owner can delete cited application');
select is((select source_application_id from public.decision_observations where id='c1800000-0000-4000-8000-000000000002'),null::uuid,'source deletion clears observation link');
delete from public.decisions where id='c1700000-0000-4000-8000-000000000001';
select is((select count(*) from public.life_timeline(p_module := 'decisions')),0::bigint,'decision deletion removes Timeline entries');
select is((select count(*) from public.decision_revisions),0::bigint,'decision deletion removes revisions');

select * from finish();
rollback;
