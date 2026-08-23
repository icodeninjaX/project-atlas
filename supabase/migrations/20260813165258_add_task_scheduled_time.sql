alter table public.tasks
  add column if not exists scheduled_time time without time zone;

alter table public.tasks
  drop constraint if exists tasks_scheduled_time_requires_date;

alter table public.tasks
  add constraint tasks_scheduled_time_requires_date
  check (scheduled_time is null or scheduled_for is not null);
