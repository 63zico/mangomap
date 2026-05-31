-- MANGOMAP meetup chat RLS fix v3
-- Run this in Supabase SQL Editor if meetup chat shows:
-- "new row violates row-level security policy for table meetup_members"
-- or
-- "new row violates row-level security policy for table meetup_messages"
--
-- MVP rule:
-- - Users can enter meetup rooms and send chat messages even if the browser
--   has a stale Supabase auth token.
-- - The app still stores meetup_id/auth_uid/nickname for moderation and blocking.

create or replace function public.is_meetup_participant(target_meetup_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.meetups
    where public.meetups.id = target_meetup_id
      and public.meetups.host_auth_uid = auth.uid()::text
  )
  or exists (
    select 1
    from public.meetup_members
    where public.meetup_members.meetup_id = target_meetup_id
      and public.meetup_members.auth_uid = auth.uid()::text
  );
$$;

alter table public.meetup_members enable row level security;
alter table public.meetup_messages enable row level security;

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
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'meetup_messages'
    )
  then
    alter publication supabase_realtime add table public.meetup_messages;
  end if;
end $$;
