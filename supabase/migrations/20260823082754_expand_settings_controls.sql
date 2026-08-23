begin;

alter table public.user_preferences
  add column home_route text not null default '/dashboard'
    check (home_route in ('/dashboard', '/tasks', '/money/accounts', '/money/transactions', '/debts', '/career', '/reviews')),
  add column default_task_priority text not null default 'medium'
    check (default_task_priority in ('low', 'medium', 'high', 'critical')),
  add column default_task_estimated_minutes smallint
    check (default_task_estimated_minutes between 1 and 1440),
  add column default_account_id uuid,
  add column reminders_enabled boolean not null default false,
  add column task_reminders boolean not null default true,
  add column debt_reminders boolean not null default true,
  add column payday_reminders boolean not null default true,
  add column review_reminders boolean not null default true,
  add column quiet_hours_start time not null default '22:00',
  add column quiet_hours_end time not null default '07:00';

alter table public.user_preferences
  add constraint user_preferences_default_account_owner_fk
  foreign key (default_account_id, user_id)
  references public.financial_accounts(id, user_id)
  on delete set null (default_account_id);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null check (char_length(endpoint) between 1 and 2048),
  p256dh text not null check (char_length(p256dh) between 1 and 512),
  auth text not null check (char_length(auth) between 1 and 512),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, endpoint)
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delivery_key text not null check (char_length(delivery_key) between 1 and 160),
  notification_type text not null check (notification_type in ('daily_digest')),
  delivered_at timestamptz not null default timezone('utc', now()),
  unique (user_id, delivery_key)
);

create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function private.set_updated_at();

create index push_subscriptions_user_idx
on public.push_subscriptions(user_id);

create index notification_deliveries_user_date_idx
on public.notification_deliveries(user_id, delivered_at desc);

alter table public.push_subscriptions enable row level security;
alter table public.push_subscriptions force row level security;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;
create policy push_subscriptions_select
on public.push_subscriptions for select to authenticated
using ((select auth.uid()) = user_id);
create policy push_subscriptions_insert
on public.push_subscriptions for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy push_subscriptions_update
on public.push_subscriptions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy push_subscriptions_delete
on public.push_subscriptions for delete to authenticated
using ((select auth.uid()) = user_id);

alter table public.notification_deliveries enable row level security;
alter table public.notification_deliveries force row level security;
revoke all on table public.notification_deliveries from public, anon, authenticated;

commit;
