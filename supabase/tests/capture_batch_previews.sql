begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
 ('c2000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','batch-a@example.test','',now(),now(),now(),'{}','{}'),
 ('c2000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','batch-b@example.test','',now(),now(),now(),'{}','{}');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"c2000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
insert into public.capture_batch_previews (id,batch_id,user_id,position,source_phrase,operation,proposal)
values
 ('c2100000-0000-4000-8000-000000000001','c2200000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001',0,'Add a task','create','{}'),
 ('c2100000-0000-4000-8000-000000000002','c2200000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001',1,'Move my task','reschedule_task','{}'),
 ('c2100000-0000-4000-8000-000000000003','c2200000-0000-4000-8000-000000000001','c2000000-0000-4000-8000-000000000001',2,'Expired task','create','{}');
select is((select count(*) from public.capture_batch_previews),3::bigint,'owner sees own batch');
select ok((select expires_at from public.capture_batch_previews where id='c2100000-0000-4000-8000-000000000001')
  between now() + interval '29 minutes' and now() + interval '31 minutes',
  'preview expires in 30 minutes');
select throws_ok(
  $$insert into public.capture_batch_previews (batch_id,user_id,position,source_phrase,operation,proposal)
    values ('c2200000-0000-4000-8000-000000000002',
    'c2000000-0000-4000-8000-000000000001',0,'Oversized','create',
    to_jsonb(repeat('a',8001)))$$,
  '23514',null,'oversized preview payload is refused');
select ok(public.claim_capture_preview('c2100000-0000-4000-8000-000000000001','create') is not null,'owner claims once');
select ok(public.claim_capture_preview('c2100000-0000-4000-8000-000000000001','create') is null,'duplicate claim is refused');
select is(public.finish_capture_preview('c2100000-0000-4000-8000-000000000001','saved','Task saved'),true,'claimed proposal can finish');
select is(public.finish_capture_preview('c2100000-0000-4000-8000-000000000001','saved','Again'),false,'finished proposal cannot finish again');
select is(public.finish_capture_preview('c2100000-0000-4000-8000-000000000002','rejected','No thanks'),true,'pending proposal can be rejected');
select ok(public.claim_capture_preview('c2100000-0000-4000-8000-000000000002','reschedule_task') is null,'rejected proposal cannot be claimed');
select ok(public.claim_capture_preview('c2100000-0000-4000-8000-000000000003','reschedule_task') is null,'wrong operation cannot be claimed');
select ok(not has_table_privilege('authenticated','public.capture_batch_previews','UPDATE'),'clients cannot update preview status');
select set_config('request.jwt.claims','{"sub":"c2000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*) from public.capture_batch_previews),0::bigint,'other owner cannot read batch');
select ok(public.claim_capture_preview('c2100000-0000-4000-8000-000000000003','create') is null,'other owner cannot claim');
select is(public.finish_capture_preview('c2100000-0000-4000-8000-000000000003','rejected','No'),false,'other owner cannot reject');

reset role;
select is((select count(*) from cron.job where jobname = 'atlas-capture-preview-prune'),
  1::bigint,'expiry cleanup is scheduled');
select ok((select command from cron.job where jobname = 'atlas-capture-preview-prune')
  like '%expires_at <= now()%','scheduled cleanup removes expired previews');

select * from finish();
rollback;
