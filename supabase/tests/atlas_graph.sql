begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
 ('a1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','graph-a@example.test','',now(),now(),now(),'{}','{}'),
 ('a1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','graph-b@example.test','',now(),now(),now(),'{}','{}');

insert into public.goals (id,user_id,title,area) values
 ('a1100000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Find work','career'),
 ('a1100000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','Other goal','career');
insert into public.tasks (id,user_id,title,related_goal_id) values
 ('a1300000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Prepare CV','a1100000-0000-4000-8000-000000000001');
insert into public.goal_milestones (id,user_id,goal_id,title) values
 ('a1400000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a1100000-0000-4000-8000-000000000001','Complete portfolio');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.knowledge_concepts (id,user_id,title,notes,category) values
 ('a1200000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Server Actions','Study','Technology');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
insert into public.knowledge_concepts (id,user_id,title,notes,category) values
 ('a1200000-0000-4000-8000-000000000002','a1000000-0000-4000-8000-000000000002','Other knowledge','Study','Technology');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

select lives_ok($$insert into public.atlas_relationships(user_id,source_type,source_id,target_type,target_id,relationship_type) values
 ('a1000000-0000-4000-8000-000000000001','knowledge_concept','a1200000-0000-4000-8000-000000000001','goal','a1100000-0000-4000-8000-000000000001','supports_goal')$$,'owner can link knowledge to goal');
select is((select count(*) from public.atlas_relationships),1::bigint,'owner can read their edge');
select throws_ok($$insert into public.atlas_relationships(user_id,source_type,source_id,target_type,target_id,relationship_type) values
 ('a1000000-0000-4000-8000-000000000001','knowledge_concept','a1200000-0000-4000-8000-000000000002','goal','a1100000-0000-4000-8000-000000000001','supports_goal')$$,'23503','Relationship endpoint unavailable','cross-user source is hidden and rejected');
select throws_ok($$insert into public.atlas_relationships(user_id,source_type,source_id,target_type,target_id,relationship_type) values
 ('a1000000-0000-4000-8000-000000000001','knowledge_concept','a1200000-0000-4000-8000-000000000001','goal','a1100000-0000-4000-8000-000000000002','supports_goal')$$,'23503','Relationship endpoint unavailable','cross-user target is hidden and rejected');
select throws_ok($$insert into public.atlas_relationships(user_id,source_type,source_id,target_type,target_id,relationship_type) values
 ('a1000000-0000-4000-8000-000000000001','project','a1200000-0000-4000-8000-000000000001','goal','a1100000-0000-4000-8000-000000000001','supports_goal')$$,'23503','Relationship endpoint unavailable','unsupported source rejected');
select throws_ok($$insert into public.atlas_relationships(user_id,source_type,source_id,target_type,target_id,relationship_type) values
 ('a1000000-0000-4000-8000-000000000001','knowledge_concept','a1200000-0000-4000-8000-000000000001','project','a1100000-0000-4000-8000-000000000001','supports_goal')$$,'23503','Relationship endpoint unavailable','unsupported target rejected');
select throws_ok($$insert into public.atlas_relationships(user_id,source_type,source_id,target_type,target_id,relationship_type) values
 ('a1000000-0000-4000-8000-000000000001','knowledge_concept','a1200000-0000-4000-8000-000000000001','knowledge_concept','a1200000-0000-4000-8000-000000000001','related_knowledge')$$,'23514',null,'unsupported pair rejected');
select throws_ok($$insert into public.atlas_relationships(user_id,source_type,source_id,target_type,target_id,relationship_type) values
 ('a1000000-0000-4000-8000-000000000001','knowledge_concept','a1200000-0000-4000-8000-000000000001','goal','a1100000-0000-4000-8000-000000000001','supports_goal')$$,'23505',null,'duplicate edge rejected');
select is((select count(*) from public.atlas_relationships where source_type='task'),0::bigint,'native task link is not copied');
select is((select relationship_count from public.atlas_goal_relationship_counts(array['a1100000-0000-4000-8000-000000000001'::uuid]) where entity_type='task'),1::bigint,'native task counted');
select is((select relationship_count from public.atlas_goal_relationship_counts(array['a1100000-0000-4000-8000-000000000001'::uuid]) where entity_type='goal_milestone'),1::bigint,'native milestone counted');
select has_index('public','atlas_relationships','atlas_relationship_source_idx','source index exists');
select has_index('public','atlas_relationships','atlas_relationship_target_idx','target index exists');
select has_index('public','atlas_relationships','atlas_relationship_kind_idx','kind index exists');
select ok(not has_table_privilege('authenticated','public.atlas_relationships','UPDATE'),'relationship updates are not granted');

select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.atlas_relationships),0::bigint,'another owner cannot read edge');
with deleted as (delete from public.atlas_relationships where source_id='a1200000-0000-4000-8000-000000000001' returning id)
select is((select count(*) from deleted),0::bigint,'another owner cannot delete edge');
select set_config('request.jwt.claims','{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
with deleted as (delete from public.atlas_relationships where source_id='a1200000-0000-4000-8000-000000000001' returning id)
select is((select count(*) from deleted),1::bigint,'owner can remove explicit edge');
insert into public.atlas_relationships(user_id,source_type,source_id,target_type,target_id,relationship_type) values
 ('a1000000-0000-4000-8000-000000000001','knowledge_concept','a1200000-0000-4000-8000-000000000001','goal','a1100000-0000-4000-8000-000000000001','supports_goal');
with deleted as (delete from public.knowledge_concepts where id='a1200000-0000-4000-8000-000000000001' returning id)
select is((select count(*) from deleted),1::bigint,'source delete succeeds');
select is((select count(*) from public.atlas_relationships),0::bigint,'source delete removes edge');
insert into public.knowledge_concepts (id,user_id,title,notes,category) values
 ('a1200000-0000-4000-8000-000000000003','a1000000-0000-4000-8000-000000000001','Portfolio guide','Study','Technology');
insert into public.atlas_relationships(user_id,source_type,source_id,target_type,target_id,relationship_type) values
 ('a1000000-0000-4000-8000-000000000001','goal_milestone','a1400000-0000-4000-8000-000000000001','knowledge_concept','a1200000-0000-4000-8000-000000000003','related_knowledge');
with deleted as (delete from public.knowledge_concepts where id='a1200000-0000-4000-8000-000000000003' returning id)
select is((select count(*) from deleted),1::bigint,'target delete succeeds');
select is((select count(*) from public.atlas_relationships),0::bigint,'target delete removes edge');

select * from finish();
rollback;
