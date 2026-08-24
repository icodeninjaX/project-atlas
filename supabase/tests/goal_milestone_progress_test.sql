BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(8);

INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
VALUES (
  '96000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'goal-progress@example.test',
  '',
  now(),
  now(),
  now(),
  '{}',
  '{}'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"96000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

INSERT INTO public.goals (
  id, user_id, title, area, status, progress_percent
)
VALUES (
  '97000000-0000-4000-8000-000000000001',
  '96000000-0000-4000-8000-000000000001',
  'Milestone-driven goal',
  'personal',
  'active',
  80
);

SELECT is(
  (SELECT progress_percent FROM public.goals WHERE id = '97000000-0000-4000-8000-000000000001'),
  0::smallint,
  'a goal with no milestones starts at zero despite a manual value'
);

INSERT INTO public.goal_milestones (
  id, user_id, goal_id, title
)
VALUES (
  '98000000-0000-4000-8000-000000000001',
  '96000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000001',
  'First milestone'
);

SELECT is(
  (SELECT progress_percent FROM public.goals WHERE id = '97000000-0000-4000-8000-000000000001'),
  0::smallint,
  'an incomplete milestone keeps progress at zero'
);

INSERT INTO public.goal_milestones (
  id, user_id, goal_id, title, completed_at
)
VALUES (
  '98000000-0000-4000-8000-000000000002',
  '96000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000001',
  'Second milestone',
  now()
);

SELECT is(
  (SELECT progress_percent FROM public.goals WHERE id = '97000000-0000-4000-8000-000000000001'),
  50::smallint,
  'one of two completed milestones produces 50 percent'
);

UPDATE public.goal_milestones
SET completed_at = now()
WHERE id = '98000000-0000-4000-8000-000000000001';

SELECT is(
  (SELECT progress_percent FROM public.goals WHERE id = '97000000-0000-4000-8000-000000000001'),
  100::smallint,
  'completing every milestone produces 100 percent'
);

INSERT INTO public.goal_milestones (
  id, user_id, goal_id, title
)
VALUES (
  '98000000-0000-4000-8000-000000000003',
  '96000000-0000-4000-8000-000000000001',
  '97000000-0000-4000-8000-000000000001',
  'Third milestone'
);

SELECT is(
  (SELECT progress_percent FROM public.goals WHERE id = '97000000-0000-4000-8000-000000000001'),
  67::smallint,
  'adding an incomplete milestone recalculates and rounds progress'
);

UPDATE public.goal_milestones
SET completed_at = null
WHERE id = '98000000-0000-4000-8000-000000000002';

SELECT is(
  (SELECT progress_percent FROM public.goals WHERE id = '97000000-0000-4000-8000-000000000001'),
  33::smallint,
  'reopening a milestone lowers progress'
);

UPDATE public.goals
SET progress_percent = 99
WHERE id = '97000000-0000-4000-8000-000000000001';

SELECT is(
  (SELECT progress_percent FROM public.goals WHERE id = '97000000-0000-4000-8000-000000000001'),
  33::smallint,
  'direct manual progress changes are replaced by the milestone calculation'
);

DELETE FROM public.goal_milestones
WHERE id = '98000000-0000-4000-8000-000000000003';

SELECT is(
  (SELECT progress_percent FROM public.goals WHERE id = '97000000-0000-4000-8000-000000000001'),
  50::smallint,
  'deleting a milestone recalculates the remaining ratio'
);

SELECT * FROM finish();
ROLLBACK;
