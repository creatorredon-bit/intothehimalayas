# Database, RLS and roles

Postgres schema for IntotheHimalayas, designed for the web app and a future React Native client. Everything below lives in `supabase/migrations/` and is applied in numeric order.

## Apply the migrations

**Supabase dashboard:** open the SQL editor and run the files in order:

1. `0001_schema.sql` — extensions, enums, tables, indexes, helper functions and triggers (including `is_admin()` and profile creation on signup).
2. `0002_policies.sql` — enables RLS on every table, creates policies and grants.
3. `0003_functions.sql` — review-rating aggregate trigger, moderation view, public region facet.
4. `0004_moderator_role.sql` — adds `moderator` to `user_role`. Run this file on its own; PostgreSQL cannot use a new enum value in the transaction that adds it.
5. `0005_community_and_splits.sql` — staff announcements, split groups/members/bills/participants, helpers, policies and grants.
6. `seed.sql` — optional sample content (generated from the app's typed dataset).

**Supabase CLI:**

```bash
supabase link --project-ref <project-ref>
supabase db push
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

`seed.sql` is idempotent for the sample IDs: it deletes rows whose UUIDs start with the sample prefixes (`a…`, `b…`, `c…`, `d…`) and reinserts them. Re-running it will remove user saves/reviews attached to those sample trails (cascades), which is expected in a demo environment.

## Entities

| Table | Purpose | Key relations |
| --- | --- | --- |
| `profiles` | Public-safe account profile, preferences, role | `id → auth.users` (cascade) |
| `destinations` | Regions, parks, trekking areas | — |
| `trails` | Route records, facts, itinerary, GeoJSON route | `destination_id → destinations` (set null) |
| `trail_reviews` | Moderated reviews, one per user per trail | `trail_id → trails` (cascade), `user_id → auth.users` |
| `collections` | User-defined saved-trail groups | `user_id → auth.users` |
| `saved_trails` | Saved trail, optional note and collection | `trail_id → trails`, `collection_id → collections` |
| `trips` | Trip header, dates, travellers, budget | `user_id → auth.users` |
| `trip_days` | Ordered days within a trip | `trip_id → trips` (cascade) |
| `trip_items` | Stops/activities on a day, optional trail link | `trip_day_id → trip_days`, `trail_id → trails` |
| `guides` | Guide/operator listings | — |
| `stays` | Teahouse/lodge/hotel/homestay listings | `destination_id → destinations` |
| `inquiries` | Guide/stay messages from signed-in users | `user_id → auth.users` |
| `contact_messages` | Public contact form submissions | — |
| `community_posts` | Staff announcements with category, pin state and publish flag | `author_id → auth.users` (cascade) |
| `split_groups` | Cost-splitting ledger owned by one user | `owner_id → auth.users` (cascade) |
| `split_members` | Friends on a ledger, optionally matched by account email | `group_id → split_groups` (cascade) |
| `split_expenses` | One bill: amount, payer, date | `group_id → split_groups`, `paid_by_member_id → split_members` (restrict) |
| `split_expense_participants` | Which members share a bill equally | `expense_id → split_expenses`, `member_id → split_members` (cascade) |

Notable constraints:

- `trails.route_geojson` must be `null` or a GeoJSON `LineString` with an array of coordinates.
- `trails.itinerary` must be a JSON array.
- `best_seasons` must be a subset of `spring/summer/autumn/winter`.
- `trail_reviews` enforces one review per `(trail_id, user_id)` and `visited_on <= current_date`.
- `trips.end_date >= start_date`; travellers 1–50; budgets non-negative.
- `trip_days` is unique on `(trip_id, day_number)`.
- `split_expenses.amount_npr` must be positive and at most 10,000,000; the payer must belong to the bill's group (trigger).
- `split_expense_participants` rejects a member from a different group (trigger).
- `split_members` emails are unique per group and validated with a case-insensitive pattern.
- Community titles are 4–140 characters and bodies 20–4,000 characters; category and author role are constrained.
- Slugs are lowercase, hyphenated and unique on trails/destinations/guides/stays.

## Row Level Security matrix

RLS is enabled on **all** tables. "Own" means `user_id = auth.uid()` (or `id = auth.uid()` for profiles).

| Table | anon | authenticated user | admin |
| --- | --- | --- | --- |
| `trails`, `destinations`, `guides`, `stays` | SELECT published | SELECT published | full CRUD (all rows) |
| `trail_reviews` | SELECT approved | SELECT approved + own; INSERT own as `pending`; DELETE own | full CRUD / moderate |
| `profiles` | none | SELECT/INSERT/UPDATE own | SELECT/UPDATE all |
| `collections` | none | full CRUD on own | — (no admin policy, by design) |
| `saved_trails` | none | full CRUD on own | — |
| `trips`, `trip_days`, `trip_items` | none | full CRUD on own | — |
| `inquiries` | none | INSERT own; SELECT own | SELECT all; UPDATE status |
| `contact_messages` | INSERT only | INSERT only | SELECT all |
| `community_posts` | SELECT published | SELECT published | full CRUD / pin / unpublish |
| `community_posts` (staff) | — | moderator/admin: INSERT own; UPDATE/DELETE own | UPDATE/DELETE any |
| `split_groups` | none | owner full CRUD; invited member (matching email) SELECT | — |
| `split_members` | none | visible with the group; owner writes | — |
| `split_expenses` | none | visible with the group; owner writes | — |
| `split_expense_participants` | none | visible with the group; owner writes | — |

Notes:

- Authenticated users cannot change their own `role`: the insert policy forces `role = 'user'`, and the `profiles_prevent_role_escalation` trigger raises `42501` on self-promotion.
- Review status is forced to `pending` at insert. Only the admin policy can approve or reject.
- Admin reads of `profiles` are intentional (staff need account context); no other user can read another profile. Review author names are stored on `trail_reviews` so public pages never join `profiles`.
- `contact_messages` is write-only for the public and read-only for admins. It is never exposed through a public select policy.
- Community author names and roles are not trusted from the client: the `community_posts_set_author` trigger copies both from `profiles` and rejects non-staff authors.
- Split access is decided by `can_read_split_group(id)`, which returns true for the owner or for a signed-in user whose account email matches a member row. Only the owner's `auth.uid()` may write, so an invited friend sees the ledger read-only.
- The split helpers are `SECURITY DEFINER` to avoid recursive RLS evaluation between groups, members, bills and participants.

## Functions and triggers

| Object | Purpose |
| --- | --- |
| `public.set_updated_at()` | Maintains `updated_at` on profiles, trails, destinations, guides, stays, reviews, trips |
| `public.is_admin()` | `SECURITY DEFINER` role check used by policies; avoids RLS recursion |
| `public.handle_new_user()` | Creates a `profiles` row after `auth.users` insert, using `raw_user_meta_data.full_name` |
| `public.prevent_role_escalation()` | Blocks role changes by non-admins |
| `public.refresh_trail_rating()` | Recomputes `avg_rating` and `review_count` from approved reviews |
| `public.review_moderation_queue` | Admin view of pending reviews (`security_invoker`, respects RLS) |
| `public.public_regions()` | Distinct published regions for filter menus |
| `public.is_staff()` | `SECURITY DEFINER` check for admin **or** moderator |
| `public.set_community_author()` | Forces announcement author name/role from `profiles`; rejects non-staff |
| `public.check_split_expense()` | Payer must belong to the bill's group |
| `public.check_split_participant()` | Participant must belong to the bill's group |
| `public.owns_split_group(uuid)` | Owner check used by write policies |
| `public.can_read_split_group(uuid)` | Owner or email-matched member check |
| `public.split_expense_group(uuid)` | Group lookup for participant policies |

## Roles

There are three application roles in `public.user_role`: `user` (default), `moderator` and `admin`.

- **admin** — full admin dashboard, content CRUD, review moderation, all community posts.
- **moderator** — may publish, edit and delete their own community announcements; no admin dashboard.
- **user** — reads the board and owns their own splits, trips and saves.

Grant admin after the account exists:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Grant moderator the same way with `role = 'moderator'`.

Demote the same way. Never grant either role by allowing the browser to update `profiles.role`; the trigger and policies will reject it.

## Seed content

`seed.sql` is generated:

```bash
npm run seed:generate
```

The generator (`scripts/generate-seed.mjs`) bundles `src/data/sample.ts` with esbuild, imports it, and emits SQL. This keeps the demo dataset and a seeded database identical. It writes 7 destinations, 11 trails, 4 guides and 4 stays, and seeds **no reviews** (reviews must come from real users).

Sample records are flagged:

- `trails.is_sample`, `guides.is_sample`, `stays.is_sample` are `true`.
- The UI renders a "Sample data" badge and an explanatory notice.

## Verifying RLS

Run these in the SQL editor. Replace the UUIDs with real values.

```sql
-- Anonymous reads only published trails
begin;
set local role anon;
select count(*) from public.trails;                 -- published only
select count(*) from public.profiles;               -- permission denied
select count(*) from public.contact_messages;       -- permission denied
rollback;
```

```sql
-- Signed-in user isolation
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '<user-uuid>')::text, true);
select count(*) from public.saved_trails;           -- own rows only
select * from public.trips where user_id <> '<user-uuid>'; -- zero rows
update public.profiles set role = 'admin' where id = '<user-uuid>'; -- should raise 42501
rollback;
```

```sql
-- Admin can write content
begin;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '<admin-uuid>')::text, true);
update public.trails set featured = true where slug = 'everest-base-camp-trek';
rollback;
```

Two-account testing from the UI is still recommended: sign in as user A, save trails and create a trip; sign in as user B and confirm the library is empty and direct URLs to A's trip show "not found".

## Operational notes

- **Backups:** enable Supabase point-in-time recovery for production; test a restore.
- **Migrations:** ship migrations with the app and run them in CI (`supabase db push`) against staging before production.
- **Service role key:** server-side only. It bypasses RLS, so never ship it to a client and never paste it into the app's environment.
- **Email:** Supabase Auth sends verification and recovery emails. Configure custom SMTP for reliable delivery and adjust rate limits for your traffic.
- **Storage:** not configured. Add a `trail-photos` bucket with owner/admin write policies if you need uploads instead of URLs.
- **Analytics:** none by default. If you add it, update the privacy policy and keep it out of private pages.

## Domain types

TypeScript mirrors these tables in `src/lib/types.ts` (camelCase domain objects) and `src/data/mappers.ts` (row → domain mapping with defensive parsing). When the schema changes, update both files and `src/data/admin.ts` field schemas so the generated admin form stays in sync.
