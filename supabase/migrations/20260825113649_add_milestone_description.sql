-- The nullable column preserves every existing milestone row.
alter table public.goal_milestones
  add column if not exists description text;

alter table public.goal_milestones
  drop constraint if exists goal_milestones_description_length_check;

alter table public.goal_milestones
  add constraint goal_milestones_description_length_check
  check (description is null or char_length(description) <= 20000);
