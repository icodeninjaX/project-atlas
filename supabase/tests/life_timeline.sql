begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('95000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'timeline-a@example.test', '', now(), now(), now(), '{}', '{}'),
  ('95000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'timeline-b@example.test', '', now(), now(), now(), '{}', '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"95000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into public.financial_accounts (id, user_id, name, account_type)
values ('95100000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', 'Timeline wallet', 'cash');

insert into public.transaction_categories (id, user_id, name, category_type)
values ('95200000-0000-4000-8000-000000000001', '95000000-0000-4000-8000-000000000001', 'Timeline food', 'expense');

insert into public.transactions (
  id, user_id, account_id, category_id, transaction_type, amount_centavos,
  transaction_date, merchant_or_source
)
values (
  '95300000-0000-4000-8000-000000000001',
  '95000000-0000-4000-8000-000000000001',
  '95100000-0000-4000-8000-000000000001',
  '95200000-0000-4000-8000-000000000001',
  'expense', 12000, '2026-09-05', 'Market'
);

select is(
  (select count(*) from public.life_timeline(p_module := 'money') where event_type = 'expense_recorded'),
  1::bigint,
  'a money transaction creates one normalized timeline event'
);

select is(
  (select amount_centavos from public.life_timeline(p_module := 'money') where event_type = 'expense_recorded'),
  12000::bigint,
  'the normalized event preserves its centavo amount'
);

update public.transactions
set amount_centavos = 15000
where id = '95300000-0000-4000-8000-000000000001';

select is(
  (select count(*) from public.life_timeline(p_module := 'money') where event_type = 'expense_recorded'),
  1::bigint,
  'editing a source record updates its presentation snapshot without duplication'
);

select is(
  (select amount_centavos from public.life_timeline(p_module := 'money') where event_type = 'expense_recorded'),
  15000::bigint,
  'the updated snapshot is visible through the owner-scoped RPC'
);

delete from public.transactions where id = '95300000-0000-4000-8000-000000000001';

select is(
  (select count(*) from public.life_timeline(p_module := 'money') where event_type = 'expense_recorded'),
  1::bigint,
  'deleting a source record keeps its timeline snapshot'
);

select ok(
  not (select source_available from public.life_timeline(p_module := 'money') where event_type = 'expense_recorded')
  and (select source_href from public.life_timeline(p_module := 'money') where event_type = 'expense_recorded') is null,
  'a deleted source is unavailable and no longer exposes a source link'
);

select set_config('request.jwt.claims', '{"sub":"95000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is(
  (select count(*) from public.life_timeline()),
  0::bigint,
  'the timeline RPC cannot expose another owner events'
);

select throws_ok(
  $$insert into public.activity_log (user_id, action, entity_type, entity_id, metadata, occurred_on, occurred_at, occurred_precision, module, title)
    values ('95000000-0000-4000-8000-000000000002', 'forged', 'tasks', '95100000-0000-4000-8000-000000000001', '{}', current_date, now(), 'timestamp', 'tasks', 'Forged')$$,
  '42501',
  null,
  'authenticated clients cannot insert timeline audit rows directly'
);

select * from finish();
rollback;
