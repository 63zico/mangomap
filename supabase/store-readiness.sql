-- MANGOMAP required store-readiness migration.
-- Run this after supabase/schema.sql.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists privacy_version text,
  add column if not exists phone_verified_at timestamptz,
  add column if not exists account_status text not null default 'active',
  add column if not exists deletion_requested_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_account_status_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('active', 'deletion_requested', 'deleted', 'suspended'));
  end if;
end $$;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  auth_uid text not null,
  nickname text,
  provider text,
  email text,
  phone text,
  reason text,
  status text not null default 'pending',
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'account_deletion_requests_status_check'
      and conrelid = 'public.account_deletion_requests'::regclass
  ) then
    alter table public.account_deletion_requests
      add constraint account_deletion_requests_status_check
      check (status in ('pending', 'processing', 'completed', 'cancelled'));
  end if;
end $$;

alter table public.account_deletion_requests enable row level security;

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

create or replace function public.is_market_inquiry_participant(target_inquiry_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.market_inquiries
    join public.market_items on public.market_items.id = public.market_inquiries.item_id
    where public.market_inquiries.id = target_inquiry_id
      and (
        public.market_inquiries.buyer_auth_uid = auth.uid()::text
        or public.market_items.seller_auth_uid = auth.uid()::text
      )
  );
$$;

revoke all on function public.is_meetup_participant(text) from public;
revoke all on function public.is_market_inquiry_participant(text) from public;
grant execute on function public.is_meetup_participant(text) to authenticated;
grant execute on function public.is_market_inquiry_participant(text) to authenticated;

drop policy if exists "public read profiles" on public.profiles;
drop policy if exists "authenticated manage own profile" on public.profiles;
drop policy if exists "owners read own profile" on public.profiles;
drop policy if exists "owners insert own profile" on public.profiles;
drop policy if exists "owners update own profile" on public.profiles;

create policy "owners read own profile"
on public.profiles
for select
using (auth_uid = auth.uid()::text);

create policy "owners insert own profile"
on public.profiles
for insert
with check (auth_uid = auth.uid()::text);

create policy "owners update own profile"
on public.profiles
for update
using (auth_uid = auth.uid()::text)
with check (auth_uid = auth.uid()::text);

drop policy if exists "public read place reports" on public.place_reports;
drop policy if exists "authenticated insert place reports" on public.place_reports;
drop policy if exists "report owner update own pending reports" on public.place_reports;
drop policy if exists "public read approved place reports" on public.place_reports;
drop policy if exists "owners read own place reports" on public.place_reports;
drop policy if exists "owners insert own place reports" on public.place_reports;
drop policy if exists "owners update own place reports" on public.place_reports;
drop policy if exists "owners delete own place reports" on public.place_reports;

create policy "public read approved place reports"
on public.place_reports
for select
using (
  status = '승인'
  or map_reflection_status = '지도 반영 완료'
);

create policy "owners read own place reports"
on public.place_reports
for select
using (reporter_id = auth.uid()::text);

create policy "owners insert own place reports"
on public.place_reports
for insert
with check (
  auth.role() = 'authenticated'
  and reporter_id = auth.uid()::text
);

create policy "owners update own place reports"
on public.place_reports
for update
using (
  reporter_id = auth.uid()::text
  and status = '검토중'
)
with check (
  reporter_id = auth.uid()::text
  and status = '검토중'
);

create policy "owners delete own place reports"
on public.place_reports
for delete
using (
  reporter_id = auth.uid()::text
  and status = '검토중'
);

drop policy if exists "members read meetup members" on public.meetup_members;
drop policy if exists "authenticated join meetups" on public.meetup_members;
drop policy if exists "meetup participants read members" on public.meetup_members;
drop policy if exists "authenticated users join meetups" on public.meetup_members;

create policy "meetup participants read members"
on public.meetup_members
for select
using (public.is_meetup_participant(meetup_id));

create policy "authenticated users join meetups"
on public.meetup_members
for insert
with check (auth_uid = auth.uid()::text);

drop policy if exists "members read meetup messages" on public.meetup_messages;
drop policy if exists "members send meetup messages" on public.meetup_messages;
drop policy if exists "meetup participants read messages" on public.meetup_messages;
drop policy if exists "meetup participants send messages" on public.meetup_messages;

create policy "meetup participants read messages"
on public.meetup_messages
for select
using (public.is_meetup_participant(meetup_id));

create policy "meetup participants send messages"
on public.meetup_messages
for insert
with check (
  auth_uid = auth.uid()::text
  and public.is_meetup_participant(meetup_id)
);

drop policy if exists "inquiry users read inquiries" on public.market_inquiries;
drop policy if exists "authenticated create inquiries" on public.market_inquiries;
drop policy if exists "buyers create inquiries" on public.market_inquiries;
drop policy if exists "buyer and seller read inquiries" on public.market_inquiries;
drop policy if exists "seller updates inquiries" on public.market_inquiries;

create policy "buyers create inquiries"
on public.market_inquiries
for insert
with check (buyer_auth_uid = auth.uid()::text);

create policy "buyer and seller read inquiries"
on public.market_inquiries
for select
using (
  buyer_auth_uid = auth.uid()::text
  or exists (
    select 1
    from public.market_items
    where public.market_items.id = public.market_inquiries.item_id
      and public.market_items.seller_auth_uid = auth.uid()::text
  )
);

create policy "seller updates inquiries"
on public.market_inquiries
for update
using (
  exists (
    select 1
    from public.market_items
    where public.market_items.id = public.market_inquiries.item_id
      and public.market_items.seller_auth_uid = auth.uid()::text
  )
)
with check (
  exists (
    select 1
    from public.market_items
    where public.market_items.id = public.market_inquiries.item_id
      and public.market_items.seller_auth_uid = auth.uid()::text
  )
);

drop policy if exists "inquiry users read messages" on public.market_messages;
drop policy if exists "inquiry users send messages" on public.market_messages;
drop policy if exists "trade participants read messages" on public.market_messages;
drop policy if exists "trade participants send messages" on public.market_messages;

create policy "trade participants read messages"
on public.market_messages
for select
using (public.is_market_inquiry_participant(inquiry_id));

create policy "trade participants send messages"
on public.market_messages
for insert
with check (
  auth_uid = auth.uid()::text
  and public.is_market_inquiry_participant(inquiry_id)
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'meetups'
    ) then
      alter publication supabase_realtime add table public.meetups;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'meetup_messages'
    ) then
      alter publication supabase_realtime add table public.meetup_messages;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'market_messages'
    ) then
      alter publication supabase_realtime add table public.market_messages;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'market_inquiries'
    ) then
      alter publication supabase_realtime add table public.market_inquiries;
    end if;
  end if;
end $$;

drop policy if exists "trade participants read reviews" on public.trade_reviews;
drop policy if exists "buyers create own trade reviews" on public.trade_reviews;
drop policy if exists "buyers update own trade reviews" on public.trade_reviews;

create policy "trade participants read reviews"
on public.trade_reviews
for select
using (
  seller_auth_uid = auth.uid()::text
  or buyer_auth_uid = auth.uid()::text
  or reviewer_auth_uid = auth.uid()::text
);

create policy "buyers create own trade reviews"
on public.trade_reviews
for insert
with check (
  reviewer_auth_uid = auth.uid()::text
  and buyer_auth_uid = auth.uid()::text
);

create policy "buyers update own trade reviews"
on public.trade_reviews
for update
using (reviewer_auth_uid = auth.uid()::text)
with check (
  reviewer_auth_uid = auth.uid()::text
  and buyer_auth_uid = auth.uid()::text
);

drop policy if exists "owners read own blocks" on public.user_blocks;
drop policy if exists "owners delete own blocks" on public.user_blocks;
drop policy if exists "owners create own blocks" on public.user_blocks;

create policy "owners create own blocks"
on public.user_blocks
for insert
with check (blocker_auth_uid = auth.uid()::text);

create policy "owners read own blocks"
on public.user_blocks
for select
using (blocker_auth_uid = auth.uid()::text);

create policy "owners delete own blocks"
on public.user_blocks
for delete
using (blocker_auth_uid = auth.uid()::text);

drop policy if exists "owners read own safety reports" on public.content_reports;

create policy "owners read own safety reports"
on public.content_reports
for select
using (reporter_auth_uid = auth.uid()::text);

drop policy if exists "owners create account deletion requests" on public.account_deletion_requests;
drop policy if exists "owners read account deletion requests" on public.account_deletion_requests;

create policy "owners create account deletion requests"
on public.account_deletion_requests
for insert
with check (auth_uid = auth.uid()::text);

create policy "owners read account deletion requests"
on public.account_deletion_requests
for select
using (auth_uid = auth.uid()::text);
