begin;

alter table public.tasks
  add column energy_required text not null default 'medium'
    check (energy_required in ('low', 'medium', 'high'));

alter table public.user_preferences
  add column dayline_capacity_minutes smallint not null default 180
    check (dayline_capacity_minutes between 15 and 720),
  add column dayline_energy_level text not null default 'medium'
    check (dayline_energy_level in ('low', 'medium', 'high'));

commit;
