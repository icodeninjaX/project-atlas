-- Run after the application route and migration are deployed.
-- Supabase Cron will call the secured ATLAS task reminder route every minute.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.unschedule(jobid)
from cron.job
where jobname = 'atlas-task-reminders-every-minute';

select cron.schedule(
  'atlas-task-reminders-every-minute',
  '* * * * *',
  $command$
    select net.http_post(
      url := (
        select endpoint
        from private.task_reminder_scheduler_config
        where singleton
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select bearer_token
          from private.task_reminder_scheduler_config
          where singleton
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $command$
);
