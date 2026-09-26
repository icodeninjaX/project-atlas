begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
 ('b1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','decision-a@example.test','',now(),now(),now(),'{}','{}'),
 ('b1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','decision-b@example.test','',now(),now(),now(),'{}','{}');
insert into public.goals (id,user_id,title,area) values
 ('b1100000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Learn Next.js','learning'),
 ('b1100000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','Other goal','personal');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok($$insert into public.decisions(id,user_id,title,decision_on,intent,expected_outcome,review_on,goal_id,metric_key)
 values ('b1200000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Study daily','2026-09-01','Read one lesson','Finish one project','2026-10-01','b1100000-0000-4000-8000-000000000001','knowledge_reviews')$$,
 'owner can record a decision linked to own goal');
select is((select count(*) from public.decisions),1::bigint,'owner reads own decision');
select throws_ok($$insert into public.decisions(user_id,title,decision_on,intent,expected_outcome,review_on,goal_id)
 values ('b1000000-0000-4000-8000-000000000001','Foreign link','2026-09-01','Act','Result','2026-10-01','b1100000-0000-4000-8000-000000000002')$$,
 '23503',null,'foreign goal link rejected');
select throws_ok($$insert into public.decisions(user_id,title,decision_on,intent,expected_outcome,review_on)
 values ('b1000000-0000-4000-8000-000000000002','Forged owner','2026-09-01','Act','Result','2026-10-01')$$,
 '42501',null,'foreign owner insert rejected');
select throws_ok($$insert into public.decisions(user_id,title,decision_on,intent,expected_outcome,review_on)
 values ('b1000000-0000-4000-8000-000000000001','Bad date','2026-10-01','Act','Result','2026-09-01')$$,
 '23514',null,'review before decision rejected');
select lives_ok($$insert into public.decision_observations(id,user_id,decision_id,observed_on,note)
 values ('b1300000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','b1200000-0000-4000-8000-000000000001','2026-09-10','Finished three lessons')$$,
 'owner adds observation');
select is((select count(*) from public.decision_observations),1::bigint,'owner reads observation');
select throws_ok($$insert into public.decision_observations(user_id,decision_id,observed_on,note)
 values ('b1000000-0000-4000-8000-000000000001','b1200000-0000-4000-8000-000000000001','2026-08-31','Too early')$$,
 '23514','Observation precedes decision','observation cannot precede decision');
select throws_ok($$update public.decisions set decision_on='2026-09-11'
 where id='b1200000-0000-4000-8000-000000000001'$$,
 '23514','Decision date follows an observation','date revision cannot move past observation');
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.decisions),0::bigint,'other owner cannot read decision');
select is((select count(*) from public.decision_observations),0::bigint,'other owner cannot read observation');
with changed as (update public.decisions set title='Hijacked' where id='b1200000-0000-4000-8000-000000000001' returning id)
select is((select count(*) from changed),0::bigint,'other owner cannot update decision');
with removed as (delete from public.decision_observations where id='b1300000-0000-4000-8000-000000000001' returning id)
select is((select count(*) from removed),0::bigint,'other owner cannot delete observation');
select throws_ok($$insert into public.decision_observations(user_id,decision_id,observed_on,note)
 values ('b1000000-0000-4000-8000-000000000002','b1200000-0000-4000-8000-000000000001','2026-09-10','Foreign note')$$,
 '23503',null,'foreign decision reference rejected');
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
with removed as (delete from public.goals where id='b1100000-0000-4000-8000-000000000001' returning id)
select is((select count(*) from removed),1::bigint,'owner deletes linked goal');
select is((select goal_id from public.decisions where id='b1200000-0000-4000-8000-000000000001'),null::uuid,'goal deletion clears optional link');
with removed as (delete from public.decisions where id='b1200000-0000-4000-8000-000000000001' returning id)
select is((select count(*) from removed),1::bigint,'owner deletes decision');
select is((select count(*) from public.decision_observations),0::bigint,'deletion cascades to observations');

select * from finish();
rollback;
