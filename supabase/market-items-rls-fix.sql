-- MANGOMAP market item RLS fix
-- Fixes: "new row violates row-level security policy for table market_items"

alter table public.market_items enable row level security;

drop policy if exists "public read market items" on public.market_items;
drop policy if exists "public read visible market items" on public.market_items;
drop policy if exists "sellers manage own items" on public.market_items;
drop policy if exists "sellers create own market items" on public.market_items;
drop policy if exists "sellers update own market items" on public.market_items;
drop policy if exists "sellers delete own market items" on public.market_items;

create policy "public read visible market items"
on public.market_items
for select
using (status in ('selling', 'reserved', 'sold', 'cancelled'));

create policy "sellers create own market items"
on public.market_items
for insert
with check (
  auth.role() = 'authenticated'
  and seller_auth_uid = auth.uid()::text
);

create policy "sellers update own market items"
on public.market_items
for update
using (
  auth.role() = 'authenticated'
  and seller_auth_uid = auth.uid()::text
)
with check (
  auth.role() = 'authenticated'
  and seller_auth_uid = auth.uid()::text
);

create policy "sellers delete own market items"
on public.market_items
for delete
using (
  auth.role() = 'authenticated'
  and seller_auth_uid = auth.uid()::text
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'market_items'
    ) then
      alter publication supabase_realtime add table public.market_items;
    end if;
  end if;
end $$;
