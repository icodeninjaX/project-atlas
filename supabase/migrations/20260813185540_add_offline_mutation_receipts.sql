create table if not exists public.offline_mutation_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  mutation_id uuid not null,
  mutation_type text not null,
  status text not null check (status in ('processing', 'succeeded', 'failed')),
  result_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, mutation_id)
);

alter table public.offline_mutation_receipts enable row level security;

create policy "Users can read their offline mutation receipts"
on public.offline_mutation_receipts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their offline mutation receipts"
on public.offline_mutation_receipts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their offline mutation receipts"
on public.offline_mutation_receipts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on table public.offline_mutation_receipts from anon;
grant select, insert, update on table public.offline_mutation_receipts to authenticated;
