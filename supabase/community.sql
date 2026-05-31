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

alter table public.content_reports
drop constraint if exists content_reports_target_type_check;

alter table public.content_reports
add constraint content_reports_target_type_check
check (target_type in ('meetup', 'market_item', 'message', 'profile', 'place_report', 'community_post', 'community_comment'));

alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_reactions enable row level security;

drop policy if exists "public read community posts" on public.community_posts;
drop policy if exists "authenticated create community posts" on public.community_posts;
drop policy if exists "authors update own community posts" on public.community_posts;
drop policy if exists "public read community comments" on public.community_comments;
drop policy if exists "authenticated create community comments" on public.community_comments;
drop policy if exists "authors update own community comments" on public.community_comments;
drop policy if exists "authors delete own community comments" on public.community_comments;
drop policy if exists "authenticated read own community reactions" on public.community_reactions;
drop policy if exists "authenticated create community reactions" on public.community_reactions;
drop policy if exists "authenticated update own community reactions" on public.community_reactions;

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
