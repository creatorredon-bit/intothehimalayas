-- ---------------------------------------------------------------------------
-- IntotheHimalayas — schema
-- Run this file first in the Supabase SQL editor (or via `supabase db push`).
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto;

-- Enumerated domains ---------------------------------------------------------

do $$ begin
  create type public.user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.difficulty as enum ('easy', 'moderate', 'hard', 'strenuous');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.activity as enum ('trekking', 'hiking', 'peak_climbing', 'sightseeing');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.review_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.stay_type as enum ('teahouse', 'lodge', 'hotel', 'homestay');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inquiry_subject as enum ('guide', 'stay', 'trail');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inquiry_status as enum ('new', 'read', 'closed');
exception when duplicate_object then null; end $$;

-- Shared helpers -------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Role check used by RLS policies. SECURITY DEFINER avoids recursive RLS
-- evaluation when a policy on `profiles` needs to read `profiles`.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Profiles -------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  bio text,
  home_region text,
  preferred_difficulty public.difficulty,
  preferred_activity public.activity,
  preferred_season text check (preferred_season in ('spring', 'summer', 'autumn', 'winter')),
  role public.user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 1000)
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Users may edit their own profile but must not grant themselves a role.
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only administrators can change profile roles' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- Create a profile row whenever Supabase Auth creates a user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Destinations ---------------------------------------------------------------

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  region text not null,
  tagline text not null default '',
  description text not null default '',
  hero_image text not null default '',
  best_seasons text[] not null default '{}',
  lat double precision,
  lng double precision,
  featured boolean not null default false,
  published boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint destinations_seasons_valid
    check (best_seasons <@ array['spring', 'summer', 'autumn', 'winter']::text[]),
  constraint destinations_lat_lng check (
    (lat is null and lng is null) or
    (lat between -90 and 90 and lng between -180 and 180)
  )
);

drop trigger if exists destinations_set_updated_at on public.destinations;
create trigger destinations_set_updated_at
  before update on public.destinations
  for each row execute function public.set_updated_at();

-- Trails ---------------------------------------------------------------------

create table if not exists public.trails (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  summary text not null default '',
  description text not null default '',
  region text not null,
  destination_id uuid references public.destinations (id) on delete set null,
  difficulty public.difficulty not null default 'moderate',
  activity public.activity not null default 'trekking',
  distance_km numeric(7, 1) not null default 0 check (distance_km >= 0),
  duration_days integer not null default 1 check (duration_days > 0),
  max_elevation_m integer not null default 0 check (max_elevation_m >= 0),
  elevation_gain_m integer check (elevation_gain_m >= 0),
  start_point_name text not null default '',
  start_lat double precision,
  start_lng double precision,
  best_seasons text[] not null default '{}',
  hero_image text not null default '',
  gallery text[] not null default '{}',
  route_geojson jsonb,
  itinerary jsonb not null default '[]'::jsonb,
  facilities text[] not null default '{}',
  safety_notes text not null default '',
  permit_info text not null default '',
  permits_required text[] not null default '{}',
  is_sample boolean not null default true,
  featured boolean not null default false,
  published boolean not null default false,
  avg_rating numeric(2, 1),
  review_count integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trails_seasons_valid
    check (best_seasons <@ array['spring', 'summer', 'autumn', 'winter']::text[]),
  constraint trails_route_is_linestring check (
    route_geojson is null or (
      route_geojson ->> 'type' = 'LineString'
      and jsonb_typeof(route_geojson -> 'coordinates') = 'array'
    )
  ),
  constraint trails_itinerary_is_array check (jsonb_typeof(itinerary) = 'array'),
  constraint trails_lat_lng check (
    (start_lat is null and start_lng is null) or
    (start_lat between -90 and 90 and start_lng between -180 and 180)
  )
);

drop trigger if exists trails_set_updated_at on public.trails;
create trigger trails_set_updated_at
  before update on public.trails
  for each row execute function public.set_updated_at();

create index if not exists trails_published_idx on public.trails (published);
create index if not exists trails_region_idx on public.trails (region);
create index if not exists trails_difficulty_idx on public.trails (difficulty);
create index if not exists trails_duration_idx on public.trails (duration_days);
create index if not exists trails_destination_idx on public.trails (destination_id);

-- Reviews --------------------------------------------------------------------

create table if not exists public.trail_reviews (
  id uuid primary key default gen_random_uuid(),
  trail_id uuid not null references public.trails (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null default 'Trekker',
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text not null check (char_length(body) between 10 and 4000),
  visited_on date,
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trail_id, user_id),
  constraint reviews_visited_not_future check (visited_on is null or visited_on <= current_date)
);

drop trigger if exists trail_reviews_set_updated_at on public.trail_reviews;
create trigger trail_reviews_set_updated_at
  before update on public.trail_reviews
  for each row execute function public.set_updated_at();

create index if not exists trail_reviews_trail_idx on public.trail_reviews (trail_id, status);

-- Collections and saves ------------------------------------------------------

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text,
  created_at timestamptz not null default now()
);

create index if not exists collections_user_idx on public.collections (user_id);

create table if not exists public.saved_trails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trail_id uuid not null references public.trails (id) on delete cascade,
  collection_id uuid references public.collections (id) on delete set null,
  note text check (note is null or char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  unique (user_id, trail_id)
);

create index if not exists saved_trails_user_idx on public.saved_trails (user_id, created_at desc);

-- Trips ----------------------------------------------------------------------

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  start_date date,
  end_date date,
  travelers integer not null default 1 check (travelers between 1 and 50),
  budget_npr numeric(12, 2) check (budget_npr is null or budget_npr >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_dates_ordered check (start_date is null or end_date is null or end_date >= start_date)
);

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

create index if not exists trips_user_idx on public.trips (user_id, start_date);

create table if not exists public.trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  day_number integer not null check (day_number > 0),
  date date,
  title text not null default 'Day',
  notes text,
  created_at timestamptz not null default now(),
  unique (trip_id, day_number)
);

create index if not exists trip_days_trip_idx on public.trip_days (trip_id, day_number);

create table if not exists public.trip_items (
  id uuid primary key default gen_random_uuid(),
  trip_day_id uuid not null references public.trip_days (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  trail_id uuid references public.trails (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  start_time time,
  notes text,
  estimated_cost_npr numeric(12, 2) check (estimated_cost_npr is null or estimated_cost_npr >= 0),
  created_at timestamptz not null default now()
);

create index if not exists trip_items_day_idx on public.trip_items (trip_day_id);

-- Marketplace ----------------------------------------------------------------

create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  full_name text not null,
  region text not null,
  languages text[] not null default '{}',
  specialties text[] not null default '{}',
  experience_years integer check (experience_years is null or experience_years between 0 and 70),
  day_rate_npr numeric(10, 2) check (day_rate_npr is null or day_rate_npr >= 0),
  bio text not null default '',
  contact_email text,
  contact_phone text,
  verified boolean not null default false,
  published boolean not null default false,
  is_sample boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists guides_set_updated_at on public.guides;
create trigger guides_set_updated_at
  before update on public.guides
  for each row execute function public.set_updated_at();

create index if not exists guides_region_idx on public.guides (region);

create table if not exists public.stays (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  type public.stay_type not null default 'teahouse',
  region text not null,
  destination_id uuid references public.destinations (id) on delete set null,
  description text not null default '',
  price_per_night_npr numeric(10, 2) check (price_per_night_npr is null or price_per_night_npr >= 0),
  amenities text[] not null default '{}',
  photo_url text not null default '',
  contact_email text,
  lat double precision,
  lng double precision,
  published boolean not null default false,
  is_sample boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists stays_set_updated_at on public.stays;
create trigger stays_set_updated_at
  before update on public.stays
  for each row execute function public.set_updated_at();

create index if not exists stays_region_idx on public.stays (region);

-- Messages -------------------------------------------------------------------

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_type public.inquiry_subject not null,
  subject_id uuid not null,
  name text not null,
  email text not null,
  message text not null check (char_length(message) between 1 and 4000),
  status public.inquiry_status not null default 'new',
  created_at timestamptz not null default now()
);

create index if not exists inquiries_user_idx on public.inquiries (user_id, created_at desc);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null,
  topic text not null default 'General',
  message text not null check (char_length(message) between 1 and 4000),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Public-safe profile data. Auth emails live in auth.users, never here.';
comment on table public.trail_reviews is 'Moderated trail reviews. Author name is denormalised so profiles can stay private.';
comment on table public.trails is 'Trail records. Route geometry is an illustrative LineString, not a surveyed track.';
