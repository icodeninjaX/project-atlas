begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('c1000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','harden-a@example.test','',now(),now(),now(),'{}','{}');

select is(
  (select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public'),
  0::bigint,
  'anon holds no privileges on public tables or views'
);
select is(
  (select count(*) from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public' and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')),
  0::bigint,
  'authenticated cannot truncate past RLS'
);
select ok(
  not has_function_privilege('anon', 'public.analyst_memories_limit()', 'execute'),
  'anon cannot execute the memory limit trigger function'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c1000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}', true);

select throws_ok(
  $$insert into public.job_applications(user_id, company_name, role_title, job_url) values (auth.uid(), 'Co', 'Role', 'javascript:alert(document.cookie)')$$,
  '23514', null, 'a javascript: job link is rejected'
);
select throws_ok(
  $$insert into public.job_applications(user_id, company_name, role_title, job_url) values (auth.uid(), 'Co', 'Role', 'data:text/html,<script>alert(1)</script>')$$,
  '23514', null, 'a data: job link is rejected'
);
select lives_ok(
  $$insert into public.job_applications(user_id, company_name, role_title, job_url) values (auth.uid(), 'Co', 'Role', 'https://jobs.example.test/42')$$,
  'an https job link is stored'
);
select lives_ok(
  $$insert into public.job_applications(user_id, company_name, role_title) values (auth.uid(), 'Co', 'Role')$$,
  'a job application without a link is stored'
);

select * from finish();
rollback;
