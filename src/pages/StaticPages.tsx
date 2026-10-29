import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { createContactMessage } from '@/data/user';
import { contentSource } from '@/data/content';
import { describeError } from '@/lib/supabase';
import { setupHint } from '@/lib/env';
import { photoCredits, photos } from '@/lib/images';
import { isValidEmail } from '@/lib/format';
import { useToast } from '@/components/Toast';
import { Icon } from '@/components/Icons';
import { Field, Notice, PageIntro, Spinner } from '@/components/ui';

/* -------------------------------------------------------------------------- */
/* About                                                                      */
/* -------------------------------------------------------------------------- */

export function AboutPage() {
  const { configured } = useAuth();

  return (
    <div>
      <PageIntro
        eyebrow="About"
        title="A trekking guide that shows its working"
        description="IntotheHimalayas is an independent project: a trail directory, planner and marketplace foundation for Nepal, built so that every claim can be traced or removed."
      />

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="prose-page max-w-none">
          <p>
            Most trekking sites sell certainty: the best trek, the perfect itinerary, a five-star review for every
            teahouse. The mountains do not work like that. Snow closes passes, flights cancel, teahouses shut for the
            monsoon and a route that suits one walker will break another.
          </p>
          <p>
            This site is built around the opposite idea. Distances, durations and altitudes are route-level figures
            taken from published descriptions. Where a number is unknown, it is left blank. Route lines are planning
            sketches drawn through documented villages and passes, not surveyed GPS traces. Reviews are written by
            signed-in people and moderated before they appear. Nothing is seeded to look busy.
          </p>
          <h2>What this build actually is</h2>
          <p>
            A production-oriented web application: React, TypeScript, Vite, Tailwind and Leaflet on the front end;
            Supabase Auth, Postgres and Row Level Security on the back end. It includes working authentication,
            trail discovery with server-side filters and pagination, saved trails with collections, a trip planner,
            guide and stay listings with inquiries, an admin dashboard with CRUD, and the policies that make those
            permissions real.
          </p>
          <p>
            It is not a booking engine, and it does not take payments. Guide and stay inquiries are stored for an
            administrator to read; no email is sent automatically. That is a deliberate limit, documented in the
            help centre rather than hidden behind a fake confirmation.
          </p>
          <h2>Data provenance</h2>
          <p>
            The bundled dataset is labelled “Sample data” in the interface. It exists so the application can be
            explored and tested without a database. In production you would replace it from the admin dashboard with
            verified operator content, ideally reviewed by someone who has walked the route.
          </p>
          <p>
            Trail altitudes and distances are widely published route figures. Permit requirements are described by
            name rather than price, because fees change and a stale number is worse than none. Always confirm with the
            Nepal Tourism Board or the relevant national park office.
          </p>
          <h2 id="credits">Photography credits</h2>
          <p>
            Photography is hosted by Wikimedia Commons and used under the licences noted on each file page. Images are
            illustrative of the region, not necessarily taken on the exact route. The map tiles are OpenTopoMap, built
            on OpenStreetMap data and SRTM elevation.
          </p>
        </div>

        <div className="space-y-4">
          <img
            src={photos.namcheMountains}
            alt="Namche Bazaar with Kongde Ri behind it"
            className="aspect-[4/3] w-full rounded-2xl border border-stone-line object-cover"
          />
          <div className="card p-5">
            <h2 className="text-base font-semibold">Build status</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Supabase</dt>
                <dd className={configured ? 'font-semibold text-forest-700' : 'font-semibold text-[#8a5a05]'}>
                  {configured ? 'Connected' : 'Not configured'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Content source</dt>
                <dd className="font-medium text-ink">{contentSource === 'supabase' ? 'Live database' : 'Sample dataset'}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Payments</dt>
                <dd className="font-medium text-ink">Not implemented</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-muted">Email delivery</dt>
                <dd className="font-medium text-ink">Supabase Auth only</dd>
              </div>
            </dl>
            <Link to="/help#setup" className="btn-secondary btn-sm mt-4 w-full">
              Configuration guide
            </Link>
          </div>
        </div>
      </div>

      <div className="container-page pb-16">
        <h2 className="text-2xl">Photo credits</h2>
        <ul className="mt-4 grid gap-x-8 gap-y-2 text-sm text-ink-muted sm:grid-cols-2">
          {photoCredits.map((credit) => (
            <li key={credit.label} className="flex justify-between gap-4 border-b border-stone-line/70 py-1.5">
              <span>{credit.label}</span>
              <span className="shrink-0 text-right text-xs text-ink-faint">
                {credit.source} · {credit.licence}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Contact                                                                    */
/* -------------------------------------------------------------------------- */

const topics = ['Trail data correction', 'Account issue', 'Guide or stay listing', 'Partnership', 'Something else'];

export function ContactPage() {
  const { configured } = useAuth();
  const { push } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState(topics[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Please include your name.');
    if (!isValidEmail(email)) return setError('Enter a valid email address.');
    if (message.trim().length < 15) return setError('Please write a little more so we can help.');
    setSending(true);
    try {
      await createContactMessage({ name: name.trim(), email: email.trim(), topic, message: message.trim() });
      setSent(true);
      setName('');
      setEmail('');
      setMessage('');
      push('Message sent.', 'success');
    } catch (err) {
      setError(describeError(err, 'Could not send the message.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageIntro
        eyebrow="Contact"
        title="Report a trail, ask a question, flag a listing"
        description="Trail corrections are the most useful messages: if a distance, permit or teahouse detail is wrong, say so."
      />
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="card p-6 sm:p-8">
          {sent ? (
            <Notice tone="success" title="Message recorded">
              Thank you — it is in the admin inbox. This build has no outbound email service, so replies depend on the
              team checking the dashboard.
              <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => setSent(false)}>
                Send another message
              </button>
            </Notice>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name" htmlFor="contact-name">
                  <input id="contact-name" className="input" value={name} onChange={(event) => setName(event.target.value)} required />
                </Field>
                <Field label="Email" htmlFor="contact-email">
                  <input
                    id="contact-email"
                    type="email"
                    className="input"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </Field>
              </div>
              <Field label="Topic" htmlFor="contact-topic">
                <select id="contact-topic" className="input" value={topic} onChange={(event) => setTopic(event.target.value)}>
                  {topics.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Message" htmlFor="contact-message" error={error ?? undefined}>
                <textarea
                  id="contact-message"
                  className="input min-h-36"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Include the trail name and the specific detail that needs correcting."
                  required
                />
              </Field>
              {!configured && (
                <Notice tone="warning">
                  {setupHint} The form validates locally but cannot store a message until Supabase is configured.
                </Notice>
              )}
              <button type="submit" className="btn-primary" disabled={sending || !configured}>
                {sending ? <Spinner className="h-4 w-4" /> : <Icon name="mail" className="h-4 w-4" />}
                Send message
              </button>
              <p className="text-xs leading-relaxed text-ink-faint">
                We store your name, email and message to respond. See the{' '}
                <Link to="/privacy" className="underline">
                  privacy policy
                </Link>
                .
              </p>
            </form>
          )}
        </div>

        <div className="space-y-5">
          <div className="card p-6">
            <h2 className="text-lg">Before you write</h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-muted">
              <li className="flex gap-2">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                Trail correction? Include the route name and a source for the corrected figure.
              </li>
              <li className="flex gap-2">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                Account problem? Mention the email you signed up with, never your password.
              </li>
              <li className="flex gap-2">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                Safety emergency? Contact local authorities, your embassy and your insurer — not this form.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-gold/40 bg-gold/10 p-5 text-sm leading-relaxed text-[#7a5205]">
            <p className="font-semibold">This is not an emergency channel</p>
            <p className="mt-1.5">
              For emergencies in Nepal call the local emergency number (100 for police, 102 for ambulance) or your
              embassy. Mountain rescue is arranged through your trekking agency and insurance provider.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Help                                                                       */
/* -------------------------------------------------------------------------- */

const helpSections = [
  {
    id: 'setup',
    title: 'Connect Supabase (required for accounts)',
    body: [
      'Create a Supabase project, then copy the project URL and the anon (public) key into .env as VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Restart the dev server. Never put the service_role key in a VITE_ variable.',
      'In the Supabase SQL editor, run supabase/migrations/0001_schema.sql, 0002_policies.sql and 0003_functions.sql, then 0004_moderator_role.sql on its own, then 0005_community_and_splits.sql, and optionally supabase/seed.sql. Add your own user to the admin role with the SQL shown in docs/DATABASE.md.',
      'In Authentication → URL configuration, set the Site URL to your origin and add a wildcard redirect for each origin you use, for example http://localhost:3000/** for local work and https://your-domain/** for production. That covers /login?verified=1 and /reset-password. If you set VITE_SITE_URL, it must match the origin exactly. Email confirmation must be enabled for verification to work.',
    ],
  },
  {
    id: 'database',
    title: 'What happens if the schema is missing',
    body: [
      'The app reads content through a repository layer. Without credentials it serves the bundled sample dataset; with credentials it queries Postgres directly. If you configure Supabase but skip the migrations, pages will show an error naming the missing relation and inviting you to run the SQL — that is intentional rather than silently falling back to sample data.',
    ],
  },
  {
    id: 'auth',
    title: 'Accounts, verification and password resets',
    body: [
      'Sign-up creates a Supabase Auth user and a profiles row through a database trigger. Verification emails are sent by Supabase Auth; check spam and the Auth logs if they do not arrive. Password reset links open /reset-password, where Supabase establishes a recovery session before the new password is set.',
      'Protected pages check the session in the client, but the real enforcement is Row Level Security. A hidden button is not a permission.',
    ],
  },
  {
    id: 'admin',
    title: 'Granting the admin role',
    body: [
      'Sign up normally, then in the SQL editor run: update public.profiles set role = \'admin\' where id = (select id from auth.users where email = \'you@example.com\'); Reload the site. The admin route and every write policy check this role in the database.',
      'For a community moderator, use role = \'moderator\' instead. Moderators can publish announcements on /community but cannot open the admin dashboard or change anyone’s role.',
    ],
  },
  {
    id: 'tools',
    title: 'Cost splitting, live GPS and the community board',
    body: [
      'The cost splitter divides each bill equally between the selected people, in paisa, and suggests the fewest transfers to settle up. A signed-in owner can add a friend’s account email; that friend can then read the same ledger after signing in, but only the owner can edit it. Without an account the ledger is stored on that device only.',
      'Live GPS records the device position with the browser Geolocation API. It needs HTTPS and permission, records only while the page is open, and exports GPX. Companion sharing uses a short code over Supabase Realtime and stores no positions; anyone holding an active code can watch, so share it deliberately and stop sharing when you are done. It is not a navigation or rescue device.',
      'The community board is written by administrators and moderators only and is readable by everyone. The database derives the author’s displayed name and role from their profile, so posting cannot be spoofed by the browser.',
    ],
  },
  {
    id: 'data',
    title: 'Data, maps and accuracy',
    body: [
      'Trail distances, days and altitudes are route-level figures from published descriptions. Map lines are illustrative planning sketches drawn through documented waypoints; they are not a substitute for a current GPX or a local guide. The interface labels sample records and never invents reviews or trail conditions.',
      'Map tiles come from OpenTopoMap (OpenStreetMap data, SRTM elevation) and can be swapped with any OSM-compatible raster provider through VITE_MAP_TILE_URL. Respect the tile provider\'s usage policy before scaling traffic.',
    ],
  },
  {
    id: 'permits',
    title: 'Permits and safety basics',
    body: [
      'Most treks need a national park or conservation-area permit plus a TIMS card where applicable. Restricted areas (Upper Mustang, Manaslu, Nar-Phu, Kanchenjunga) require a licensed agency and a minimum group size. Fees change: confirm with the Nepal Tourism Board or park office rather than relying on any website, including this one.',
      'Acclimatise above 3,000 m, keep rest days in your plan, know the symptoms of acute mountain sickness and carry insurance that covers helicopter evacuation at your maximum altitude. Weather can close Lukla and Jomsom for days; keep a buffer before your international flight.',
    ],
  },
  {
    id: 'mobile',
    title: 'Mobile roadmap',
    body: [
      'The schema, RLS policies and repository functions are written to be shared with a future React Native + Expo client. Saved trails, trips, reviews and inquiries live in Postgres keyed to the auth user; no browser-only state is required for signed-in use. There is no native app in this build, and no store listing is claimed.',
    ],
  },
];

export function HelpPage() {
  const { configured } = useAuth();
  const [activeId, setActiveId] = useState(helpSections[0].id);

  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      const match = helpSections.find((section) => section.id === id);
      if (match) setActiveId(match.id);
      const element = document.getElementById(id);
      if (element) window.setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }
  }, []);

  return (
    <div>
      <PageIntro
        eyebrow="Help centre"
        title="How this build works"
        description="Configuration, accounts, admin roles, data provenance and the limits of the current implementation."
      >
        <span className="badge">
          Supabase status: {configured ? 'configured' : 'not configured'}
        </span>
      </PageIntro>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[15rem_1fr]">
        <nav aria-label="Help sections" className="lg:sticky lg:top-28 lg:self-start">
          <ul className="space-y-1">
            {helpSections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={() => setActiveId(section.id)}
                  className={`block rounded-lg px-3 py-2 text-sm transition ${
                    activeId === section.id ? 'bg-forest-50 font-semibold text-forest-800' : 'text-ink-muted hover:bg-forest-50'
                  }`}
                >
                  {section.title}
                </a>
              </li>
            ))}
            <li>
              <Link to="/contact" className="block rounded-lg px-3 py-2 text-sm text-ink-muted hover:bg-forest-50">
                Contact the team
              </Link>
            </li>
          </ul>
        </nav>

        <div className="space-y-10">
          {helpSections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-28">
              <h2 className="text-2xl">{section.title}</h2>
              <div className="mt-3 space-y-3 text-[0.95rem] leading-7 text-ink-soft">
                {section.body.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          <Notice tone="neutral" title="Known limitations in this build">
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>· Accounts, saves and admin require a configured Supabase project; they are not mocked.</li>
              <li>· No booking, payment or automated email delivery is implemented.</li>
              <li>· Trail conditions are not live; treat every route description as a starting point.</li>
              <li>· Route geometry is illustrative and should be replaced with verified tracks before operational use.</li>
            </ul>
          </Notice>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Privacy                                                                    */
/* -------------------------------------------------------------------------- */

export function PrivacyPage() {
  return (
    <div>
      <PageIntro
        eyebrow="Legal"
        title="Privacy policy"
        description="A short, plain-language description of what this application stores and why. Last reviewed October 2026."
      />
      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1fr_16rem]">
        <div className="prose-page max-w-none">
          <h2>What we collect</h2>
          <p>
            If you create an account: your name, email address, a hashed password managed by Supabase Auth, and
            optional profile details (bio, home region, preferences). If you use the planner and library while
            signed in: saved trails, personal notes, collections, trips, itinerary items and inquiry messages. If you
            write a review: your display name, rating, review text and the date you walked.
          </p>
          <p>
            If you use the contact form: your name, email, topic and message. If you are signed out, saved trails and
            trips are stored only in your browser's localStorage and never sent to a server.
          </p>
          <h2>What we do not collect</h2>
          <p>
            No advertising identifiers, no third-party analytics, no session recording. We do not ask for passport
            numbers, payment details or precise location. Payments are not processed by this application.
          </p>
          <h2>Why we store it</h2>
          <p>
            Account data exists to authenticate you. Saves and trips exist to provide the library and planner.
            Reviews and inquiries exist to publish moderated feedback and route messages to the administrator. Contact
            messages exist to respond to you.
          </p>
          <h2>Who processes it</h2>
          <p>
            Authentication and the database are hosted by Supabase. Map tiles are requested from OpenTopoMap; the tile
            provider sees your IP address and the map area you view. Fonts are served by Google Fonts; images by
            Wikimedia Commons. These requests disclose your IP address to those providers. No personal profile data is
            shared with them.
          </p>
          <h2>Retention and your rights</h2>
          <p>
            Account data remains until you delete your account or ask us to. Reviews remain while the trail page is
            published unless you ask for removal. Requests to access, correct or delete your data can be sent through
            the contact form; we will respond within a reasonable period. If you are in a jurisdiction with statutory
            data rights, those rights apply in addition to this policy.
          </p>
          <h2>Security</h2>
          <p>
            Row Level Security restricts each table to its owner or an admin role. The public anon key is designed to
            be exposed in the browser; the service-role key is never shipped to the client. No system is perfectly
            secure, so do not store sensitive personal information in trip notes or reviews.
          </p>
          <h2>Cookies and local storage</h2>
          <p>
            We use browser storage for your authentication session, guest saved trails and guest trips. There is no
            cookie consent banner because there are no advertising or analytics cookies. Clearing site data removes
            guest saves and trips permanently.
          </p>
          <h2>Contact</h2>
          <p>
            Privacy questions can be sent through the <Link to="/contact" className="link-underline">contact form</Link>.
            This policy is a template for the project and should be reviewed by a qualified adviser before commercial
            launch.
          </p>
        </div>
        <aside className="h-fit rounded-2xl border border-stone-line bg-white p-5 text-sm">
          <h2 className="text-base font-semibold">At a glance</h2>
          <ul className="mt-3 space-y-2 text-ink-muted">
            <li>· Auth + data: Supabase</li>
            <li>· No analytics</li>
            <li>· No ad tracking</li>
            <li>· Guest data stays local</li>
            <li>· Deletion on request</li>
          </ul>
          <Link to="/terms" className="btn-secondary btn-sm mt-4 w-full">
            Terms of use
          </Link>
        </aside>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Terms                                                                      */
/* -------------------------------------------------------------------------- */

export function TermsPage() {
  return (
    <div>
      <PageIntro
        eyebrow="Legal"
        title="Terms of use"
        description="The rules for using this site, and the limits of what its route information can promise. Last reviewed October 2026."
      />
      <div className="container-page py-12">
        <div className="prose-page mx-auto max-w-3xl">
          <h2>1. What this service is</h2>
          <p>
            IntotheHimalayas provides information about trekking routes in Nepal, tools to save and plan trips, and
            listings for guides and accommodation. It is not a trekking agency, tour operator, insurer or booking
            platform. It does not take payments and is not a party to any agreement between you and a guide, lodge or
            operator.
          </p>
          <h2>2. Mountain information is not a guarantee</h2>
          <p>
            Distances, durations, altitudes, permit notes and route lines are planning aids compiled from published
            descriptions. They may be incomplete, out of date or wrong. Conditions change with weather, landslides,
            construction and season. You are responsible for verifying conditions locally, carrying appropriate maps
            and equipment, and making conservative decisions. Never rely on this site as a navigation tool.
          </p>
          <h2>3. Accounts</h2>
          <p>
            You must provide a valid email address and keep your password secure. You are responsible for activity
            under your account. We may suspend accounts that abuse the service, attempt to bypass access controls or
            submit unlawful content.
          </p>
          <h2>4. Your content</h2>
          <p>
            You retain ownership of reviews, notes and inquiries you submit. By publishing a review you grant us a
            non-exclusive licence to display it on the site. Reviews are moderated; we may edit for length or remove
            content that is abusive, defamatory or fabricated. Do not post personal data about other people without
            their consent.
          </p>
          <h2>5. Listings and inquiries</h2>
          <p>
            Guide and stay listings may include sample or unverified entries, which are labelled as such. An inquiry
            is a message stored for the administrator; it does not create a booking. We do not verify licences,
            insurance or standards of any listed operator. Do your own checks.
          </p>
          <h2>6. Acceptable use</h2>
          <p>
            Do not scrape the service at a rate that degrades it, attempt to access other users' data, probe the
            database, or use the site to send spam. Map tiles and photographs are subject to their providers' licences;
            do not bulk-download them through this application.
          </p>
          <h2>7. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, the project and its contributors are not liable for injury, loss,
            delay or expense arising from use of the information on this site, including reliance on route data,
            permit notes or listings. Nothing in these terms excludes liability that cannot lawfully be excluded.
          </p>
          <h2>8. Availability and changes</h2>
          <p>
            The service is provided as-is and may be unavailable during maintenance or incidents. We may change these
            terms; material changes will be reflected by the review date above and, where appropriate, an in-app
            notice.
          </p>
          <h2>9. Contact and governing law</h2>
          <p>
            Questions about these terms can be sent through the <Link to="/contact" className="link-underline">contact form</Link>.
            These terms are a project template, not legal advice, and should be reviewed by a qualified adviser before
            commercial launch.
          </p>
        </div>
      </div>
    </div>
  );
}
