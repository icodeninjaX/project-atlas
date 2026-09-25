begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
 ('b1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','action-a@example.test','',now(),now(),now(),'{}','{}'),
 ('b1000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','action-b@example.test','',now(),now(),now(),'{}','{}');

insert into public.job_applications (id,user_id,company_name,role_title,stage,next_action,next_action_at)
values
 ('b1100000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Acme','Engineer','applied','Email hiring manager',now() - interval '1 day'),
 ('b1100000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001','Beta','Engineer','applied','Check response',now() - interval '1 day'),
 ('b1100000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000001','Gamma','Engineer','applied','Check response',now() - interval '1 day');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is(public.choose_career_followup('b1100000-0000-4000-8000-000000000001',
  now() - interval '1 day',
  now(), 'confirmed'), 'stale', 'foreign application cannot be executed');

select set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is(public.choose_career_followup('b1100000-0000-4000-8000-000000000001',
  (select next_action_at from public.job_applications where id='b1100000-0000-4000-8000-000000000001'),
  (select updated_at from public.job_applications where id='b1100000-0000-4000-8000-000000000001'),
  'confirmed'), 'confirmed', 'explicit confirmation creates task');
select is((select count(*) from public.tasks where source_module='next_best_action'),1::bigint,'one task was created');
select is((select scheduled_for from public.tasks where source_module='next_best_action'),
  (now() at time zone 'Asia/Manila')::date,'overdue follow-up is scheduled today');
select is(public.choose_career_followup('b1100000-0000-4000-8000-000000000001',
  (select next_action_at from public.job_applications where id='b1100000-0000-4000-8000-000000000001'),
  (select updated_at from public.job_applications where id='b1100000-0000-4000-8000-000000000001'),
  'confirmed'), 'already_confirmed', 'repeated confirmation is idempotent');
select is((select count(*) from public.tasks where source_module='next_best_action'),1::bigint,'duplicate did not create another task');
select is(public.choose_career_followup('b1100000-0000-4000-8000-000000000002',
  (select next_action_at from public.job_applications where id='b1100000-0000-4000-8000-000000000002'),
  (select updated_at from public.job_applications where id='b1100000-0000-4000-8000-000000000002'),
  'dismissed'), 'dismissed', 'dismissal is recorded');
select is((select count(*) from public.tasks where source_module='next_best_action'),1::bigint,'dismissal did not create a task');
select is(public.choose_career_followup('b1100000-0000-4000-8000-000000000003',
  (select next_action_at from public.job_applications where id='b1100000-0000-4000-8000-000000000003'),
  now() - interval '10 days', 'confirmed'), 'stale', 'changed application cannot be executed');
update public.job_applications set stage='rejected'
  where id='b1100000-0000-4000-8000-000000000003';
select is(public.choose_career_followup('b1100000-0000-4000-8000-000000000003',
  (select next_action_at from public.job_applications where id='b1100000-0000-4000-8000-000000000003'),
  (select updated_at from public.job_applications where id='b1100000-0000-4000-8000-000000000003'),
  'confirmed'), 'stale', 'terminal application cannot be executed');
select ok(not has_table_privilege('authenticated','public.next_best_action_choices','INSERT'),
  'choices cannot be forged by direct insert');

select * from finish();
rollback;
