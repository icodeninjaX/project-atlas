begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
) values
  ('99000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'knowledge-a@example.test', '', now(), now(), now(), '{}', '{}'),
  ('99000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'knowledge-b@example.test', '', now(), now(), now(), '{}', '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into public.knowledge_concepts(id, user_id, title, notes, category)
values ('99100000-0000-4000-8000-000000000001', '99000000-0000-4000-8000-000000000001', 'Compound interest', 'Interest earns interest.', 'Finance');

select is((select count(*) from public.knowledge_concepts), 1::bigint, 'the owner can read their concept');
select is((select confidence from public.knowledge_concepts where id = '99100000-0000-4000-8000-000000000001'), 1::smallint, 'new concepts begin at confidence one');

select lives_ok(
  $$select public.review_knowledge_concept('99100000-0000-4000-8000-000000000001', 'good', 'Growth on principal and prior interest')$$,
  'an owner can record a valid review atomically'
);
select is((select interval_days from public.knowledge_concepts where id = '99100000-0000-4000-8000-000000000001'), 3, 'Good starts a three-day interval');
select is((select count(*) from public.knowledge_reviews where concept_id = '99100000-0000-4000-8000-000000000001'), 1::bigint, 'review history is preserved');
select is((select review_count from public.knowledge_concepts where id = '99100000-0000-4000-8000-000000000001'), 1, 'the concept review count updates');

select set_config('request.jwt.claims', '{"sub":"99000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.knowledge_concepts), 0::bigint, 'RLS hides another owner concepts');
select throws_ok(
  $$select public.review_knowledge_concept('99100000-0000-4000-8000-000000000001', 'easy', null)$$,
  'P0001', 'Knowledge concept not found', 'another owner cannot review the concept'
);

select * from finish();
rollback;
