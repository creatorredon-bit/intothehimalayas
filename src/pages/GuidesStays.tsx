import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/Toast';
import { getGuideBySlug, getStayBySlug, listGuideFacets, listGuides, listRegions, listStays } from '@/data/content';
import { createInquiry } from '@/data/user';
import { describeError } from '@/lib/supabase';
import { setupHint } from '@/lib/env';
import { STAY_TYPE_LABELS, formatNpr, initials, isValidEmail } from '@/lib/format';
import { Icon } from '@/components/Icons';
import { MapView } from '@/components/MapView';
import {
  EmptyState,
  ErrorState,
  Field,
  Notice,
  PageIntro,
  SampleBadge,
  Spinner,
} from '@/components/ui';
import type { Guide, InquirySubject, Stay } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/* Shared inquiry form                                                        */
/* -------------------------------------------------------------------------- */

function InquiryForm({
  subjectType,
  subjectId,
  subjectName,
}: {
  subjectType: InquirySubject;
  subjectId: string;
  subjectName: string;
}) {
  const { user, profile, configured } = useAuth();
  const { push } = useToast();
  const [name, setName] = useState(profile?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (profile?.fullName) setName((current) => current || profile.fullName);
    if (user?.email) setEmail((current) => current || (user.email ?? ''));
  }, [profile, user]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setError(null);
    if (!name.trim()) return setError('Tell them who you are.');
    if (!isValidEmail(email)) return setError('Enter a valid email address.');
    if (message.trim().length < 15) return setError('Please include a little more detail (15+ characters).');

    setSending(true);
    try {
      await createInquiry({
        userId: user.id,
        subjectType,
        subjectId,
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      setSent(true);
      setMessage('');
      push('Inquiry sent. It is stored in the admin inbox.', 'success');
    } catch (err) {
      setError(describeError(err, 'Could not send your inquiry.'));
    } finally {
      setSending(false);
    }
  };

  if (!configured) {
    return (
      <Notice tone="neutral" title="Inquiries need a Supabase project">
        {setupHint} Without it, no message can be stored — this form does not pretend to send email.
      </Notice>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-stone-line bg-stone-paper/60 p-5">
        <p className="text-sm leading-relaxed text-ink-muted">
          Inquiries are tied to an account so you can see replies in one place. Sign in to contact{' '}
          {subjectName}.
        </p>
        <Link to={`/login?next=${encodeURIComponent(window.location.pathname)}`} className="btn-primary btn-sm mt-4">
          Sign in to inquire
        </Link>
      </div>
    );
  }

  if (sent) {
    return (
      <Notice tone="success" title="Inquiry recorded">
        Your message is in the admin inbox and linked to your account. Email delivery is not configured in this build,
        so follow up directly if the listing includes contact details.
        <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => setSent(false)}>
          Send another
        </button>
      </Notice>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor={`inquiry-name-${subjectId}`}>
          <input
            id={`inquiry-name-${subjectId}`}
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>
        <Field label="Email" htmlFor={`inquiry-email-${subjectId}`}>
          <input
            id={`inquiry-email-${subjectId}`}
            type="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>
      </div>
      <Field
        label="Message"
        htmlFor={`inquiry-message-${subjectId}`}
        hint="Dates, group size, experience and what you want from the trip."
        error={error ?? undefined}
      >
        <textarea
          id={`inquiry-message-${subjectId}`}
          className="input min-h-28"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
        />
      </Field>
      <button type="submit" className="btn-primary" disabled={sending}>
        {sending ? <Spinner className="h-4 w-4" /> : <Icon name="mail" className="h-4 w-4" />}
        {sending ? 'Sending…' : 'Send inquiry'}
      </button>
      <p className="text-xs leading-relaxed text-ink-faint">
        Nothing is emailed automatically. The message is stored for the administrator to read.
      </p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/* Guides                                                                     */
/* -------------------------------------------------------------------------- */

export function GuidesPage() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [facets, setFacets] = useState<{ regions: string[]; languages: string[] }>({ regions: [], languages: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [language, setLanguage] = useState('');
  const [specialty, setSpecialty] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setGuides(await listGuides({ q, region, language, specialty }));
    } catch (err) {
      setError(describeError(err, 'Could not load guides.'));
    } finally {
      setLoading(false);
    }
  }, [q, region, language, specialty]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    listGuideFacets()
      .then((value) => setFacets({ regions: value.regions, languages: value.languages }))
      .catch(() => setFacets({ regions: [], languages: [] }));
  }, []);

  const reset = () => {
    setQ('');
    setRegion('');
    setLanguage('');
    setSpecialty('');
  };

  return (
    <div>
      <PageIntro
        eyebrow="Local expertise"
        title="Guides and operators"
        description="Browse by region and language, then send an inquiry through your account. Sample listings are labelled; verification is never implied."
      />

      <div className="container-page py-10">
        <div className="grid gap-3 rounded-2xl border border-stone-line bg-white p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <label htmlFor="guide-search" className="label">
              Search
            </label>
            <input
              id="guide-search"
              type="search"
              className="input"
              placeholder="Name or speciality"
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="guide-region" className="label">
              Region
            </label>
            <select id="guide-region" className="input" value={region} onChange={(event) => setRegion(event.target.value)}>
              <option value="">All regions</option>
              {facets.regions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="guide-language" className="label">
              Language
            </label>
            <select
              id="guide-language"
              className="input"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              <option value="">Any language</option>
              {facets.languages.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="guide-specialty" className="label">
              Speciality
            </label>
            <input
              id="guide-specialty"
              className="input"
              placeholder="e.g. high-altitude"
              value={specialty}
              onChange={(event) => setSpecialty(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-ink-muted">
          <p>
            {loading ? 'Loading guides…' : `${guides.length} ${guides.length === 1 ? 'guide' : 'guides'} listed`}
          </p>
          <button type="button" className="text-xs font-semibold text-forest-700 hover:underline" onClick={reset}>
            Clear filters
          </button>
        </div>

        {error && (
          <div className="mt-6">
            <ErrorState message={error} onRetry={load} />
          </div>
        )}

        {loading && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-64 rounded-2xl" />
            ))}
          </div>
        )}

        {!loading && !error && guides.length === 0 && (
          <div className="mt-6">
            <EmptyState
              icon="users"
              title="No guides match those filters"
              description="Try another region or clear the language filter."
              action={
                <button type="button" className="btn-primary" onClick={reset}>
                  Clear filters
                </button>
              }
            />
          </div>
        )}

        {!loading && guides.length > 0 && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <article key={guide.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-forest-50 font-display text-lg text-forest-700">
                      {initials(guide.fullName)}
                    </span>
                    <div>
                      <h2 className="text-lg leading-tight">
                        <Link to={`/guides/${guide.slug}`} className="hover:text-forest-700">
                          {guide.fullName}
                        </Link>
                      </h2>
                      <p className="mt-0.5 text-xs text-ink-muted">{guide.region}</p>
                    </div>
                  </div>
                  {guide.verified ? (
                    <span className="badge bg-forest text-white">
                      <Icon name="shield" className="h-3 w-3" /> Verified
                    </span>
                  ) : (
                    guide.isSample && <SampleBadge />
                  )}
                </div>

                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-ink-muted">{guide.bio}</p>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-stone-line pt-4 text-xs">
                  <div>
                    <dt className="text-ink-faint">Languages</dt>
                    <dd className="mt-0.5 font-medium text-ink-soft">{guide.languages.join(', ')}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-faint">Day rate</dt>
                    <dd className="mt-0.5 font-medium text-ink-soft">
                      {guide.dayRateNpr ? formatNpr(guide.dayRateNpr) : 'On request'}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {guide.specialties.slice(0, 2).map((item) => (
                    <span key={item} className="chip cursor-default text-[0.7rem]">
                      {item}
                    </span>
                  ))}
                </div>

                <Link to={`/guides/${guide.slug}`} className="btn-secondary btn-sm mt-5 w-full">
                  View profile
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function GuideDetailPage() {
  const { slug = '' } = useParams();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getGuideBySlug(slug)
      .then((value) => {
        if (active) setGuide(value);
      })
      .catch((err: unknown) => {
        if (active) setError(describeError(err, 'Could not load this guide.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="container-page py-12">
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-20">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon="users"
          title="Guide not found"
          description="This listing may have been removed."
          action={
            <Link to="/guides" className="btn-primary">
              All guides
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-10 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-ink-faint">
        <Link to="/guides" className="hover:text-forest-700">
          Guides
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-muted">{guide.fullName}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
        <div>
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-50 font-display text-2xl text-forest-700">
              {initials(guide.fullName)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {guide.verified ? (
                  <span className="badge bg-forest text-white">
                    <Icon name="shield" className="h-3 w-3" /> Verified listing
                  </span>
                ) : (
                  <SampleBadge />
                )}
                <span className="badge">{guide.region}</span>
              </div>
              <h1 className="mt-2 text-3xl sm:text-4xl">{guide.fullName}</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {guide.region} · {guide.experienceYears ? `${guide.experienceYears} years guiding` : 'Experience not published'}
              </p>
            </div>
          </div>

          <p className="mt-6 whitespace-pre-line text-[0.98rem] leading-7 text-ink-soft">{guide.bio}</p>
          {guide.isSample && (
            <Notice tone="warning" className="mt-5" title="Sample profile">
              This is placeholder content shipped with the project, not a real guide. Remove it from the admin
              dashboard before launch.
            </Notice>
          )}

          <dl className="mt-8 grid gap-5 border-t border-stone-line pt-6 sm:grid-cols-2">
            <div>
              <dt className="label">Languages</dt>
              <dd className="text-sm text-ink-soft">{guide.languages.join(' · ')}</dd>
            </div>
            <div>
              <dt className="label">Specialities</dt>
              <dd className="flex flex-wrap gap-1.5">
                {guide.specialties.map((item) => (
                  <span key={item} className="chip cursor-default">
                    {item}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="label">Indicative day rate</dt>
              <dd className="text-sm text-ink-soft">{guide.dayRateNpr ? formatNpr(guide.dayRateNpr) : 'On request'}</dd>
            </div>
            <div>
              <dt className="label">Direct contact</dt>
              <dd className="text-sm text-ink-soft">
                {guide.contactEmail || guide.contactPhone ? (
                  <span>
                    {guide.contactEmail} {guide.contactPhone}
                  </span>
                ) : (
                  'Use the inquiry form'
                )}
              </dd>
            </div>
          </dl>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card p-6">
            <h2 className="text-xl">Send an inquiry</h2>
            <p className="mt-1.5 text-sm text-ink-muted">Requires a free account. Stored in the admin inbox.</p>
            <div className="mt-4">
              <InquiryForm subjectType="guide" subjectId={guide.id} subjectName={guide.fullName} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stays                                                                      */
/* -------------------------------------------------------------------------- */

export function StaysPage() {
  const [stays, setStays] = useState<Stay[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState('');
  const [type, setType] = useState('');
  const [maxPrice, setMaxPrice] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStays(await listStays({ q, region, type, maxPrice }));
    } catch (err) {
      setError(describeError(err, 'Could not load stays.'));
    } finally {
      setLoading(false);
    }
  }, [q, region, type, maxPrice]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    listRegions()
      .then(setRegions)
      .catch(() => setRegions([]));
  }, []);

  return (
    <div>
      <PageIntro
        eyebrow="Mountain stays"
        title="Teahouses, lodges and homestays"
        description="Places to sleep along the routes. Rates are indicative and set by the property; confirm directly and expect cash-only payments above the road heads."
      />

      <div className="container-page py-10">
        <div className="grid gap-3 rounded-2xl border border-stone-line bg-white p-4 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="stay-search" className="label">
              Search
            </label>
            <input
              id="stay-search"
              type="search"
              className="input"
              placeholder="Name or village"
              value={q}
              onChange={(event) => setQ(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="stay-region" className="label">
              Region
            </label>
            <select id="stay-region" className="input" value={region} onChange={(event) => setRegion(event.target.value)}>
              <option value="">All regions</option>
              {regions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="stay-type" className="label">
              Type
            </label>
            <select id="stay-type" className="input" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">Any type</option>
              {Object.entries(STAY_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="stay-price" className="label">
              Max per night (NPR)
            </label>
            <input
              id="stay-price"
              type="number"
              min={0}
              className="input"
              placeholder="e.g. 3500"
              value={maxPrice ?? ''}
              onChange={(event) => setMaxPrice(event.target.value === '' ? null : Number(event.target.value))}
            />
          </div>
        </div>

        <p className="mt-4 text-sm text-ink-muted">
          {loading ? 'Loading stays…' : `${stays.length} ${stays.length === 1 ? 'stay' : 'stays'} listed`}
        </p>

        {error && (
          <div className="mt-6">
            <ErrorState message={error} onRetry={load} />
          </div>
        )}

        {loading && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-72 rounded-2xl" />
            ))}
          </div>
        )}

        {!loading && !error && stays.length === 0 && (
          <div className="mt-6">
            <EmptyState
              icon="bed"
              title="No stays match those filters"
              description="Try raising the price ceiling or clearing the region."
            />
          </div>
        )}

        {!loading && stays.length > 0 && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {stays.map((stay) => (
              <article key={stay.id} className="card overflow-hidden">
                <Link to={`/stays/${stay.slug}`} className="block overflow-hidden">
                  <img
                    src={stay.photoUrl}
                    alt={stay.name}
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover transition duration-500 hover:scale-[1.03]"
                  />
                </Link>
                <div className="p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="badge">{STAY_TYPE_LABELS[stay.type]}</span>
                    {stay.isSample && <SampleBadge />}
                  </div>
                  <h2 className="mt-3 text-lg">
                    <Link to={`/stays/${stay.slug}`} className="hover:text-forest-700">
                      {stay.name}
                    </Link>
                  </h2>
                  <p className="mt-1 text-xs text-ink-muted">{stay.region}</p>
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-muted">{stay.description}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-stone-line pt-3 text-sm">
                    <span className="font-semibold text-ink">
                      {stay.pricePerNightNpr ? formatNpr(stay.pricePerNightNpr) : 'Rate on request'}
                    </span>
                    <span className="text-xs text-ink-faint">per night</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function StayDetailPage() {
  const { slug = '' } = useParams();
  const [stay, setStay] = useState<Stay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getStayBySlug(slug)
      .then((value) => {
        if (active) setStay(value);
      })
      .catch((err: unknown) => {
        if (active) setError(describeError(err, 'Could not load this stay.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="container-page py-12">
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-20">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!stay) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon="bed"
          title="Stay not found"
          description="This listing may have been removed."
          action={
            <Link to="/stays" className="btn-primary">
              All stays
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-10 sm:py-12">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-ink-faint">
        <Link to="/stays" className="hover:text-forest-700">
          Stays
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-muted">{stay.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.55fr_1fr] lg:gap-12">
        <div>
          <div className="overflow-hidden rounded-2xl border border-stone-line">
            <img src={stay.photoUrl} alt={stay.name} className="aspect-[16/9] w-full object-cover" />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="badge">{STAY_TYPE_LABELS[stay.type]}</span>
            <span className="text-xs text-ink-muted">{stay.region}</span>
            {stay.isSample && <SampleBadge />}
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl">{stay.name}</h1>
          <p className="mt-4 whitespace-pre-line text-[0.98rem] leading-7 text-ink-soft">{stay.description}</p>

          <h2 className="mt-8 text-xl">Amenities</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {stay.amenities.map((amenity) => (
              <li key={amenity} className="flex items-center gap-2 text-sm text-ink-soft">
                <Icon name="check" className="h-4 w-4 text-forest" />
                {amenity}
              </li>
            ))}
          </ul>

          {stay.lat !== null && stay.lng !== null && (
            <div className="mt-8">
              <h2 className="text-xl">Location</h2>
              <div className="mt-3">
                <MapView
                  center={[stay.lat, stay.lng]}
                  markers={[{ id: stay.id, lat: stay.lat, lng: stay.lng, label: stay.name }]}
                  heightClass="h-[18rem]"
                  ariaLabel={`Map location for ${stay.name}`}
                />
              </div>
              <p className="mt-2 text-xs text-ink-faint">
                Approximate village-level location, not a door-to-door pin.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <div className="card p-6">
            <p className="eyebrow">Indicative rate</p>
            <p className="mt-2 font-display text-3xl">{stay.pricePerNightNpr ? formatNpr(stay.pricePerNightNpr) : 'On request'}</p>
            <p className="text-xs text-ink-faint">per room per night, quoted by the property</p>
            <p className="mt-4 border-t border-stone-line pt-4 text-xs leading-relaxed text-ink-muted">
              Payments are arranged directly with the property. This platform does not take bookings or payments.
            </p>
          </div>

          <div className="card p-6">
            <h2 className="text-lg">Ask about availability</h2>
            <div className="mt-4">
              <InquiryForm subjectType="stay" subjectId={stay.id} subjectName={stay.name} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
