-- MANGOMAP meetup creation RLS fix
-- Run this if creating a meetup shows:
-- "new row violates row-level security policy"
--
-- MVP rule:
-- - Anyone using the client can read non-deleted meetup cards.
-- - Meetup creation and status updates are allowed so Kakao/Google browser
--   session edge cases do not block room creation.
-- - The app still stores host_auth_uid/host_name for ownership UI and moderation.

alter table public.meetups enable row level security;

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

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'meetups'
    )
  then
    alter publication supabase_realtime add table public.meetups;
  end if;
end $$;
