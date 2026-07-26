begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
values
  ('90000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'atlas-a@example.test', '', now(), now(), now(), '{}', '{}'),
  ('90000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'atlas-b@example.test', '', now(), now(), now(), '{}', '{}');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"90000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

insert into public.tasks(id, user_id, title, status, priority)
values ('91000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', 'User A task', 'inbox', 'medium');

select is((select count(*) from public.tasks where id = '91000000-0000-4000-8000-000000000001'), 1::bigint, 'owner can read own task');

insert into public.debts(id, user_id, creditor_name, debt_type, original_balance_centavos, current_balance_centavos, status)
values ('92000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', 'Test debt', 'other', 100000, 100000, 'active');

insert into public.debt_payments(id, user_id, debt_id, amount_centavos, payment_date)
values ('93000000-0000-4000-8000-000000000001', '90000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 25000, current_date);

select is((select current_balance_centavos from public.debts where id = '92000000-0000-4000-8000-000000000001'), 75000::bigint, 'payment reduces debt balance');

update public.debt_payments set amount_centavos = 10000 where id = '93000000-0000-4000-8000-000000000001';
select is((select current_balance_centavos from public.debts where id = '92000000-0000-4000-8000-000000000001'), 90000::bigint, 'editing payment recalculates debt balance');

delete from public.debt_payments where id = '93000000-0000-4000-8000-000000000001';
select is((select current_balance_centavos from public.debts where id = '92000000-0000-4000-8000-000000000001'), 100000::bigint, 'deleting payment restores debt balance');

insert into public.debt_payments(id, user_id, debt_id, amount_centavos, payment_date)
values ('93000000-0000-4000-8000-000000000002', '90000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000001', 100000, current_date);
select is((select status from public.debts where id = '92000000-0000-4000-8000-000000000001'), 'paid', 'zero balance marks debt paid');

delete from public.debt_payments where id = '93000000-0000-4000-8000-000000000002';
select is((select status from public.debts where id = '92000000-0000-4000-8000-000000000001'), 'active', 'removing final payment reopens debt');

select set_config('request.jwt.claims', '{"sub":"90000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select is((select count(*) from public.tasks where id = '91000000-0000-4000-8000-000000000001'), 0::bigint, 'other user cannot read owner task');
select is((select count(*) from public.debts where id = '92000000-0000-4000-8000-000000000001'), 0::bigint, 'other user cannot read owner debt');

select * from finish();
rollback;
