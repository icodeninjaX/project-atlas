create table public.capture_batch_previews (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  position smallint not null check (position between 0 and 4),
  source_phrase text not null check (length(source_phrase) between 1 and 500),
  operation text not null check (operation in ('create', 'reschedule_task')),
  proposal jsonb not null,
  target_id uuid,
  target_updated_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'processing', 'saved', 'rejected', 'failed')),
  result_message text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  unique (user_id, batch_id, position)
);

create index capture_batch_previews_owner_idx
  on public.capture_batch_previews (user_id, batch_id);

alter table public.capture_batch_previews enable row level security;
alter table public.capture_batch_previews force row level security;

create policy "Owner reads capture previews"
  on public.capture_batch_previews for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Owner creates capture previews"
  on public.capture_batch_previews for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');

revoke all on public.capture_batch_previews from anon, authenticated;
grant select, insert on public.capture_batch_previews to authenticated;

create or replace function public.claim_capture_preview(p_id uuid, p_operation text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_preview public.capture_batch_previews%rowtype;
begin
  if auth.uid() is null or p_id is null then return null; end if;
  update public.capture_batch_previews
     set status = 'processing'
   where id = p_id and user_id = auth.uid() and status = 'pending'
     and operation = p_operation and expires_at > now()
  returning * into v_preview;
  if not found then return null; end if;
  return pg_catalog.jsonb_build_object(
    'operation', v_preview.operation,
    'proposal', v_preview.proposal,
    'targetId', v_preview.target_id,
    'targetUpdatedAt', v_preview.target_updated_at
  );
end;
$$;

create or replace function public.finish_capture_preview(
  p_id uuid, p_status text, p_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or p_status not in ('saved', 'failed', 'rejected')
    or p_message is null or length(p_message) > 300 then return false; end if;
  update public.capture_batch_previews
     set status = p_status, result_message = p_message
   where id = p_id and user_id = auth.uid()
     and status = case when p_status = 'rejected' then 'pending' else 'processing' end;
  return found;
end;
$$;

revoke all on function public.claim_capture_preview(uuid, text) from public, anon;
revoke all on function public.finish_capture_preview(uuid, text, text) from public, anon;
grant execute on function public.claim_capture_preview(uuid, text) to authenticated;
grant execute on function public.finish_capture_preview(uuid, text, text) to authenticated;
