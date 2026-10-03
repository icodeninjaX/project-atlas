-- The Asia/Manila wall-clock time of an income or expense, so history can
-- order a day's entries by when they happened. Optional: older or backdated
-- entries may have no time.
alter table public.transactions
  add column if not exists transaction_time time without time zone;

-- Entries recorded on the day they happened take their recording time.
update public.transactions
set transaction_time = date_trunc('minute', created_at at time zone 'Asia/Manila')::time
where transaction_time is null
  and (created_at at time zone 'Asia/Manila')::date = transaction_date;

create index if not exists transactions_user_date_time_idx
  on public.transactions(user_id, transaction_date desc, transaction_time desc nulls last, created_at desc);
