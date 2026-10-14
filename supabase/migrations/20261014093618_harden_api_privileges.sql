-- Signed-out visitors use the anon key and never read or write app data.
-- Supabase's default privileges granted anon full access to the tables in
-- the initial schema; RLS returned no rows, but nothing should depend on it.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- PostgREST never issues these, and TRUNCATE is not subject to RLS.
revoke truncate, references, trigger on all tables in schema public from authenticated;

-- A trigger function: it needs no EXECUTE grant to fire.
revoke all on function public.analyst_memories_limit() from public, anon, authenticated;

-- Job links are rendered as hrefs, so only web URLs may be stored. NOT VALID
-- keeps existing rows readable; the app ignores any legacy unsafe link.
alter table public.job_applications
  add constraint job_applications_job_url_http
  check (job_url is null or job_url ~* '^https?://')
  not valid;
