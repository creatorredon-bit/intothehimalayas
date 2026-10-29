import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { photos } from '@/lib/images';
import { contentSource, listAllTrails, listDestinations, listRegions } from '@/data/content';
import { beginnerTrails, trailsForSeason, uniqueRegions } from '@/lib/trailFilters';
import { describeError } from '@/lib/supabase';
import { currentSeason, DIFFICULTY_LABELS, formatElevation, formatNumber, SEASON_LABELS } from '@/lib/format';
import { Icon } from '@/components/Icons';
import { TrailCard } from '@/components/TrailCard';
import { ErrorState, LoadingRow, MetaItem, Notice, SectionHeading } from '@/components/ui';
import { cx } from '@/lib/cx';
import type { Destination, Trail } from '@/lib/types';

interface HomeData {
  trails: Trail[];
  destinations: Destination[];
  regions: string[];
}

export default function HomePage() {
  const navigate = useNavigate();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trails, destinations, regions] = await Promise.all([listAllTrails(), listDestinations(), listRegions()]);
      setData({ trails, destinations, regions });
    } catch (err) {
      setError(describeError(err, 'Could not load the homepage content.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const season = currentSeason();
  const featured = data?.trails.filter((trail) => trail.featured).slice(0, 3) ?? [];
  const beginner = data ? beginnerTrails(data.trails, 3) : [];
  const seasonal = data ? trailsForSeason(data.trails, season, 3) : [];
  const highest = data?.trails.reduce((max, trail) => Math.max(max, trail.maxElevationM), 0) ?? 0;
  const regionCount = data ? uniqueRegions(data.trails).length : 0;

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (region) params.set('region', region);
    if (difficulty) params.set('difficulty', difficulty);
    navigate(`/explore${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-ink">
        <img
          src={photos.everest}
          alt="Everest rising above the Khumbu valley in the Nepal Himalaya"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-95"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-ink/45" aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-mint via-mint/40 to-transparent" aria-hidden="true" />

        <div className="container-page relative flex min-h-[34rem] flex-col justify-end pb-40 pt-28 text-white sm:min-h-[40rem] sm:pb-48 sm:pt-32">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-sage">
            Nepal · 27.99°N 86.86°E
          </p>
          <h1 className="mt-4 max-w-3xl text-balance text-[2.6rem] leading-[1.03] text-white sm:text-6xl lg:text-[4.2rem]">
            The Himalaya, without the guesswork.
          </h1>
          <p className="mt-5 max-w-xl text-[0.98rem] leading-relaxed text-white/85 sm:text-lg">
            Routes, altitudes, permits and honest difficulty — for treks from four days to a fortnight. Browse the
            map, save what fits, and build a day-by-day plan before you fly.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/explore" className="btn bg-white text-forest-800 hover:bg-sage">
              Find your trail
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <Link to="/plan" className="btn border border-white/40 text-white hover:bg-white/10">
              <Icon name="calendar" className="h-4 w-4" />
              Plan a trip
            </Link>
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="container-page relative z-10 -mt-24 sm:-mt-28">
        <form
          onSubmit={onSearch}
          className="card grid gap-3 p-4 sm:p-5 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-end"
          aria-label="Search trails"
        >
          <div>
            <label htmlFor="home-search" className="label">
              Where do you want to walk?
            </label>
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              />
              <input
                id="home-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Everest, Langtang, teahouse, glacier…"
                className="input pl-10"
              />
            </div>
          </div>
          <div>
            <label htmlFor="home-region" className="label">
              Region
            </label>
            <select id="home-region" className="input" value={region} onChange={(event) => setRegion(event.target.value)}>
              <option value="">All regions</option>
              {(data?.regions ?? []).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="home-difficulty" className="label">
              Difficulty
            </label>
            <select
              id="home-difficulty"
              className="input"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="">Any level</option>
              {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary h-[2.7rem] lg:h-[2.75rem]">
            Search trails
          </button>
        </form>

        <dl className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 px-1 text-xs text-ink-muted">
          <div className="flex items-center gap-1.5">
            <Icon name="route" className="h-3.5 w-3.5 text-forest" />
            <dt className="sr-only">Trails mapped</dt>
            <dd>
              <span className="font-semibold text-ink">{formatNumber(data?.trails.length ?? 0)}</span> trails mapped
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="compass" className="h-3.5 w-3.5 text-forest" />
            <dt className="sr-only">Regions</dt>
            <dd>
              <span className="font-semibold text-ink">{formatNumber(regionCount)}</span> regions
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="arrowUp" className="h-3.5 w-3.5 text-forest" />
            <dt className="sr-only">Highest mapped point</dt>
            <dd>
              highest point <span className="font-semibold text-ink">{highest ? formatElevation(highest) : '—'}</span>
            </dd>
          </div>
          {contentSource === 'sample' && (
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gold/15 px-2.5 py-1 font-medium text-[#7a5207]">
              <Icon name="info" className="h-3.5 w-3.5" />
              Preview dataset
            </span>
          )}
        </dl>
      </div>

      {error && (
        <div className="container-page mt-10">
          <ErrorState message={error} onRetry={load} />
        </div>
      )}

      {/* Featured */}
      <section className="container-page section-pad">
        <SectionHeading
          eyebrow="Editor's routes"
          title="Featured treks"
          description="Three routes that show the range of Nepal: a high-altitude classic, a teahouse valley, and a short ridge with big views."
          action={
            <Link to="/explore" className="btn-secondary btn-sm">
              All trails
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          }
        />
        <div className="mt-9">
          {loading ? (
            <LoadingRow label="Loading featured treks" />
          ) : featured.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-3">
              {featured.map((trail, index) => (
                <TrailCard
                  key={trail.id}
                  trail={trail}
                  variant={index === 0 ? 'editorial' : 'default'}
                  className={index === 0 ? 'lg:col-span-2' : ''}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">No featured trails are published yet.</p>
          )}
        </div>
      </section>

      {/* Destinations */}
      <section className="border-y border-stone-line bg-white">
        <div className="container-page section-pad">
          <SectionHeading
            eyebrow="Where to go"
            title="Popular destinations"
            description="Nepal is more than Everest. These regions differ enormously in altitude, access and season."
            action={
              <Link to="/destinations" className="btn-secondary btn-sm">
                All destinations
                <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            }
          />
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="skeleton aspect-[4/5] w-full rounded-2xl" />
                ))
              : (data?.destinations ?? []).slice(0, 3).map((destination) => (
                  <Link
                    key={destination.id}
                    to={`/destinations/${destination.slug}`}
                    className="group relative block aspect-[4/5] overflow-hidden rounded-2xl bg-ink"
                  >
                    <img
                      src={destination.heroImage}
                      alt={destination.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" aria-hidden="true" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/70">
                        {destination.region} · {destination.trailCount ?? 0} trails
                      </p>
                      <h3 className="mt-1.5 text-2xl text-white">{destination.name}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/80">{destination.tagline}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-sage">
                        Explore region <Icon name="arrowRight" className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* Beginner */}
      <section className="container-page section-pad">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-16">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow">Start here</p>
            <h2 className="mt-2 text-3xl leading-tight sm:text-4xl">First Himalaya? Go shorter.</h2>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-ink-muted">
              A four-day teahouse trek teaches you more about altitude, pack weight and weather than any amount of
              reading. These routes keep the altitude modest and the options open.
            </p>
            <Link to="/explore?difficulty=easy" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest-700 hover:underline">
              See all easy routes <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <dl className="mt-8 grid grid-cols-2 gap-5 border-t border-stone-line pt-6">
              <MetaItem icon="shield" label="Keep it sane" value="Sleep under 3,000 m" />
              <MetaItem icon="clock" label="Time needed" value="3–5 days" />
            </dl>
          </div>
          <div>
            {loading ? (
              <LoadingRow label="Loading beginner routes" />
            ) : beginner.length > 0 ? (
              beginner.map((trail) => <TrailCard key={trail.id} trail={trail} variant="compact" />)
            ) : (
              <p className="text-sm text-ink-muted">No easy routes are published yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Seasonal */}
      <section className="bg-forest-50/70">
        <div className="container-page section-pad">
          <SectionHeading
            eyebrow={`Right now · ${SEASON_LABELS[season]}`}
            title="In season this month"
            description="Derived from each route's published best seasons. Monsoon months mean leeches and cloud; winter means cold passes and quiet trails."
            action={
              <Link to={`/explore?season=${season}`} className="btn-secondary btn-sm">
                Browse {season} trails
                <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            }
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {seasonal.length > 0 ? (
              seasonal.map((trail) => <TrailCard key={trail.id} trail={trail} />)
            ) : (
              <p className="text-sm text-ink-muted">
                No published routes are flagged for {season} yet. Check the season filter on Explore for other months.
              </p>
            )}
          </div>
          <Notice tone="warning" title="Seasons are a guide, not a guarantee" className="mt-8">
            Trail conditions, snow line and teahouse openings vary year to year. Confirm with a local operator, the
            relevant national park office, or your lodge before committing to a high pass.
          </Notice>
        </div>
      </section>

      {/* Guides & stays */}
      <section className="container-page section-pad">
        <SectionHeading
          eyebrow="Local knowledge"
          title="Walk with people who live there"
          description="Guides and mountain lodges listed with the details that matter: languages, regions, rates and what is verified."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            {
              to: '/guides',
              img: photos.namche,
              alt: 'Namche Bazaar lodges on a hillside in the Khumbu',
              eyebrow: 'Guides',
              title: 'Find a licensed guide',
              copy: 'Filter by region, language and speciality, then send an inquiry. Listing verification is shown explicitly.',
            },
            {
              to: '/stays',
              img: photos.kyanjin,
              alt: 'Kyanjin Gompa village in the Langtang valley',
              eyebrow: 'Stays',
              title: 'Sleep somewhere real',
              copy: 'Teahouses, lodges and homestays with amenities, altitude and nightly rates — no invented ratings.',
            },
          ].map((item) => (
            <Link key={item.to} to={item.to} className="group relative overflow-hidden rounded-2xl bg-ink">
              <img
                src={item.img}
                alt={item.alt}
                loading="lazy"
                className="aspect-[16/10] w-full object-cover opacity-90 transition duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-0 bg-ink/40" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-sage">{item.eyebrow}</p>
                <h3 className="mt-1.5 text-2xl text-white">{item.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/85">{item.copy}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* App / platform */}
      <section className="bg-forest text-white">
        <div className="container-page grid gap-10 py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-sage">On the roadmap</p>
            <h2 className="mt-3 max-w-xl text-3xl leading-tight text-white sm:text-4xl">
              One account, one trail library — web now, mobile next.
            </h2>
            <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-white/80">
              Saved trails, trips and reviews live in a shared Postgres schema with row-level security. The planned
              React Native app uses the same tables and the same API, so your plans follow you between devices.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/saved" className="btn bg-white text-forest-800 hover:bg-sage">
                Start a saved list
              </Link>
              <Link to="/help#mobile" className="btn border border-white/35 text-white hover:bg-white/10">
                Mobile roadmap
              </Link>
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: 'layers', title: 'Shared schema', copy: 'Supabase tables and RLS policies are the contract for every client.' },
              { icon: 'shield', title: 'Server-side rules', copy: 'Roles and ownership are enforced in the database, not in the UI.' },
              { icon: 'map', title: 'Open map data', copy: 'OpenStreetMap tiles and GeoJSON routes, not a proprietary black box.' },
              { icon: 'book', title: 'No invented reviews', copy: 'Reviews are moderated and come from signed-in accounts.' },
            ].map((item) => (
              <li key={item.title} className="rounded-xl border border-white/15 bg-white/5 p-4">
                <Icon name={item.icon} className="h-5 w-5 text-sage" />
                <p className="mt-3 text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/70">{item.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="container-page section-pad">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-stone-line bg-white p-8 shadow-soft sm:flex-row sm:items-center sm:p-10">
          <div>
            <p className="eyebrow">Next step</p>
            <h2 className="mt-2 text-2xl sm:text-3xl">Turn a shortlist into a plan.</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">
              Add trails to a trip, set dates and a budget, and keep the day-by-day notes in one place — signed in or
              on this device.
            </p>
          </div>
          <Link to="/plan" className={cx('btn-primary btn-lg shrink-0')}>
            Open the trip planner
            <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
