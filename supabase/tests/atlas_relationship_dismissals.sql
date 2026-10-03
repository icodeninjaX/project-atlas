begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
 ('b1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dismiss-a@example.test','',now(),now(),now(),'{}','{}'),
 ('b1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','dismiss-b@example.test','',now(),now(),now(),'{}','{}');

insert into public.goals (id,user_id,title,area) values
 ('b1100000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Pay off car loan','finance'),
 ('b1100000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','Other goal','finance');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select lives_ok($$insert into public.atlas_relationship_dismissals(goal_id,entity_type,entity_id) values
 ('b1100000-0000-4000-8000-000000000001','debt','b1200000-0000-4000-8000-000000000001')$$,'owner can dismiss a suggestion for their goal');
select is((select count(*) from public.atlas_relationship_dismissals),1::bigint,'owner can read their dismissal');
select throws_ok($$insert into public.atlas_relationship_dismissals(goal_id,entity_type,entity_id) values
 ('b1100000-0000-4000-8000-000000000001','debt','b1200000-0000-4000-8000-000000000001')$$,'23505',null,'duplicate dismissal rejected');
select throws_ok($$insert into public.atlas_relationship_dismissals(goal_id,entity_type,entity_id) values
 ('b1100000-0000-4000-8000-000000000001','weekly_review','b1200000-0000-4000-8000-000000000001')$$,'23514',null,'unsupported entity type rejected');
select throws_ok($$insert into public.atlas_relationship_dismissals(goal_id,entity_type,entity_id) values
 ('b1100000-0000-4000-8000-000000000002','debt','b1200000-0000-4000-8000-000000000001')$$,'42501',null,'another owner''s goal is rejected');
select ok(not has_table_privilege('authenticated','public.atlas_relationship_dismissals','UPDATE'),'dismissal updates are not granted');

select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.atlas_relationship_dismissals),0::bigint,'another owner cannot read dismissals');

select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
with deleted as (delete from public.goals where id='b1100000-0000-4000-8000-000000000001' returning id)
select is((select count(*) from deleted),1::bigint,'goal delete succeeds');
select is((select count(*) from public.atlas_relationship_dismissals),0::bigint,'goal delete removes its dismissals');

select * from finish();
rollback;
