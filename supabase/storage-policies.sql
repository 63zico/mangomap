-- Optional image storage policies.
-- Run after store-readiness.sql. If this fails, the core auth/chat/account-delete DB migration can still be used.

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

drop policy if exists "public read mangomap images" on storage.objects;
drop policy if exists "authenticated upload mangomap images" on storage.objects;
drop policy if exists "authenticated update mangomap images" on storage.objects;
drop policy if exists "authenticated delete mangomap images" on storage.objects;

create policy "public read mangomap images"
on storage.objects
for select
using (bucket_id in ('mangomap-market-images', 'mangomap-meetup-images'));

create policy "authenticated upload mangomap images"
on storage.objects
for insert
with check (
  bucket_id in ('mangomap-market-images', 'mangomap-meetup-images')
  and auth.role() = 'authenticated'
);

create policy "authenticated update mangomap images"
on storage.objects
for update
using (
  bucket_id in ('mangomap-market-images', 'mangomap-meetup-images')
  and auth.role() = 'authenticated'
)
with check (
  bucket_id in ('mangomap-market-images', 'mangomap-meetup-images')
  and auth.role() = 'authenticated'
);

create policy "authenticated delete mangomap images"
on storage.objects
for delete
using (
  bucket_id in ('mangomap-market-images', 'mangomap-meetup-images')
  and auth.role() = 'authenticated'
);
