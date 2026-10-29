-- ---------------------------------------------------------------------------
-- IntotheHimalayas — aggregates and helper functions
-- Run after 0002_policies.sql.
-- ---------------------------------------------------------------------------

-- Keep the denormalised rating on each trail in sync with approved reviews.
-- SECURITY DEFINER is required because the trigger runs while an admin (or a
-- user) writes a review row and the trails table is admin-write-only.
create or replace function public.refresh_trail_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_trail uuid := coalesce(new.trail_id, old.trail_id);
begin
  update public.trails t
  set
    avg_rating = summary.avg_rating,
    review_count = summary.review_count
  from (
    select
      round(avg(r.rating)::numeric, 1) as avg_rating,
      count(*)::integer as review_count
    from public.trail_reviews r
    where r.trail_id = target_trail
      and r.status = 'approved'
  ) as summary
  where t.id = target_trail
    and (
      t.avg_rating is distinct from summary.avg_rating
      or t.review_count is distinct from summary.review_count
    );
  return null;
end;
$$;

drop trigger if exists trail_reviews_refresh_rating on public.trail_reviews;
create trigger trail_reviews_refresh_rating
  after insert or update of status, rating or delete on public.trail_reviews
  for each row execute function public.refresh_trail_rating();

-- Convenience view for the admin dashboard. Respects RLS on the base tables.
create or replace view public.review_moderation_queue
with (security_invoker = true) as
select
  r.id,
  r.trail_id,
  t.name as trail_name,
  t.slug as trail_slug,
  r.author_name,
  r.rating,
  r.title,
  r.body,
  r.status,
  r.created_at
from public.trail_reviews r
join public.trails t on t.id = r.trail_id
where r.status = 'pending'
order by r.created_at asc;

-- Public, non-sensitive facets used by filter menus.
create or replace function public.public_regions()
returns table (region text)
language sql
stable
security invoker
as $$
  select distinct t.region
  from public.trails t
  where t.published
  order by t.region;
$$;

grant execute on function public.public_regions() to anon, authenticated;
grant select on public.review_moderation_queue to authenticated;

comment on view public.review_moderation_queue is 'Pending reviews joined to trail names for admin moderation.';
