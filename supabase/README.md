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
    'account_deletion_requests'
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
