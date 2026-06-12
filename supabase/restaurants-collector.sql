-- Google Places collector support for Mango Vietnam.
-- Safe to run more than once. It assumes public.restaurants already exists.

create extension if not exists postgis;

alter table public.restaurants
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists city text,
  add column if not exists district text,
  add column if not exists address text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists google_maps_url text,
  add column if not exists category text,
  add column if not exists rating numeric,
  add column if not exists review_count integer,
  add column if not exists phone text,
  add column if not exists website text,
  add column if not exists description text,
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists featured_image text,
  add column if not exists google_place_id text,
  add column if not exists opening_hours text,
  add column if not exists price_level text,
  add column if not exists review_summary text,
  add column if not exists review_positive_signals jsonb,
  add column if not exists review_caution_signals jsonb,
  add column if not exists mentioned_menus jsonb,
  add column if not exists recommended_for jsonb,
  add column if not exists editorial_body text,
  add column if not exists faq_json jsonb,
  add column if not exists source_updated_at timestamptz;

alter table public.restaurants
  add column if not exists location geography(point, 4326)
    generated always as (
      case
        when latitude is null or longitude is null then null
        else st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
      end
    ) stored;

create unique index if not exists restaurants_slug_unique_idx
  on public.restaurants (slug)
  where slug is not null and slug <> '';

create unique index if not exists restaurants_google_maps_url_unique_idx
  on public.restaurants (google_maps_url)
  where google_maps_url is not null and google_maps_url <> '';

create index if not exists restaurants_city_district_category_idx
  on public.restaurants (city, district, category);

create index if not exists restaurants_rating_review_count_idx
  on public.restaurants (rating desc, review_count desc);

create unique index if not exists restaurants_google_place_id_unique_idx
  on public.restaurants (google_place_id)
  where google_place_id is not null and google_place_id <> '';

create index if not exists restaurants_location_gist_idx
  on public.restaurants using gist (location);
