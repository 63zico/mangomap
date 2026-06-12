create extension if not exists pgcrypto;

create table if not exists public.saved_places (
  id uuid primary key default gen_random_uuid(),
  auth_uid text not null,
  place_id text not null,
  place_name text not null,
  city text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (auth_uid, place_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  place_name text,
  auth_uid text not null,
  nickname text not null,
  rating integer not null check (rating between 1 and 5),
  content text not null check (char_length(trim(content)) >= 1),
  visit_status text not null default '방문 완료',
  tags text[] not null default '{}',
  photo_urls text[] not null default '{}',
  source text not null default 'user',
  status text not null default 'published' check (status in ('published', 'approved', 'hidden', 'deleted')),
  helpful_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (place_id, auth_uid)
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  place_name text,
  auth_uid text not null,
  nickname text,
  method text not null default 'manual' check (method in ('manual', 'qr')),
  status text not null default 'verified_mock' check (status in ('verified_mock', 'verified_qr', 'rejected', 'deleted')),
  created_at timestamptz not null default now()
);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  place_id text,
  partner_name text not null,
  city text,
  category text,
  status text not null default 'pending' check (status in ('pending', 'active', 'paused', 'ended')),
  benefit_title text,
  benefit_summary text,
  contact_name text,
  contact_channel text,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  auth_uid text not null,
  points integer not null,
  source_type text not null,
  source_id text,
  reason text not null,
  status text not null default 'posted' check (status in ('posted', 'cancelled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists point_transactions_unique_source
  on public.point_transactions(auth_uid, source_type, source_id)
  where source_id is not null;

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid references public.partners(id) on delete set null,
  title text not null,
  summary text,
  required_points integer not null check (required_points >= 0),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.redemptions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid references public.rewards(id) on delete set null,
  auth_uid text not null,
  points_spent integer not null check (points_spent >= 0),
  status text not null default 'requested' check (status in ('requested', 'approved', 'used', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_places_auth_uid_idx on public.saved_places(auth_uid, created_at desc);
create index if not exists reviews_place_id_idx on public.reviews(place_id, created_at desc);
create index if not exists reviews_auth_uid_idx on public.reviews(auth_uid, created_at desc);
create index if not exists checkins_auth_uid_idx on public.checkins(auth_uid, created_at desc);
create index if not exists point_transactions_auth_uid_idx on public.point_transactions(auth_uid, created_at desc);
create index if not exists partners_place_id_idx on public.partners(place_id);

alter table public.saved_places enable row level security;
alter table public.reviews enable row level security;
alter table public.checkins enable row level security;
alter table public.partners enable row level security;
alter table public.point_transactions enable row level security;
alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;

drop policy if exists "saved places owner read" on public.saved_places;
create policy "saved places owner read" on public.saved_places
  for select using (auth.uid()::text = auth_uid);

drop policy if exists "saved places owner insert" on public.saved_places;
create policy "saved places owner insert" on public.saved_places
  for insert with check (auth.uid()::text = auth_uid);

drop policy if exists "saved places owner update" on public.saved_places;
create policy "saved places owner update" on public.saved_places
  for update using (auth.uid()::text = auth_uid) with check (auth.uid()::text = auth_uid);

drop policy if exists "saved places owner delete" on public.saved_places;
create policy "saved places owner delete" on public.saved_places
  for delete using (auth.uid()::text = auth_uid);

drop policy if exists "published reviews read" on public.reviews;
create policy "published reviews read" on public.reviews
  for select using (status in ('published', 'approved') or auth.uid()::text = auth_uid);

drop policy if exists "reviews owner insert" on public.reviews;
create policy "reviews owner insert" on public.reviews
  for insert with check (auth.uid()::text = auth_uid);

drop policy if exists "reviews owner update" on public.reviews;
create policy "reviews owner update" on public.reviews
  for update using (auth.uid()::text = auth_uid) with check (auth.uid()::text = auth_uid);

drop policy if exists "reviews owner delete" on public.reviews;
create policy "reviews owner delete" on public.reviews
  for delete using (auth.uid()::text = auth_uid);

drop policy if exists "checkins owner read" on public.checkins;
create policy "checkins owner read" on public.checkins
  for select using (auth.uid()::text = auth_uid);

drop policy if exists "checkins owner insert" on public.checkins;
create policy "checkins owner insert" on public.checkins
  for insert with check (auth.uid()::text = auth_uid);

drop policy if exists "active partners public read" on public.partners;
create policy "active partners public read" on public.partners
  for select using (status = 'active');

drop policy if exists "points owner read" on public.point_transactions;
create policy "points owner read" on public.point_transactions
  for select using (auth.uid()::text = auth_uid);

drop policy if exists "active rewards public read" on public.rewards;
create policy "active rewards public read" on public.rewards
  for select using (status = 'active');

drop policy if exists "redemptions owner read" on public.redemptions;
create policy "redemptions owner read" on public.redemptions
  for select using (auth.uid()::text = auth_uid);

drop policy if exists "redemptions owner insert" on public.redemptions;
create policy "redemptions owner insert" on public.redemptions
  for insert with check (auth.uid()::text = auth_uid);

create or replace function public.award_my_points_once(
  p_source_type text,
  p_source_id text,
  p_points integer,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_uid text;
begin
  v_auth_uid := auth.uid()::text;
  if v_auth_uid is null then
    raise exception 'login required';
  end if;

  if not (
    (p_source_type = 'saved_place' and p_points = 50)
    or (p_source_type = 'review' and p_points = 200)
    or (p_source_type = 'photo_review' and p_points = 300)
    or (p_source_type = 'checkin' and p_points = 500)
  ) then
    raise exception 'invalid point rule';
  end if;

  insert into public.point_transactions(auth_uid, points, source_type, source_id, reason)
  values (v_auth_uid, p_points, p_source_type, p_source_id, p_reason)
  on conflict do nothing;
end;
$$;

grant execute on function public.award_my_points_once(text, text, integer, text) to authenticated;

insert into storage.buckets (id, name, public)
values ('mangomap-review-images', 'mangomap-review-images', true)
on conflict (id) do nothing;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.saved_places;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.reviews;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.checkins;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
