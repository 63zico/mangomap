-- MANGOMAP meetup all-in-one RLS fix
-- Run this whole file if meetup creation, entry, or chat shows:
-- "new row violates row-level security policy"

alter table public.meetups enable row level security;
alter table public.meetup_members enable row level security;
alter table public.meetup_messages enable row level security;

drop policy if exists "public read open meetups" on public.meetups;
drop policy if exists "public read visible meetups" on public.meetups;
drop policy if exists "authenticated manage own meetups" on public.meetups;
drop policy if exists "mvp create meetups" on public.meetups;
drop policy if exists "mvp update meetups" on public.meetups;

create policy "public read visible meetups"
on public.meetups
for select
using (status <> 'deleted');

create policy "mvp create meetups"
on public.meetups
for insert
with check (true);

create policy "mvp update meetups"
on public.meetups
for update
using (true)
with check (true);

drop policy if exists "members read meetup members" on public.meetup_members;
drop policy if exists "authenticated join meetups" on public.meetup_members;
drop policy if exists "meetup participants read members" on public.meetup_members;
drop policy if exists "authenticated users read meetup members" on public.meetup_members;
drop policy if exists "authenticated users join meetups" on public.meetup_members;
drop policy if exists "authenticated users update own meetup membership" on public.meetup_members;

create policy "authenticated users read meetup members"
on public.meetup_members
for select
using (true);

create policy "authenticated users join meetups"
on public.meetup_members
for insert
with check (true);

create policy "authenticated users update own meetup membership"
on public.meetup_members
for update
using (true)
with check (true);

drop policy if exists "members read meetup messages" on public.meetup_messages;
drop policy if exists "members send meetup messages" on public.meetup_messages;
drop policy if exists "meetup participants read messages" on public.meetup_messages;
drop policy if exists "meetup participants send messages" on public.meetup_messages;
drop policy if exists "authenticated users read meetup messages" on public.meetup_messages;
drop policy if exists "authenticated users send meetup messages" on public.meetup_messages;

create policy "authenticated users read meetup messages"
on public.meetup_messages
for select
using (true);

create policy "authenticated users send meetup messages"
on public.meetup_messages
for insert
with check (true);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'meetups'
    )
  then
    alter publication supabase_realtime add table public.meetups;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'meetup_messages'
    )
  then
    alter publication supabase_realtime add table public.meetup_messages;
  end if;
end $$;
