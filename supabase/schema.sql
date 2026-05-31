create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_uid text unique not null,
  nickname text not null,
  provider text not null check (provider in ('phone', 'kakao', 'google')),
  phone text,
  phone_verified_at timestamptz,
  email text,
  avatar_uri text,
  bio text,
  travel_style text,
  interest_tags text[] default '{}',
  manner_temperature numeric(4, 1) not null default 36.5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.place_reports (
  id text primary key,
  reporter_id text,
  city text not null,
  name text not null,
  category text not null,
  area text not null,
  price_level text not null,
  google_maps_uri text not null,
  reason text not null,
  reporter_type text not null,
  status text not null default '검토중' check (status in ('검토중', '승인', '반려')),
  map_reflection_status text not null default '검토중',
  view_count integer not null default 0,
  reward_points integer not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meetups (
  id text primary key,
  host_auth_uid text not null,
  host_name text not null,
  city text not null,
  category text not null,
  title text not null,
  place_name text not null,
  meetup_date date not null,
  meetup_time text,
  capacity integer,
  seats_label text,
  safety text,
  price_label text,
  mood text,
  image_uri text,
  status text not null default 'open' check (status in ('open', 'closed', 'cancelled', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meetup_members (
  meetup_id text not null references public.meetups(id) on delete cascade,
  auth_uid text not null,
  nickname text not null,
  role text not null default 'participant' check (role in ('host', 'participant')),
  joined_at timestamptz not null default now(),
  primary key (meetup_id, auth_uid)
);

create table if not exists public.meetup_messages (
  id uuid primary key default gen_random_uuid(),
  meetup_id text not null references public.meetups(id) on delete cascade,
  auth_uid text not null,
  nickname text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.market_items (
  id text primary key,
  seller_auth_uid text not null,
  seller_name text not null,
  city text not null,
  title text not null,
  description text not null,
  location text not null,
  price_label text not null,
  contact text,
  image_uri text,
  status text not null default 'selling' check (status in ('selling', 'reserved', 'sold', 'cancelled', 'deleted')),
  buyer_auth_uid text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_inquiries (
  id text primary key,
  item_id text not null references public.market_items(id) on delete cascade,
  buyer_auth_uid text not null,
  buyer_name text not null,
  status text not null default 'open' check (status in ('open', 'selected_buyer', 'closed')),
  created_at timestamptz not null default now(),
  unique (item_id, buyer_auth_uid)
);

create table if not exists public.market_messages (
  id uuid primary key default gen_random_uuid(),
  inquiry_id text not null references public.market_inquiries(id) on delete cascade,
  auth_uid text not null,
  nickname text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trade_reviews (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.market_items(id) on delete cascade,
  seller_auth_uid text not null,
  buyer_auth_uid text not null,
  reviewer_auth_uid text not null,
  score integer not null check (score between 1 and 5),
  tags text[] default '{}',
  comment text,
  created_at timestamptz not null default now(),
  unique (item_id, reviewer_auth_uid)
);

create table if not exists public.community_posts (
  id text primary key,
  author_auth_uid text not null,
  author_name text not null,
  city text not null,
  category text not null check (category in ('질문', '맛집', '생활정보', '동행', '수다', '도움요청')),
  title text not null,
  body text not null,
  area text not null,
  status text not null default 'open' check (status in ('open', 'hidden', 'deleted')),
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references public.community_posts(id) on delete cascade,
  author_auth_uid text not null,
  author_name text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'hidden', 'deleted')),
  created_at timestamptz not null default now()
);

create table if not exists public.community_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id text not null references public.community_posts(id) on delete cascade,
  auth_uid text not null,
  reaction_type text not null default 'helpful' check (reaction_type in ('helpful')),
  created_at timestamptz not null default now(),
  unique (post_id, auth_uid)
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_auth_uid text not null,
  target_type text not null check (target_type in ('meetup', 'market_item', 'message', 'profile', 'place_report', 'community_post', 'community_comment')),
  target_id text not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.user_blocks (
  blocker_auth_uid text not null,
  blocked_auth_uid text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_auth_uid, blocked_auth_uid)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mangomap-market-images',
  'mangomap-market-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
),
(
  'mangomap-meetup-images',
  'mangomap-meetup-images',
  true,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.profiles enable row level security;
alter table public.place_reports enable row level security;
alter table public.meetups enable row level security;
alter table public.meetup_members enable row level security;
alter table public.meetup_messages enable row level security;
alter table public.market_items enable row level security;
alter table public.market_inquiries enable row level security;
alter table public.market_messages enable row level security;
alter table public.trade_reviews enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;
alter table public.content_reports enable row level security;
alter table public.user_blocks enable row level security;

create policy "public read profiles" on public.profiles for select using (true);
create policy "authenticated manage own profile" on public.profiles for all using (auth_uid = auth.uid()::text) with check (auth_uid = auth.uid()::text);

create policy "public read place reports" on public.place_reports for select using (true);
create policy "authenticated insert place reports" on public.place_reports for insert with check (auth.role() = 'authenticated' and reporter_id = auth.uid()::text);
create policy "report owner update own pending reports" on public.place_reports for update using (reporter_id = auth.uid()::text);

create policy "public read open meetups" on public.meetups for select using (status in ('open', 'closed'));
create policy "authenticated manage own meetups" on public.meetups for all using (host_auth_uid = auth.uid()::text) with check (host_auth_uid = auth.uid()::text);
create policy "members read meetup members" on public.meetup_members for select using (auth.role() = 'authenticated');
create policy "authenticated join meetups" on public.meetup_members for insert with check (auth_uid = auth.uid()::text);
create policy "members read meetup messages" on public.meetup_messages for select using (auth.role() = 'authenticated');
create policy "members send meetup messages" on public.meetup_messages for insert with check (auth_uid = auth.uid()::text);

create policy "public read market items" on public.market_items for select using (status in ('selling', 'reserved', 'sold'));
create policy "sellers manage own items" on public.market_items for all using (seller_auth_uid = auth.uid()::text) with check (seller_auth_uid = auth.uid()::text);
create policy "authenticated create inquiries" on public.market_inquiries for insert with check (buyer_auth_uid = auth.uid()::text);
create policy "inquiry users read inquiries" on public.market_inquiries for select using (auth.role() = 'authenticated');
create policy "inquiry users read messages" on public.market_messages for select using (auth.role() = 'authenticated');
create policy "inquiry users send messages" on public.market_messages for insert with check (auth_uid = auth.uid()::text);

create policy "public read community posts" on public.community_posts for select using (status = 'open');
create policy "authenticated create community posts" on public.community_posts for insert with check (author_auth_uid = auth.uid()::text);
create policy "authors update own community posts" on public.community_posts for update using (author_auth_uid = auth.uid()::text) with check (author_auth_uid = auth.uid()::text);
create policy "public read community comments" on public.community_comments for select using (status = 'open');
create policy "authenticated create community comments" on public.community_comments for insert with check (author_auth_uid = auth.uid()::text);
create policy "authors update own community comments" on public.community_comments for update using (author_auth_uid = auth.uid()::text) with check (author_auth_uid = auth.uid()::text);
create policy "authors delete own community comments" on public.community_comments for delete using (author_auth_uid = auth.uid()::text);
create policy "authenticated read own community reactions" on public.community_reactions for select using (auth_uid = auth.uid()::text);
create policy "authenticated create community reactions" on public.community_reactions for insert with check (auth_uid = auth.uid()::text);
create policy "authenticated update own community reactions" on public.community_reactions for update using (auth_uid = auth.uid()::text) with check (auth_uid = auth.uid()::text);

create policy "authenticated create safety reports" on public.content_reports for insert with check (reporter_auth_uid = auth.uid()::text);
create policy "authenticated block users" on public.user_blocks for insert with check (blocker_auth_uid = auth.uid()::text);

create or replace function public.refresh_community_post_counts()
returns trigger
language plpgsql
security definer
as $$
begin
  if tg_table_name = 'community_comments' then
    update public.community_posts
    set comments_count = (
      select count(*) from public.community_comments
      where post_id = coalesce(new.post_id, old.post_id)
        and status = 'open'
    ),
    updated_at = now()
    where id = coalesce(new.post_id, old.post_id);
  end if;

  if tg_table_name = 'community_reactions' then
    update public.community_posts
    set likes_count = (
      select count(*) from public.community_reactions
      where post_id = coalesce(new.post_id, old.post_id)
        and reaction_type = 'helpful'
    ),
    updated_at = now()
    where id = coalesce(new.post_id, old.post_id);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists refresh_community_comment_counts on public.community_comments;
create trigger refresh_community_comment_counts
after insert or update or delete on public.community_comments
for each row execute function public.refresh_community_post_counts();

drop trigger if exists refresh_community_reaction_counts on public.community_reactions;
create trigger refresh_community_reaction_counts
after insert or update or delete on public.community_reactions
for each row execute function public.refresh_community_post_counts();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'meetups'
     ) then
    alter publication supabase_realtime add table public.meetups;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'community_posts'
     ) then
    alter publication supabase_realtime add table public.community_posts;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'community_comments'
     ) then
    alter publication supabase_realtime add table public.community_comments;
  end if;
end $$;
