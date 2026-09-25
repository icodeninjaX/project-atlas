-- Preview data contains private source phrases and corrections. Keep it briefly.
create extension if not exists pg_cron with schema extensions;

create index capture_batch_previews_expiry_idx
  on public.capture_batch_previews (expires_at);

select cron.schedule(
  'atlas-capture-preview-prune',
  '*/30 * * * *',
  $$delete from public.capture_batch_previews where expires_at <= now()$$
);
