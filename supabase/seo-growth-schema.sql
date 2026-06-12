-- Mango Vietnam SEO growth schema
-- Keeps the existing restaurants table intact and adds scalable SEO tables.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists postgis;

alter table public.restaurants
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.restaurants
  add column if not exists location geography(point, 4326)
    generated always as (
      case
        when latitude is null or longitude is null then null
        else st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
      end
    ) stored;

create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  role text,
  bio text,
  avatar_url text,
  language text not null default 'ko-KR',
  expertise jsonb not null default '[]'::jsonb,
  schema_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.landmarks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  city text not null,
  district text,
  address text,
  latitude double precision,
  longitude double precision,
  location geography(point, 4326)
    generated always as (
      case
        when latitude is null or longitude is null then null
        else st_setsrid(st_makepoint(longitude, latitude), 4326)::geography
      end
    ) stored,
  type text not null default 'area',
  radius_meters integer not null default 1500,
  aliases jsonb not null default '[]'::jsonb,
  seo_keywords jsonb not null default '[]'::jsonb,
  description text,
  google_maps_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.landmarks
  add column if not exists radius_meters integer not null default 1500;

create table if not exists public.seo_landing_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  canonical_path text not null,
  locale text not null default 'ko-KR',
  city text,
  district text,
  category text,
  subcategory text,
  landmark_slug text references public.landmarks(slug) on delete set null,
  intent text not null,
  primary_keyword text not null,
  secondary_keywords jsonb not null default '[]'::jsonb,
  title text not null,
  h1 text not null,
  meta_description text not null,
  summary text not null,
  body_sections jsonb not null default '[]'::jsonb,
  faq_json jsonb not null default '[]'::jsonb,
  schema_json jsonb not null default '{}'::jsonb,
  internal_links jsonb not null default '[]'::jsonb,
  related_restaurants jsonb not null default '[]'::jsonb,
  author_id uuid references public.authors(id) on delete set null,
  status text not null default 'draft',
  noindex boolean not null default false,
  priority numeric(4,3) not null default 0.500,
  source_hash text,
  generated_from text not null default 'automation',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.seo_landing_pages
  add column if not exists noindex boolean not null default false;

create table if not exists public.seo_landing_page_restaurants (
  page_slug text not null references public.seo_landing_pages(slug) on delete cascade,
  restaurant_slug text not null,
  rank integer not null,
  reason text,
  section text not null default 'recommended',
  score numeric(6,2) not null default 0,
  created_at timestamptz not null default now(),
  primary key (page_slug, restaurant_slug)
);

create table if not exists public.seo_internal_links (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_slug text not null,
  target_type text not null,
  target_slug text not null,
  anchor_text text not null,
  reason text,
  weight numeric(4,3) not null default 0.500,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (source_type, source_slug, target_type, target_slug)
);

create table if not exists public.restaurant_related (
  restaurant_slug text not null,
  related_restaurant_slug text not null,
  relation_type text not null,
  score numeric(6,2) not null default 0,
  reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  primary key (restaurant_slug, related_restaurant_slug),
  check (restaurant_slug <> related_restaurant_slug)
);

create table if not exists public.restaurant_schema_cache (
  restaurant_slug text primary key,
  schema_json jsonb not null default '{}'::jsonb,
  faq_json jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists authors_slug_idx on public.authors (slug);

create index if not exists landmarks_city_district_type_idx on public.landmarks (city, district, type);
create index if not exists landmarks_location_gist_idx on public.landmarks using gist (location);
create index if not exists landmarks_name_trgm_idx on public.landmarks using gin (name gin_trgm_ops);
create index if not exists landmarks_aliases_gin_idx on public.landmarks using gin (aliases);
create index if not exists landmarks_seo_keywords_gin_idx on public.landmarks using gin (seo_keywords);

create index if not exists seo_landing_pages_city_category_intent_idx
  on public.seo_landing_pages (city, category, intent);
create index if not exists seo_landing_pages_city_district_category_idx
  on public.seo_landing_pages (city, district, category);
create index if not exists seo_landing_pages_status_priority_idx
  on public.seo_landing_pages (status, priority desc, updated_at desc);
create index if not exists seo_landing_pages_noindex_idx
  on public.seo_landing_pages (noindex, status);
create index if not exists seo_landing_pages_primary_keyword_trgm_idx
  on public.seo_landing_pages using gin (primary_keyword gin_trgm_ops);
create index if not exists seo_landing_pages_title_trgm_idx
  on public.seo_landing_pages using gin (title gin_trgm_ops);
create index if not exists seo_landing_pages_secondary_keywords_gin_idx
  on public.seo_landing_pages using gin (secondary_keywords);

create index if not exists seo_landing_page_restaurants_restaurant_slug_idx
  on public.seo_landing_page_restaurants (restaurant_slug);
create index if not exists seo_landing_page_restaurants_page_rank_idx
  on public.seo_landing_page_restaurants (page_slug, rank);

create index if not exists seo_internal_links_source_idx
  on public.seo_internal_links (source_type, source_slug);
create index if not exists seo_internal_links_target_idx
  on public.seo_internal_links (target_type, target_slug);
create index if not exists seo_internal_links_weight_idx
  on public.seo_internal_links (weight desc);

create index if not exists restaurant_related_restaurant_score_idx
  on public.restaurant_related (restaurant_slug, score desc);
create index if not exists restaurant_related_related_idx
  on public.restaurant_related (related_restaurant_slug);
create index if not exists restaurant_schema_cache_schema_gin_idx
  on public.restaurant_schema_cache using gin (schema_json);

create index if not exists restaurants_city_category_idx on public.restaurants (city, category);
create index if not exists restaurants_city_district_idx on public.restaurants (city, district);
create index if not exists restaurants_rating_review_idx on public.restaurants (rating desc, review_count desc);
create index if not exists restaurants_location_gist_idx on public.restaurants using gist (location);

create or replace function public.nearby_restaurants_for_landmark(
  p_landmark_slug text,
  p_radius_meters integer default null
)
returns table (
  landmark_slug text,
  restaurant_slug text,
  restaurant_name text,
  city text,
  district text,
  category text,
  rating numeric,
  review_count integer,
  distance_meters double precision
)
language sql
stable
as $$
  select
    l.slug as landmark_slug,
    r.slug as restaurant_slug,
    r.name as restaurant_name,
    r.city,
    r.district,
    r.category,
    r.rating,
    r.review_count,
    st_distance(r.location, l.location) as distance_meters
  from public.landmarks l
  join public.restaurants r
    on r.location is not null
   and l.location is not null
   and r.city = l.city
   and st_dwithin(r.location, l.location, coalesce(p_radius_meters, l.radius_meters, 1500))
  where l.slug = p_landmark_slug
    and l.status = 'active'
  order by distance_meters asc, r.rating desc nulls last, r.review_count desc nulls last;
$$;

insert into public.authors (slug, name, role, bio, expertise, schema_json)
values (
  'mango-editorial-team',
  'Mango Vietnam Editorial Team',
  'Korean Vietnam Guide Editors',
  '베트남 거주 한국인과 여행자를 위한 맛집, 카페, 생활정보를 큐레이션합니다.',
  '["Vietnam restaurants", "Korean traveler intent", "local life guide", "SEO editorial"]'::jsonb,
  jsonb_build_object(
    '@type', 'Organization',
    'name', 'Mango Vietnam Editorial Team',
    'url', 'https://mango-vietnam.com'
  )
)
on conflict (slug) do update
set
  name = excluded.name,
  role = excluded.role,
  bio = excluded.bio,
  expertise = excluded.expertise,
  schema_json = excluded.schema_json,
  updated_at = now();

insert into public.landmarks (
  slug,
  name,
  city,
  district,
  latitude,
  longitude,
  type,
  radius_meters,
  aliases,
  seo_keywords,
  description
)
values
  ('ben-thanh-market', '벤탄시장', 'Ho Chi Minh City', 'District 1', 10.7721, 106.6983, 'market', 800, '["Ben Thanh Market", "Cho Ben Thanh", "Bến Thành"]'::jsonb, '["벤탄시장 근처 맛집", "호치민 벤탄시장 맛집", "벤탄시장 한식당"]'::jsonb, '호치민 1군 중심의 대표 시장이자 여행자 동선의 핵심 랜드마크입니다.'),
  ('bui-vien-walking-street', '부이비엔', 'Ho Chi Minh City', 'District 1', 10.7677, 106.6931, 'walking_street', 800, '["Bui Vien", "Bui Vien Walking Street", "Pham Ngu Lao"]'::jsonb, '["부이비엔 근처 맛집", "호치민 부이비엔 맛집", "팜응라오 맛집"]'::jsonb, '여행자 거리와 야간 동선이 몰리는 호치민 1군의 대표 워킹스트리트입니다.'),
  ('landmark-81', '랜드마크81', 'Ho Chi Minh City', 'Binh Thanh', 10.7947, 106.7219, 'landmark', 1500, '["Landmark 81", "Vinhomes Central Park"]'::jsonb, '["랜드마크81 근처 맛집", "빈홈 센트럴파크 맛집", "호치민 랜드마크81 식당"]'::jsonb, '빈탄 지역과 빈홈 센트럴파크 동선에서 자주 찾는 호치민 대표 초고층 랜드마크입니다.'),
  ('nguyen-hue-walking-street', '응우옌후에 거리', 'Ho Chi Minh City', 'District 1', 10.7753, 106.7038, 'walking_street', 800, '["Nguyen Hue Walking Street", "Nguyen Hue"]'::jsonb, '["응우옌후에 근처 맛집", "호치민 시청 근처 맛집", "동코이 근처 맛집"]'::jsonb, '호치민 시청과 동코이 거리 이동 동선에 가까운 중심 산책 거리입니다.'),
  ('saigon-notre-dame-cathedral', '사이공 노트르담 성당', 'Ho Chi Minh City', 'District 1', 10.7798, 106.6990, 'cathedral', 800, '["Saigon Notre Dame Cathedral", "Notre Dame Cathedral of Saigon"]'::jsonb, '["노트르담 성당 근처 맛집", "호치민 성당 근처 카페", "호치민 1군 관광지 맛집"]'::jsonb, '호치민 1군 관광 코스에서 우체국, 동코이와 함께 묶이는 대표 명소입니다.'),
  ('tan-son-nhat-airport', '떤선녓 공항', 'Ho Chi Minh City', 'District 1', 10.8188, 106.6520, 'airport', 1500, '["Tan Son Nhat Airport", "SGN Airport"]'::jsonb, '["떤선녓 공항 근처 맛집", "호치민 공항 근처 식당", "SGN 공항 맛집"]'::jsonb, '호치민 입출국 전후 식사를 찾는 수요가 많은 공항 권역입니다.'),
  ('thao-dien', '타오디엔', 'Ho Chi Minh City', 'Thao Dien', 10.8025, 106.7402, 'area', 1500, '["Thao Dien", "District 2 Thao Dien"]'::jsonb, '["타오디엔 맛집", "호치민 2군 맛집", "타오디엔 카페"]'::jsonb, '호치민 2군의 카페, 레스토랑, 외국인 거주 동선이 모이는 지역입니다.'),
  ('phu-my-hung', '푸미흥', 'Ho Chi Minh City', 'Phu My Hung', 10.7292, 106.7084, 'area', 1500, '["Phu My Hung", "District 7", "Hung Phuoc"]'::jsonb, '["푸미흥 맛집", "호치민 7군 한식당", "푸미흥 카페"]'::jsonb, '호치민 7군 한국인 거주자 동선이 강한 생활권입니다.'),

  ('han-market', '한시장', 'Da Nang', 'Hai Chau', 16.0678, 108.2240, 'market', 800, '["Han Market", "Cho Han", "Chợ Hàn"]'::jsonb, '["한시장 근처 맛집", "다낭 한시장 맛집", "한시장 근처 카페"]'::jsonb, '다낭 시내 쇼핑과 식사 동선이 겹치는 대표 시장입니다.'),
  ('my-khe-beach', '미케비치', 'Da Nang', 'My Khe', 16.0618, 108.2477, 'beach', 1500, '["My Khe Beach", "My Khe"]'::jsonb, '["미케비치 근처 맛집", "다낭 미케비치 맛집", "미케비치 카페"]'::jsonb, '다낭 여행자의 숙소와 해변 동선이 집중되는 대표 해변입니다.'),
  ('dragon-bridge-da-nang', '용다리', 'Da Nang', 'Hai Chau', 16.0610, 108.2277, 'landmark', 800, '["Dragon Bridge", "Cau Rong"]'::jsonb, '["용다리 근처 맛집", "다낭 용다리 맛집", "다낭 시내 맛집"]'::jsonb, '다낭 시내 야경과 한강변 이동 동선의 중심 랜드마크입니다.'),
  ('an-thuong-area', '안트엉 거리', 'Da Nang', 'An Thuong', 16.0498, 108.2444, 'area', 800, '["An Thuong", "My An"]'::jsonb, '["안트엉 맛집", "다낭 안트엉 카페", "안트엉 근처 식당"]'::jsonb, '미케비치 인근의 카페, 바, 레스토랑 밀집 지역입니다.'),
  ('da-nang-cathedral', '다낭 대성당', 'Da Nang', 'Hai Chau', 16.0670, 108.2233, 'cathedral', 800, '["Da Nang Cathedral", "Pink Church"]'::jsonb, '["다낭 대성당 근처 맛집", "핑크성당 근처 카페", "다낭 시내 카페"]'::jsonb, '한시장, 콩카페, 한강변 동선과 함께 움직이기 좋은 다낭 시내 명소입니다.'),
  ('son-tra-night-market', '선짜 야시장', 'Da Nang', 'Son Tra', 16.0619, 108.2323, 'night_market', 800, '["Son Tra Night Market", "Chợ đêm Sơn Trà"]'::jsonb, '["선짜 야시장 근처 맛집", "다낭 야시장 맛집", "용다리 야시장 맛집"]'::jsonb, '용다리와 가까운 다낭 야간 먹거리 동선입니다.'),

  ('nha-trang-night-market', '나트랑 야시장', 'Nha Trang', 'Loc Tho', 12.2388, 109.1967, 'night_market', 800, '["Nha Trang Night Market", "Cho Dem Nha Trang"]'::jsonb, '["나트랑 야시장 근처 맛집", "나트랑 시내 맛집", "나트랑 야시장 카페"]'::jsonb, '나트랑 시내 관광객 동선의 대표 야시장입니다.'),
  ('tran-phu-beach', '쩐푸 해변', 'Nha Trang', 'Tran Phu', 12.2381, 109.1961, 'beach', 1500, '["Tran Phu Beach", "Tran Phu"]'::jsonb, '["쩐푸 해변 근처 맛집", "나트랑 해변 맛집", "나트랑 오션뷰 카페"]'::jsonb, '나트랑 중심 해변과 호텔 동선이 모이는 대표 지역입니다.'),
  ('hon-chong', '혼총 곶', 'Nha Trang', 'Hon Chong', 12.2732, 109.2053, 'attraction', 1500, '["Hon Chong", "Hòn Chồng"]'::jsonb, '["혼총 근처 맛집", "나트랑 혼총 맛집", "혼총 카페"]'::jsonb, '나트랑 북쪽 해안 관광 동선의 대표 명소입니다.'),
  ('dam-market', '담시장', 'Nha Trang', 'Loc Tho', 12.2542, 109.1910, 'market', 800, '["Dam Market", "Cho Dam", "Chợ Đầm"]'::jsonb, '["담시장 근처 맛집", "나트랑 담시장 맛집", "담시장 근처 카페"]'::jsonb, '나트랑 전통시장 쇼핑 동선과 가까운 생활형 랜드마크입니다.'),
  ('vinwonders-nha-trang', '빈원더스 나트랑', 'Nha Trang', 'Tran Phu', 12.2170, 109.2400, 'theme_park', 1500, '["VinWonders Nha Trang", "Vinpearl Nha Trang"]'::jsonb, '["빈원더스 나트랑 근처 맛집", "빈펄 나트랑 식당", "나트랑 가족여행 맛집"]'::jsonb, '가족 여행 동선에서 식사 수요가 생기는 나트랑 대표 관광지입니다.'),

  ('hoan-kiem-lake', '호안끼엠 호수', 'Hanoi', 'Hoan Kiem', 21.0287, 105.8524, 'lake', 800, '["Hoan Kiem Lake", "Sword Lake"]'::jsonb, '["호안끼엠 호수 근처 맛집", "하노이 호안끼엠 맛집", "하노이 구시가지 맛집"]'::jsonb, '하노이 구시가지 관광과 산책 동선의 중심입니다.'),
  ('hanoi-old-quarter', '하노이 구시가지', 'Hanoi', 'Hoan Kiem', 21.0350, 105.8500, 'area', 800, '["Hanoi Old Quarter", "Old Quarter"]'::jsonb, '["하노이 구시가지 맛집", "올드쿼터 맛집", "하노이 맥주거리 맛집"]'::jsonb, '하노이 여행자의 숙소, 카페, 로컬 식당 동선이 집중되는 지역입니다.'),
  ('st-joseph-cathedral-hanoi', '성요셉 성당', 'Hanoi', 'Hoan Kiem', 21.0287, 105.8489, 'cathedral', 800, '["St Joseph Cathedral", "Nha Tho Lon"]'::jsonb, '["성요셉 성당 근처 맛집", "하노이 성당 근처 카페", "호안끼엠 카페"]'::jsonb, '호안끼엠과 가까운 하노이 대표 성당이자 카페 동선입니다.'),
  ('west-lake-hanoi', '서호', 'Hanoi', 'Tay Ho', 21.0583, 105.8230, 'lake', 1500, '["West Lake", "Tay Ho"]'::jsonb, '["서호 근처 맛집", "하노이 떠이호 맛집", "타이호 카페"]'::jsonb, '하노이 거주자와 장기 체류자가 자주 찾는 호수 주변 생활권입니다.'),
  ('lotte-center-hanoi', '롯데센터 하노이', 'Hanoi', 'Ba Dinh', 21.0322, 105.8120, 'mall', 1500, '["Lotte Center Hanoi", "Lotte Mall Hanoi"]'::jsonb, '["롯데센터 하노이 근처 맛집", "바딘 맛집", "하노이 롯데 근처 식당"]'::jsonb, '바딘 지역 쇼핑, 호텔, 비즈니스 동선에서 찾기 좋은 기준점입니다.'),
  ('hanoi-train-street', '하노이 기찻길', 'Hanoi', 'Hoan Kiem', 21.0306, 105.8460, 'street', 800, '["Hanoi Train Street", "Train Street"]'::jsonb, '["하노이 기찻길 근처 맛집", "트레인스트리트 카페", "하노이 기찻길 카페"]'::jsonb, '하노이 여행 사진 동선과 카페 수요가 겹치는 거리입니다.'),

  ('xuan-huong-lake', '쑤언흐엉 호수', 'Da Lat', 'Xuan Huong Lake', 11.9431, 108.4452, 'lake', 1500, '["Xuan Huong Lake", "Hồ Xuân Hương"]'::jsonb, '["쑤언흐엉 호수 근처 맛집", "달랏 호수 근처 카페", "달랏 시내 맛집"]'::jsonb, '달랏 시내 산책과 카페 동선의 중심 호수입니다.'),
  ('da-lat-night-market', '달랏 야시장', 'Da Lat', 'City Center', 11.9401, 108.4378, 'night_market', 800, '["Da Lat Night Market", "Cho Dem Da Lat"]'::jsonb, '["달랏 야시장 근처 맛집", "달랏 시내 맛집", "달랏 야시장 카페"]'::jsonb, '달랏 시내 저녁 먹거리와 쇼핑 동선의 중심입니다.'),
  ('lam-vien-square', '람비엔 광장', 'Da Lat', 'Xuan Huong Lake', 11.9390, 108.4450, 'landmark', 800, '["Lam Vien Square", "Quang Truong Lam Vien"]'::jsonb, '["람비엔 광장 근처 맛집", "달랏 람비엔 카페", "달랏 광장 맛집"]'::jsonb, '쑤언흐엉 호수와 가까운 달랏 대표 광장입니다.'),
  ('crazy-house-da-lat', '크레이지 하우스', 'Da Lat', 'City Center', 11.9400, 108.4295, 'attraction', 800, '["Crazy House Da Lat", "Hang Nga Guesthouse"]'::jsonb, '["크레이지 하우스 근처 맛집", "달랏 관광지 맛집", "달랏 카페"]'::jsonb, '달랏 중심 관광지 중 하나로 식사와 카페 동선이 이어집니다.'),
  ('da-lat-railway-station', '달랏 기차역', 'Da Lat', 'Xuan Huong Lake', 11.9441, 108.4560, 'station', 1500, '["Da Lat Railway Station", "Dalat Train Station"]'::jsonb, '["달랏 기차역 근처 맛집", "달랏 기차역 카페", "달랏 관광지 맛집"]'::jsonb, '달랏 동쪽 관광 동선과 함께 묶이는 기차역입니다.'),

  ('duong-dong-night-market', '즈엉동 야시장', 'Phu Quoc', 'Duong Dong', 10.2167, 103.9590, 'night_market', 800, '["Duong Dong Night Market", "Phu Quoc Night Market"]'::jsonb, '["즈엉동 야시장 근처 맛집", "푸꾸옥 야시장 맛집", "푸꾸옥 즈엉동 맛집"]'::jsonb, '푸꾸옥 중심 야시장과 저녁 먹거리 동선입니다.'),
  ('long-beach-bai-truong', '롱비치', 'Phu Quoc', 'Bai Truong', 10.1800, 103.9660, 'beach', 1500, '["Long Beach", "Bai Truong"]'::jsonb, '["롱비치 근처 맛집", "푸꾸옥 바이쯔엉 맛집", "푸꾸옥 해변 맛집"]'::jsonb, '푸꾸옥 리조트와 해변 식사 수요가 많은 대표 해변입니다.'),
  ('grand-world-phu-quoc', '그랜드월드 푸꾸옥', 'Phu Quoc', 'Duong Dong', 10.3320, 103.8540, 'attraction', 1500, '["Grand World Phu Quoc", "Grand World"]'::jsonb, '["그랜드월드 푸꾸옥 근처 맛집", "푸꾸옥 북부 맛집", "그랜드월드 식당"]'::jsonb, '푸꾸옥 북부 관광과 쇼핑 동선의 대표 복합 관광지입니다.'),
  ('sunset-town-phu-quoc', '선셋타운', 'Phu Quoc', 'An Thoi', 10.0296, 104.0052, 'area', 1500, '["Sunset Town", "An Thoi Sunset Town"]'::jsonb, '["선셋타운 근처 맛집", "푸꾸옥 안터이 맛집", "선셋타운 카페"]'::jsonb, '안터이 케이블카, 남부 관광 동선과 함께 움직이는 지역입니다.'),
  ('sao-beach', '사오비치', 'Phu Quoc', 'An Thoi', 10.0500, 104.0350, 'beach', 1500, '["Sao Beach", "Bai Sao"]'::jsonb, '["사오비치 근처 맛집", "푸꾸옥 사오비치 식당", "푸꾸옥 남부 맛집"]'::jsonb, '푸꾸옥 남부 해변 관광 동선에서 식사를 찾는 수요가 있는 해변입니다.'),
  ('ong-lang-beach', '옹랑비치', 'Phu Quoc', 'Ong Lang', 10.2550, 103.9360, 'beach', 1500, '["Ong Lang Beach", "Ong Lang"]'::jsonb, '["옹랑비치 근처 맛집", "푸꾸옥 옹랑 맛집", "옹랑비치 카페"]'::jsonb, '푸꾸옥 서북부 리조트와 해변 동선이 이어지는 지역입니다.')
on conflict (slug) do update
set
  name = excluded.name,
  city = excluded.city,
  district = excluded.district,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  type = excluded.type,
  radius_meters = excluded.radius_meters,
  aliases = excluded.aliases,
  seo_keywords = excluded.seo_keywords,
  description = excluded.description,
  status = 'active',
  updated_at = now();

create or replace view public.seo_page_public as
select
  slug,
  canonical_path,
  locale,
  city,
  district,
  category,
  subcategory,
  landmark_slug,
  intent,
  primary_keyword,
  secondary_keywords,
  title,
  h1,
  meta_description,
  summary,
  body_sections,
  faq_json,
  schema_json,
  internal_links,
  related_restaurants,
  author_id,
  priority,
  published_at,
  updated_at
from public.seo_landing_pages
where status = 'published';

create or replace view public.restaurant_seo_candidates as
select
  slug,
  name,
  city,
  district,
  address,
  google_maps_url,
  category,
  rating,
  review_count,
  phone,
  website,
  description,
  seo_title,
  seo_description,
  featured_image,
  latitude,
  longitude
from public.restaurants
where slug is not null
  and name is not null
  and city is not null;
