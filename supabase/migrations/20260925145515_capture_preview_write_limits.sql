-- Authenticated clients can only create a small, short-lived preview set.
create or replace function private.limit_capture_preview_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Capture preview owner mismatch' using errcode = '42501';
  end if;
  if pg_catalog.length(new.proposal::text) > 8000 then
    raise exception 'Capture preview is too large' using errcode = '23514';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(6106, 17);
  if (select count(*) from public.capture_batch_previews
      where user_id = new.user_id and expires_at > now()) >= 25 then
    raise exception 'Too many active capture previews' using errcode = '23514';
  end if;
  new.created_at := now();
  new.expires_at := now() + interval '30 minutes';
  return new;
end;
$$;

create trigger capture_preview_insert_limits
before insert on public.capture_batch_previews
for each row execute function private.limit_capture_preview_insert();

revoke all on function private.limit_capture_preview_insert() from public, anon, authenticated;
