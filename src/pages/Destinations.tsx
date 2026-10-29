import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDestinationBySlug, listDestinations, listTrailsForDestination } from '@/data/content';
import { describeError } from '@/lib/supabase';
import { SEASON_LABELS, pluralize } from '@/lib/format';
import { Icon } from '@/components/Icons';
import { MapView, trailMarkerMeta } from '@/components/MapView';
import { TrailCard } from '@/components/TrailCard';
import { EmptyState, ErrorState, PageIntro, SectionHeading } from '@/components/ui';
import type { Destination, Trail } from '@/lib/types';

export function DestinationsPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDestinations(await listDestinations());
    } catch (err) {
      setError(describeError(err, 'Could not load destinations.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageIntro
        eyebrow="Destinations"
        title="Seven ways into the mountains"
        description="Regions, parks and valleys — each with its own access, altitude band and season. Pick a region first, then narrow down the route."
      />

      <div className="container-page py-10 sm:py-14">
        {error && <ErrorState message={error} onRetry={load} />}

        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton aspect-[4/5] w-full rounded-2xl" />
            ))}
          </div>
        )}

        {!loading && !error && destinations.length === 0 && (
          <EmptyState
            icon="compass"
            title="No destinations published"
            description="Once regions are added in the admin dashboard they will appear here."
            action={
              <Link to="/explore" className="btn-primary">
                Explore trails instead
              </Link>
            }
          />
        )}

        {!loading && destinations.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {destinations.map((destination) => (
              <Link
                key={destination.id}
                to={`/destinations/${destination.slug}`}
                className="group relative block overflow-hidden rounded-2xl bg-ink shadow-soft"
              >
                <img
                  src={destination.heroImage}
                  alt={destination.name}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover opacity-95 transition duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-via-ink/10 bg-gradient-to-t from-ink/85 to-transparent" aria-hidden="true" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/70">
                    {destination.region} · {destination.trailCount ?? 0} {pluralize(destination.trailCount ?? 0, 'trail')}
                  </p>
                  <h2 className="mt-1.5 text-2xl text-white">{destination.name}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/80">{destination.description}</p>
                  <p className="mt-3 text-[0.7rem] font-medium text-sage">
                    {destination.bestSeasons.map((season) => SEASON_LABELS[season].split(' ')[0]).join(' · ')}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function DestinationDetailPage() {
  const { slug = '' } = useParams();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const found = await getDestinationBySlug(slug);
      setDestination(found);
      setTrails(found ? await listTrailsForDestination(found.id) : []);
    } catch (err) {
      setError(describeError(err, 'Could not load this destination.'));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="container-page space-y-5 py-12">
        <div className="skeleton h-10 w-1/2" />
        <div className="skeleton aspect-[16/7] w-full rounded-2xl" />
        <div className="grid gap-5 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton aspect-[4/3] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-20">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  if (!destination) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon="compass"
          title="Destination not found"
          description="This region may have been renamed or unpublished."
          action={
            <Link to="/destinations" className="btn-primary">
              All destinations
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <section className="relative isolate min-h-[22rem] overflow-hidden bg-ink sm:min-h-[26rem]">
        <img src={destination.heroImage} alt={destination.name} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-ink/50" aria-hidden="true" />
        <div className="container-page relative flex min-h-[22rem] flex-col justify-end pb-10 pt-28 text-white sm:min-h-[26rem]">
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-xs text-white/70">
            <Link to="/destinations" className="hover:text-white">
              Destinations
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-white/90">{destination.name}</span>
          </nav>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-sage">{destination.region}</p>
          <h1 className="mt-2 max-w-3xl text-4xl leading-tight text-white sm:text-5xl">{destination.name}</h1>
          <p className="mt-3 max-w-2xl text-[0.98rem] leading-relaxed text-white/85">{destination.tagline}</p>
        </div>
      </section>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <h2 className="text-2xl">The region</h2>
          <p className="mt-4 whitespace-pre-line text-[0.98rem] leading-7 text-ink-soft">{destination.description}</p>
          <dl className="mt-6 flex flex-wrap gap-6 border-t border-stone-line pt-5 text-sm">
            <div>
              <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">Best seasons</dt>
              <dd className="mt-1 font-medium text-ink">
                {destination.bestSeasons.map((season) => SEASON_LABELS[season]).join(' · ')}
              </dd>
            </div>
            <div>
              <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">Trails mapped</dt>
              <dd className="mt-1 font-medium text-ink">{trails.length}</dd>
            </div>
          </dl>
        </div>
        <div>
          <MapView
            center={[destination.lat, destination.lng]}
            markers={[
              {
                id: destination.id,
                lat: destination.lat,
                lng: destination.lng,
                label: destination.name,
                meta: `Gateway point for ${destination.region}`,
              },
              ...trails.map((trail) => ({
                id: trail.id,
                lat: trail.startLat,
                lng: trail.startLng,
                label: trail.name,
                slug: trail.slug,
                meta: trailMarkerMeta(trail),
              })),
            ]}
            heightClass="h-[20rem]"
            ariaLabel={`Map of ${destination.name}`}
          />
          <p className="mt-2 px-1 text-xs text-ink-faint">
            Pins are trail start points, not a route survey. Coordinates are approximate.
          </p>
        </div>
      </div>

      <section className="border-t border-stone-line bg-white">
        <div className="container-page section-pad">
          <SectionHeading
            eyebrow="Routes in this region"
            title={`Trails in ${destination.name}`}
            action={
              <Link to={`/explore?region=${encodeURIComponent(destination.region)}`} className="btn-secondary btn-sm">
                Open in Explore
                <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
            }
          />
          <div className="mt-8">
            {trails.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {trails.map((trail) => (
                  <TrailCard key={trail.id} trail={trail} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="route"
                title="No routes published here yet"
                description="This region is listed, but no trail records point to it yet."
                action={
                  <Link to="/explore" className="btn-primary">
                    Browse all trails
                  </Link>
                }
              />
            )}
          </div>
        </div>
      </section>

      <div className="container-page py-12">
        <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-stone-line bg-white p-7 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl">Plan a trip around {destination.region}</h2>
            <p className="mt-1.5 text-sm text-ink-muted">Add routes, dates and budget in the trip planner.</p>
          </div>
          <Link to="/plan" className="btn-primary shrink-0">
            Open trip planner
          </Link>
        </div>
      </div>
    </div>
  );
}
