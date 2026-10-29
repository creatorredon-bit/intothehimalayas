# IntotheHimalayas

A premium Nepal trekking and hiking web application: trail discovery with maps, honest route data, saved-trail collections, a day-by-day trip planner, guide and stay listings with inquiries, working Supabase authentication, and a role-protected admin dashboard.

Built as a production-oriented application rather than a visual prototype: every button, form, filter and navigation link is wired to real behaviour, and features that require external credentials say so instead of pretending.

- **Front end:** React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router 6, Leaflet + React Leaflet
- **Back end:** Supabase (Postgres, Auth, Row Level Security) via `@supabase/supabase-js`
- **Maps:** OpenTopoMap tiles (OpenStreetMap data), configurable to any OSM-compatible provider
- **Tests:** Vitest + Testing Library (pure logic and a rendered app-shell smoke test)

---

## Quick start

```bash
npm install
cp .env.example .env      # add your Supabase URL and anon key
npm run dev               # http://localhost:3000
```

Without Supabase credentials the app runs in **preview mode**: all public browsing, filtering, mapping, trail details, destinations, guides, stays and the device-local planner work from the bundled sample dataset. Accounts, saved-cloud data and the admin dashboard require a configured Supabase project — they are not simulated.

### Production build

```bash
npm run typecheck
npm test
npm run build             # outputs dist/
npm run preview
```

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | For accounts/admin | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | For accounts/admin | Public anon key. Safe in the browser; RLS enforces access |
| `VITE_SITE_URL` | Recommended | Public origin used for auth redirects and share links (e.g. `https://intothehimalayas.com`) |
| `VITE_MAP_TILE_URL` | Optional | Raster tile template; defaults to OpenTopoMap |
| `VITE_MAP_ATTRIBUTION` | Optional | Attribution HTML required by the tile provider |
| `VITE_MAP_MAX_ZOOM` | Optional | Tile max zoom (default 17) |

Only the **anon** key belongs in this app. Never put a `service_role` key in a `VITE_` variable, a commit, or the browser bundle.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project settings → API**, copy the project URL and anon key into `.env`.
3. In the **SQL editor**, run the migrations in order:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_policies.sql`
   - `supabase/migrations/0003_functions.sql`
4. Load sample content (optional but recommended): run `supabase/seed.sql`.
5. In **Authentication → URL configuration**:
   - Site URL: your deployed origin (or `http://localhost:3000` for local work)
   - Redirect URLs: `http://localhost:3000/**`, `https://your-domain/**`, and the production reset-password URL.
   - Email confirmation: **on** (the sign-up flow expects verification).
6. Sign up through the app, then grant yourself the admin role:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Reload the site and `/admin` becomes available. The route guard is a convenience; every write is also checked by RLS.

Detailed schema, policy matrix and role-bootstrap SQL: [docs/DATABASE.md](docs/DATABASE.md).
Hosting and production checklist: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Regenerating the seed file

`supabase/seed.sql` is generated from the typed sample dataset so demo mode and a seeded database always match:

```bash
npm run seed:generate
```

---

## What is implemented

### Pages

| Route | What works |
| --- | --- |
| `/` | Cinematic hero, working trail search, featured treks, destinations, beginner-friendly routes, season-aware recommendations, guides/stays promotion, app roadmap |
| `/explore` | Server-side search, filters (region, difficulty, distance, duration, elevation, activity, season), sorting, pagination, list/map toggle, shareable URLs, skeletons, empty and error states |
| `/trails/:slug` | Photo gallery, route map with GeoJSON line, key facts, day-by-day itinerary, facilities, permits, safety notes, moderated reviews with submission form, save/share |
| `/destinations` + `/destinations/:slug` | Region directory, region detail, map of trail starts, routes in the region |
| `/plan` + `/plan/:tripId` | Create/edit/delete trips, add days, add trail-linked stops, notes, planned budget vs item estimates, transparent budget builder (signed-in or device-local) |
| `/saved` | Saved-trail library, remove, personal notes, collections, collection assignment |
| `/dashboard` | Profile editing, preferences, saved/trip summaries, email verification state, password reset email, sign out |
| `/guides` + `/guides/:slug` | Search by name/region/language/speciality, verified vs sample labelling, inquiry form |
| `/stays` + `/stays/:slug` | Filters by region/type/price, amenities, location map, inquiry form |
| `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password` | Real Supabase Auth: password sign-in/up, email verification resend, recovery link handling, session persistence, validation and readable errors |
| `/admin` | Role-protected CRUD for trails, destinations, guides, stays and review moderation; read-only inquiry/contact inboxes; live counts |
| `/about`, `/contact`, `/help`, `/privacy`, `/terms` | Editorial about page with photo credits, working contact form, configuration/security/permits help, privacy policy, terms |
| `*` | Helpful 404 |

### Behaviours worth noting

- **Guest mode is explicit.** Saved trails and trips are stored in `localStorage` when signed out and the UI says "saved on this device". Signing in moves the data path to Postgres. There is no fake authentication.
- **Saved trails sync.** `SavedTrailsProvider` reads server rows when a session exists, so counts and hearts are consistent across pages and devices.
- **Filters are URLs.** `/explore?region=Khumbu&difficulty=hard&sort=elevation-desc` is shareable and survives reload.
- **Reviews are moderated.** Inserts are forced to `status = 'pending'` by both the client and the RLS policy; only admins can approve. Author names are denormalised so `profiles` can stay private.
- **No fabricated social proof.** The seed contains no reviews, no ratings and no invented statistics. Homepage counters are computed from the loaded dataset.
- **Sample content is labelled.** Trail cards, listings and detail pages carry a "Sample data" badge where the record ships with the project.
- **Accessible fundamentals.** Skip link, semantic headings, labelled inputs, `aria-pressed` toggles, focus trap and Escape handling in dialogs, visible focus rings, keyboard-operable itinerary accordions.

### Admin dashboard

Tabs for trails, destinations, guides, stays, reviews, inquiries and contact messages. Forms are generated from a field schema (`src/data/admin.ts`) with JSON validation for route geometry and itineraries. Publishing, featuring, verification and moderation are ordinary database updates protected by RLS — there is no client-side-only admin gate.

---

## Architecture

```text
src/
  auth/AuthProvider.tsx        session, profile, role, auth actions
  saved/SavedTrailsProvider.tsx server saves + guest localStorage fallback
  trips/useTrips.ts            one interface over Supabase trips and guest trips
  components/                  Navbar, Footer, Layout, TrailCard, MapView, filters, UI kit
  data/
    content.ts                 public content repository (Supabase or sample)
    user.ts                    profile, saves, collections, trips, reviews, inquiries
    admin.ts                   admin entity schemas + CRUD helpers
    mappers.ts                 snake_case row → domain type mapping and search sanitising
    sample.ts                  typed sample dataset (single source for demo + seed)
    localTrips.ts              guest trip persistence
  lib/                         env, supabase client, types, formatting, filtering,
                               budget maths, photography constants, GeoJSON helper
  pages/                       route-level screens
supabase/migrations/           schema, RLS policies, aggregates/functions
supabase/seed.sql              generated sample data
scripts/generate-seed.mjs      esbuild-powered seed generator
scripts/prepare-deploy.mjs     assembles the Cloudflare Workers bundle from dist/
sites/worker.js                Workers entry point: static assets + SPA fallback
sites/manifest.json            Workers deployment manifest (paths relative to itself)
docs/                          database and deployment documentation
```

**Data flow.** Pages call `src/data/content.ts` (public reads) or `src/data/user.ts` (authenticated writes). Those modules choose Supabase when configured and the typed sample dataset otherwise. Rows are normalised in `mappers.ts`; filtering, sorting, pagination and budget arithmetic are pure functions in `lib/`, unit-tested independently. The repository boundary is the only place that knows about Supabase, which keeps a future React Native client straightforward.

**Authorization.** The browser holds a session JWT and the anon key. Every table has RLS enabled; policies require ownership (`auth.uid()`), publication state, or the admin role (`public.is_admin()`), and a trigger blocks self-promotion on `profiles`. Client-side route guards improve UX but are not the security boundary.

---

## Testing and verification

```bash
npm run typecheck   # TypeScript, strict, no emit
npm test            # 36 tests across 4 files
npm run build       # typecheck + Vite production build
```

The suite covers trail filtering/sorting/pagination and URL serialisation, budget arithmetic, formatting and validation helpers, and an app-shell render test that mounts the homepage inside the real providers and asserts content loaded from the data layer.

Verified in this workspace: strict typecheck passes, 36/36 tests pass across 4 files, and the production build succeeds (160 modules; ~912 KB `dist/`, with the map and Supabase client split into their own chunks). The dev server was confirmed listening on `0.0.0.0:3000` and returning 200 for `/`, `/explore` and `/trails/everest-base-camp-trek` with the preview Host header. No automated browser session or Lighthouse audit was run in this environment.

---

## Known limitations and external credentials

1. **Accounts, saved-cloud data, inquiries and admin require Supabase.** Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, run the migrations, and configure auth redirect URLs. Until then, auth pages explain the requirement and public browsing continues on sample data.
2. **Email delivery beyond Supabase Auth is not configured.** Contact and inquiry forms store messages in Postgres for the admin inbox; no outbound email is sent. Wire a transactional email service or Edge Function for production.
3. **No payments or bookings.** Guide/stay inquiries are messages, not reservations. There is no cart, checkout or payout flow.
4. **Route geometry is illustrative.** Lines are drawn through documented villages and passes; distances, durations and altitudes follow published route descriptions but are not surveyed. Replace with verified GPX before operational use. No live trail conditions are shown.
5. **Sample listings must be replaced.** Guide and stay records ship marked as sample; they are not real businesses.
6. **Images are hotlinked** from Wikimedia Commons under their respective licences, and fonts from Google Fonts. Self-host both for production reliability and licence hygiene.
7. **No image uploads.** Admin image fields take URLs; configure a Supabase Storage bucket and uploader if editors need files.
8. **No CAPTCHA or rate limiting** on public contact submissions. Add Turnstile/hCaptcha and platform rate limits before a public launch.
9. **No analytics, marketing pixels or newsletter.** Nothing is tracked beyond Supabase Auth and the data you explicitly save.
10. **No native app in this repository.** The schema and repository layer are designed for a shared React Native + Expo client; see the roadmap below.
11. **Accessibility is implemented, not certified.** Keyboard paths, labels and focus handling are in place; a screen-reader and axe audit is still recommended.

---

## Mobile roadmap (React Native + Expo)

The backend is deliberately client-agnostic:

- Auth is standard Supabase Auth; the native client can use `@supabase/supabase-js` with `AsyncStorage`.
- Trips, saved trails, collections, reviews and inquiries are keyed to `auth.uid()` and protected by the same RLS policies.
- Public reads use the same table shapes and `published` flags; map data is GeoJSON + tile URLs.
- The pure helpers in `src/lib/` have no DOM dependencies and can be reused directly.
- Guest-mode persistence would be replaced by a documented local cache with an explicit sync policy.

Suggested next steps: extract a shared `@intothehimalayas/core` package for types/mappers/filters, add Expo Router, use `react-native-maps` with the same OSM tile provider, and ship a read-only offline cache of saved trails first.

---

## Design system

| Token | Value | Use |
| --- | --- | --- |
| Forest Green | `#2E7D5B` | Primary actions, active states, links |
| Sage | `#A8D5BA` | Accents on dark imagery, selected highlights |
| Sky Blue | `#7EC8E3` | Informational states, moderate difficulty |
| Golden Yellow | `#F7C873` | Ratings, warnings, featured markers |
| Mint White | `#F8FCF8` | Page background |
| Text | `#1F2933` | Body and headings |

Typography: **Fraunces** for display headings (editorial, not generic SaaS), **Inter** for UI and body. Components live in `src/components/ui.tsx` and utility classes in `src/index.css`; Tailwind tokens are defined in `tailwind.config.ts`.

Photography credits are listed on `/about#credits` and in `src/lib/images.ts`.

---

## Project scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Strict typecheck then production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest single run |
| `npm run test:watch` | Vitest watch mode |
| `npm run seed:generate` | Regenerate `supabase/seed.sql` from `src/data/sample.ts` |
| `npm run deploy:prepare` | Build and assemble the Cloudflare Workers bundle in `sites/static/` |

---

## Content and licensing

Photography is sourced from Wikimedia Commons under the licences noted on each file page; see `/about#credits`. Map tiles © OpenStreetMap contributors, style © OpenTopoMap (CC-BY-SA). Trail text is original writing based on widely published route descriptions. Sample guides and stays are fictional placeholders and must be replaced before launch.

This repository is a project template: review the privacy policy, terms and safety copy with a qualified adviser before operating it commercially.
