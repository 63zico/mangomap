# MANGOMAP Supabase Setup

Run these SQL files in the Supabase SQL Editor in this order.

1. `schema.sql`
   - Core tables for profiles, place reports, meetups, meetup chat, market items, trade inquiries, reports, and blocks.

2. `store-readiness.sql`
   - Store-release policies and account deletion request table.
   - Tightens chat access so only meetup/trade participants can read and send messages.
   - Enables Supabase Realtime for meetup chat, market chat, and new market inquiries.
   - Keeps pending place reports private to the reporter; only approved/reflected reports are public.

3. `storage-policies.sql`
   - Public read and authenticated upload policies for:
     - `mangomap-market-images`
     - `mangomap-meetup-images`

4. `restaurants-collector.sql`
   - Optional but recommended before using `/admin/place-collector`.
   - Adds collector-compatible restaurant columns when missing.
   - Adds unique indexes for `slug` and `google_maps_url` to prevent duplicate Google Places imports.

5. `seo-growth-schema.sql`
   - Adds scalable SEO growth tables without rebuilding the existing `restaurants` table.
   - Creates `seo_landing_pages`, `landmarks`, `authors`, internal link, related restaurant, and schema cache tables.
   - Seeds core Vietnam landmarks for Ho Chi Minh City, Da Nang, Nha Trang, Hanoi, Da Lat, and Phu Quoc.
   - Adds generated `location` columns for landmark/restaurant distance checks.
   - Required before calling `/api/admin/seo-automation/generate`.

After running all three, use this quick check:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'place_reports',
    'meetups',
    'meetup_members',
    'meetup_messages',
    'market_items',
    'market_inquiries',
    'market_messages',
    'trade_reviews',
    'content_reports',
    'user_blocks',
    'account_deletion_requests',
    'seo_landing_pages',
    'landmarks',
    'authors',
    'seo_internal_links',
    'restaurant_related',
    'restaurant_schema_cache'
  )
order by table_name;

select id, public
from storage.buckets
where id in ('mangomap-market-images', 'mangomap-meetup-images')
order by id;
```

Expected result:

- 12 public tables returned.
- 2 public storage buckets returned.
