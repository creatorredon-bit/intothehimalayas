# Deployment guide

The front end is a static single-page application. Supabase provides authentication and data. No Node server is required at runtime.

## 1. Prepare Supabase

1. Create a production project (separate from development).
2. Run `supabase/migrations/0001_schema.sql`, `0002_policies.sql`, `0003_functions.sql`, then `0004_moderator_role.sql` (on its own), then `0005_community_and_splits.sql` in order.
3. Load content: run `supabase/seed.sql` for a demo, or add records through the admin dashboard. Remove sample listings before launch.
4. **Authentication → URL configuration**
   - Site URL: `https://your-domain.com`
   - Additional redirect URLs: `https://your-domain.com/**`, `https://www.your-domain.com/**`, and `http://localhost:3000/**` for local development.
   - The app requests `…/login?verified=1` after signup and `…/reset-password` for recovery. Both must be allowed.
5. **Authentication → Email**: enable confirm email. For production, configure custom SMTP (Resend, Postmark, SES, etc.) so verification and reset mail is reliable. Customise the email templates with your brand and support address.
6. **Authentication → Rate limits**: review signup, email and token-refresh limits for expected traffic.
7. Create your account in the deployed app, then promote it:
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```
8. Enable point-in-time recovery and daily backups. Test a restore.

## 2. Configure the build

Environment variables are read at **build time** by Vite. Set them in your host's project settings before the first build:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_SITE_URL=https://your-domain.com
# optional
VITE_MAP_TILE_URL=https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png
VITE_MAP_ATTRIBUTION=Map data © OpenStreetMap contributors, SRTM | Map style © OpenTopoMap (CC-BY-SA)
VITE_MAP_MAX_ZOOM=17
```

Only the anon key is used. Do not add a service-role key to a `VITE_` variable.

Build locally first:

```bash
npm ci
npm run typecheck
npm test
npm run build       # dist/
npm run preview     # verify the built SPA on http://localhost:4173
```

## 3. Host the static build

Any static host works. The only requirement is SPA fallback: unknown paths must return `index.html`.

### Vercel

`vercel.json` in the repository already provides rewrites and asset caching.

```bash
vercel --prod
```

Add the environment variables in **Project → Settings → Environment Variables**, then redeploy so they are inlined.

### Netlify

`public/_redirects` contains `/* /index.html 200` and is copied into `dist/`.

- Build command: `npm run build`
- Publish directory: `dist`
- Add environment variables under **Site settings → Build & deploy → Environment**.

### Cloudflare Pages

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- SPA fallback: Pages applies `_redirects` from the build output; the included file handles it.

### Cloudflare Workers (Freebuff Sites)

Workers Static Assets need a Worker entry point in front of the build output, so the deployment uses a small one:

```bash
npm run deploy:prepare   # build, then copy dist/ into sites/static/
```

Then deploy `sites/manifest.json`. The manifest keeps every path relative to itself (`./worker.js`, `./static`); Cloudflare rejects absolute or drive-lettered asset paths during `worker_upload` with error code `100324`.

`sites/worker.js` serves the assets binding and owns the SPA fallback: unknown paths that ask for HTML get `index.html`, while requests that look like a missing file (`/assets/…js`) stay 404 instead of returning HTML. The manifest therefore does **not** set `spa`, and `_redirects` is stripped from this bundle so the two fallbacks cannot disagree.

Two rules keep this deployable:

- `sites/static/` is generated output. Rebuild it from `dist/` on every deploy; never edit it by hand.
- Never place a copied `index.html` in `public/`. Vite copies `public/` verbatim into `dist/`, so a stale hand-copied shell overrides the generated one and the deployed page keeps pointing at old hashed asset names. `index.html` belongs in the project root only.

### Self-hosted (Nginx)

```nginx
root /var/www/intothehimalayas/dist;
location / { try_files $uri $uri/ /index.html; }
location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; }
```

Serve HTTPS only. If you use a CDN, keep the SPA fallback at the edge.

## 4. Post-deploy verification

Run through this list on the production origin:

- [ ] Home page renders with photography, search and real counts.
- [ ] `/explore` filters update the URL, reset works, pagination moves between pages.
- [ ] A trail page map renders tiles and the route line; "Save" works (signed in and signed out).
- [ ] Sign up → verification email arrives → link returns to `/login?verified=1` → sign in succeeds.
- [ ] Sign out, reload: session is cleared and protected routes redirect to login.
- [ ] Forgot password → email → reset page → new password works.
- [ ] Save a trail as user A; sign in as user B; B's library is empty and A's trip URL is not accessible.
- [ ] `/admin` is denied to a non-admin account and works for the admin.
- [ ] Editing a trail in `/admin` changes the public trail page after reload.
- [ ] Submit a review: it appears only after admin approval.
- [ ] Contact form submission appears in the admin inbox.
- [ ] `/community` lists published announcements; a normal account sees no composer, a moderator can publish.
- [ ] A moderator cannot open `/admin`; an admin can edit any announcement.
- [ ] `/split` creates a group, adds a bill, shows balances and a settle-up list; a second account matching a member email sees it read-only.
- [ ] A second account that is not on a split group sees neither the group nor its URL contents.
- [ ] `/live` gets a GPS fix over HTTPS, records a track, pauses/resumes and exports GPX. Deny permission and confirm the explanation appears.
- [ ] Two signed-in browsers: one shares a code, the other follows it and sees live positions; stop sharing clears them.
- [ ] Unknown path renders the 404 page, not a blank screen.
- [ ] Check the browser console and network tab for failed requests.
- [ ] Host-level checks: the document, its JS and CSS return 200 with the right content types, `/assets/<missing>.js` returns 404, and a deep link such as `/trails/everest-base-camp-trek` returns the HTML shell on a hard refresh.

Automated browser tests are not included in this repository; the checks above are manual.

## 5. Security checklist

- [ ] RLS enabled on every table; spot-check with the SQL in `docs/DATABASE.md`.
- [ ] No `service_role` key in the bundle, repository or host env.
- [ ] Auth redirect URLs limited to your domains (no wildcard to unrelated hosts).
- [ ] Email confirmation enabled; password minimum length enforced by Supabase settings.
- [ ] HTTPS, HSTS and a security header policy at the edge.
- [ ] Add rate limiting/CAPTCHA to the public contact form before promotion.
- [ ] Replace sample guides, stays, trail content and the three sample announcements; verify claims you publish.
- [ ] Review privacy policy, terms and safety copy with a qualified adviser.
- [ ] Configure error monitoring (Sentry or similar) and uptime checks.
- [ ] Backups enabled and a restore drill completed.

Suggested headers (adjust for your CDN):

```text
Content-Security-Policy: default-src 'self'; img-src 'self' data: https://upload.wikimedia.org https://*.tile.opentopomap.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'
Referrer-Policy: strict-origin-when-cross-origin
X-Content-Type-Options: nosniff
Permissions-Policy: geolocation=(self), microphone=(), camera=()
```

CSP must allow the tile host you configure (OpenTopoMap uses `tile.opentopomap.org`) and both the HTTPS and WebSocket Supabase origins — the live GPS share channel connects over `wss://`. `geolocation=(self)` is required; the stricter `geolocation=()` blocks the `/live` tracker entirely. Test in report-only mode first, and check the Permissions-Policy header, since a blocked geolocation request fails silently to the page.

## 6. Migrations and releases

- Keep migrations forward-only and committed with the app.
- Apply migrations to staging, run the smoke list, then promote to production.
- The seed script is for demo/staging, not production content.
- Rollback: redeploy the previous static build. Database migrations are not automatically reversible; take a backup (or use PITR) before destructive changes.

## 7. Custom domain

Point the domain at the host, enable HTTPS, then add the final origin to Supabase redirect URLs and `VITE_SITE_URL`, rebuild, and re-verify sign-in and password reset. Auth emails contain the redirect URL, so an incorrect origin produces broken links even though the site itself works.

## 8. Mobile clients later

A React Native + Expo app can use the same Supabase project: `@supabase/supabase-js` with `AsyncStorage`, the same RLS policies and table shapes, and the same auth settings. Add the native app's deep links to Supabase redirect URLs when it exists. Do not weaken RLS to accommodate a client; scope every query by `auth.uid()` as this web app does.

## 9. Known deployment caveats

- Images and fonts are fetched from Wikimedia Commons and Google Fonts. Self-host them if your CSP, latency budget or licence review requires it.
- Tile providers have usage policies. For high traffic, switch to a paid OSM-compatible provider via `VITE_MAP_TILE_URL`.
- Email sending for contact/inquiry messages is not implemented; the inboxes are database-backed.
- There is no booking, payment or refund flow.
- Live position sharing uses Supabase Realtime broadcast, not the database. Nothing needs provisioning beyond a working project, but the browser must reach `wss://<project-ref>.supabase.co`; restrictive corporate proxies commonly break this. There is no position history and no SOS capability.
- Browser GPS requires HTTPS and user permission. Recording stops if the OS suspends the tab; do not present it as a safety or rescue tool.
- Cost-splitting groups are shared by entering a member's account email. There is no invitation email, so tell the friend out of band to sign in with that address.
