create table if not exists public.agenda_sync (
  calendar_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.agenda_sync enable row level security;

drop policy if exists "agenda_sync_select" on public.agenda_sync;
drop policy if exists "agenda_sync_insert" on public.agenda_sync;
drop policy if exists "agenda_sync_update" on public.agenda_sync;

create policy "agenda_sync_select"
on public.agenda_sync
for select
to anon
using (true);

create policy "agenda_sync_insert"
on public.agenda_sync
for insert
to anon
with check (true);

create policy "agenda_sync_update"
on public.agenda_sync
for update
to anon
using (true)
with check (true);
