alter table public.notification_deliveries
  drop constraint notification_deliveries_notification_type_check;

alter table public.notification_deliveries
  add constraint notification_deliveries_notification_type_check
  check (notification_type in ('daily_digest', 'task_due'));

create index if not exists tasks_task_reminder_schedule_idx
  on public.tasks(scheduled_for, scheduled_time, user_id)
  where scheduled_time is not null
    and status not in ('completed', 'cancelled');

create table private.task_reminder_scheduler_config (
  singleton boolean primary key default true check (singleton),
  endpoint text not null check (endpoint ~ '^https://'),
  bearer_token text not null check (char_length(bearer_token) >= 32),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

revoke all on table private.task_reminder_scheduler_config
from public, anon, authenticated;

insert into private.task_reminder_scheduler_config (
  singleton,
  endpoint,
  bearer_token
)
values (
  true,
  'https://atlas.kdvwebsiteservices.com/api/cron/task-reminders',
  encode(extensions.gen_random_bytes(32), 'hex')
)
on conflict (singleton) do update
set endpoint = excluded.endpoint,
    updated_at = timezone('utc', now());

create or replace function public.validate_task_reminder_scheduler_secret(
  p_secret text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select extensions.digest(config.bearer_token, 'sha256') =
        extensions.digest(p_secret, 'sha256')
      from private.task_reminder_scheduler_config config
      where config.singleton
    ),
    false
  );
$$;

revoke all on function public.validate_task_reminder_scheduler_secret(text)
from public, anon, authenticated;
grant execute on function public.validate_task_reminder_scheduler_secret(text)
to service_role;
