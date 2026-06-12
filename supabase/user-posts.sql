create extension if not exists pgcrypto;

create table if not exists public.user_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  category text not null check (category in ('구인구직', '중고거래', '부동산', '업체·가격', '사진·후기', '생활정보')),
  city text not null check (city in ('호치민', '다낭', '나트랑', '푸꾸옥', '붕따우', '하노이', '기타')),
  title text not null check (char_length(trim(title)) between 4 and 80),
  contact text not null check (char_length(trim(contact)) between 2 and 120),
  price text,
  detail text not null check (char_length(trim(detail)) between 20 and 3000),
  author_name text not null default '망고 유저',
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'hidden', 'deleted')),
  index_status text not null default 'noindex' check (index_status in ('noindex', 'index')),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  trust_score integer not null default 0 check (trust_score between 0 and 100),
  report_count integer not null default 0 check (report_count >= 0),
  view_count integer not null default 0 check (view_count >= 0),
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_posts_public_created_idx
  on public.user_posts(created_at desc)
  where visibility = 'public' and status in ('pending_review', 'approved');

create index if not exists user_posts_city_category_idx
  on public.user_posts(city, category, created_at desc)
  where visibility = 'public' and status in ('pending_review', 'approved');

create index if not exists user_posts_review_queue_idx
  on public.user_posts(status, created_at desc);

alter table public.user_posts enable row level security;

drop policy if exists "public read visible user posts" on public.user_posts;
drop policy if exists "anon create pending user posts" on public.user_posts;

create policy "public read visible user posts"
on public.user_posts
for select
using (visibility = 'public' and status in ('pending_review', 'approved'));

create policy "anon create pending user posts"
on public.user_posts
for insert
with check (
  visibility = 'public'
  and status = 'pending_review'
  and index_status = 'noindex'
  and trust_score = 0
  and report_count = 0
);

create or replace function public.touch_user_posts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_user_posts_updated_at on public.user_posts;
create trigger touch_user_posts_updated_at
before update on public.user_posts
for each row execute function public.touch_user_posts_updated_at();
