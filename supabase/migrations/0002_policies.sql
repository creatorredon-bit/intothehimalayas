-- ---------------------------------------------------------------------------
-- IntotheHimalayas — Row Level Security
-- Run after 0001_schema.sql. The browser only ever holds the anon key; these
-- policies are the authorization boundary.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.destinations enable row level security;
alter table public.trails enable row level security;
alter table public.trail_reviews enable row level security;
alter table public.collections enable row level security;
alter table public.saved_trails enable row level security;
alter table public.trips enable row level security;
alter table public.trip_days enable row level security;
alter table public.trip_items enable row level security;
alter table public.guides enable row level security;
alter table public.stays enable row level security;
alter table public.inquiries enable row level security;
alter table public.contact_messages enable row level security;

-- Profiles -------------------------------------------------------------------
-- A user can read and edit only their own row. Admins can read all rows.
-- Public pages never read profiles: review author names are denormalised.

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'user');

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Public content -------------------------------------------------------------
-- Anonymous visitors read published rows. Only admins write.

drop policy if exists trails_read_published on public.trails;
create policy trails_read_published on public.trails
  for select to anon, authenticated
  using (published or public.is_admin());

drop policy if exists trails_admin_write on public.trails;
create policy trails_admin_write on public.trails
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists destinations_read_published on public.destinations;
create policy destinations_read_published on public.destinations
  for select to anon, authenticated
  using (published or public.is_admin());

drop policy if exists destinations_admin_write on public.destinations;
create policy destinations_admin_write on public.destinations
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists guides_read_published on public.guides;
create policy guides_read_published on public.guides
  for select to anon, authenticated
  using (published or public.is_admin());

drop policy if exists guides_admin_write on public.guides;
create policy guides_admin_write on public.guides
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists stays_read_published on public.stays;
create policy stays_read_published on public.stays
  for select to anon, authenticated
  using (published or public.is_admin());

drop policy if exists stays_admin_write on public.stays;
create policy stays_admin_write on public.stays
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Reviews --------------------------------------------------------------------
-- Approved reviews are public. A signed-in user can see their own pending
-- review, submit exactly one pending review, and delete their own review.
-- Only admins can change status (moderation).

drop policy if exists reviews_read on public.trail_reviews;
create policy reviews_read on public.trail_reviews
  for select to anon, authenticated
  using (status = 'approved' or user_id = auth.uid() or public.is_admin());

drop policy if exists reviews_insert_own_pending on public.trail_reviews;
create policy reviews_insert_own_pending on public.trail_reviews
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

drop policy if exists reviews_delete_own on public.trail_reviews;
create policy reviews_delete_own on public.trail_reviews
  for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists reviews_admin_all on public.trail_reviews;
create policy reviews_admin_all on public.trail_reviews
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Collections and saves ------------------------------------------------------

drop policy if exists collections_owner_all on public.collections;
create policy collections_owner_all on public.collections
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists saved_trails_owner_all on public.saved_trails;
create policy saved_trails_owner_all on public.saved_trails
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Trips ----------------------------------------------------------------------
-- Ownership is stored on every row (including child rows) so policies remain
-- simple and index-friendly.

drop policy if exists trips_owner_all on public.trips;
create policy trips_owner_all on public.trips
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists trip_days_owner_all on public.trip_days;
create policy trip_days_owner_all on public.trip_days
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists trip_items_owner_all on public.trip_items;
create policy trip_items_owner_all on public.trip_items
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Inquiries ------------------------------------------------------------------

drop policy if exists inquiries_insert_own on public.inquiries;
create policy inquiries_insert_own on public.inquiries
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists inquiries_select_own_or_admin on public.inquiries;
create policy inquiries_select_own_or_admin on public.inquiries
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists inquiries_admin_write on public.inquiries;
create policy inquiries_admin_write on public.inquiries
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Contact messages -----------------------------------------------------------
-- Anyone (including anonymous visitors) may submit; only admins may read.

drop policy if exists contact_messages_insert_public on public.contact_messages;
create policy contact_messages_insert_public on public.contact_messages
  for insert to anon, authenticated
  with check (true);

drop policy if exists contact_messages_admin_read on public.contact_messages;
create policy contact_messages_admin_read on public.contact_messages
  for select to authenticated
  using (public.is_admin());

-- Privileges -----------------------------------------------------------------
-- Policies are evaluated after grants, so grant only what the app needs.

grant usage on schema public to anon, authenticated;

grant select on public.trails, public.destinations, public.guides, public.stays, public.trail_reviews to anon;
grant insert on public.contact_messages to anon;

grant select on public.trails, public.destinations, public.guides, public.stays, public.trail_reviews to authenticated;
grant insert, update, delete on public.trails, public.destinations, public.guides, public.stays to authenticated;

grant select, insert, update, delete on public.profiles, public.collections, public.saved_trails to authenticated;
grant select, insert, update, delete on public.trips, public.trip_days, public.trip_items to authenticated;
grant select, insert, delete on public.trail_reviews to authenticated;
grant select, insert, update, delete on public.inquiries to authenticated;
grant select, insert on public.contact_messages to authenticated;
grant update on public.contact_messages to authenticated;
