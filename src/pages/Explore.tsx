import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { contentSource, listRegions, listTrails } from '@/data/content';
import { activeFilterCount, DEFAULT_FILTERS, filtersToParams, parseFilters, SORT_OPTIONS } from '@/lib/trailFilters';
import { describeError } from '@/lib/supabase';
import { DIFFICULTY_LABELS, pluralize } from '@/lib/format';
import { cx } from '@/lib/cx';
import { ExploreFilters } from '@/components/ExploreFilters';
import { MapView, trailMarkerMeta } from '@/components/MapView';
import { TrailCard } from '@/components/TrailCard';
import { Icon } from '@/components/Icons';
import { EmptyState, ErrorState, Modal, PageIntro, Pagination, TrailCardSkeleton, Notice } from '@/components/ui';
import type { TrailFilterState, TrailPage } from '@/lib/types';

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const [result, setResult] = useState<TrailPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchDraft, setSearchDraft] = useState(filters.q);
  const debounceRef = useRef<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const activeCount = activeFilterCount(filters);
  const hasFilters = activeCount > 0;

  const applyFilters = useCallback(
    (next: TrailFilterState) => {
      setSearchParams(filtersToParams(next), { replace: true });
    },
    [setSearchParams],
  );

  const update = useCallback(
    (patch: Partial<TrailFilterState>) => {
      applyFilters({ ...filters, ...patch, page: 1 });
    },
    [applyFilters, filters],
  );

  const reset = useCallback(() => {
    setSearchDraft('');
    applyFilters({ ...DEFAULT_FILTERS, pageSize: filters.pageSize });
  }, [applyFilters, filters.pageSize]);

  useEffect(() => {
    setSearchDraft(filters.q);
  }, [filters.q]);

  useEffect(() => {
    let active = true;
    listRegions()
      .then((list) => {
        if (active) setRegions(list);
      })
      .catch(() => {
        if (active) setRegions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    listTrails(filters)
      .then((page) => {
        if (!active) return;
        setResult(page);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(describeError(err, 'Could not load trails.'));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, reloadKey]);

  const onSearchChange = (value: string) => {
    setSearchDraft(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      if (value.trim() !== filters.q) update({ q: value.trim() });
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const goToPage = (page: number) => {
    applyFilters({ ...filters, page });
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <PageIntro
        eyebrow="Trail directory"
        title="Explore Nepal, filter by fact"
        description="Every route below is described by distance, days, highest point and season. Use the filters to narrow the list — the URL updates so you can share exactly what you see."
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-2">
            <Icon name="route" className="h-4 w-4 text-forest" />
            {loading ? 'Counting trails…' : `${result?.total ?? 0} ${pluralize(result?.total ?? 0, 'trail')}`}
          </span>
          {hasFilters && (
            <span className="inline-flex items-center gap-2 text-forest-700">
              <Icon name="filter" className="h-4 w-4" />
              {activeCount} active {pluralize(activeCount, 'filter')}
            </span>
          )}
          {contentSource === 'sample' && <span className="badge">Preview dataset</span>}
        </div>
      </PageIntro>

      <div className="container-page py-8 sm:py-10">
        <div className="lg:grid lg:grid-cols-[17rem_1fr] lg:gap-10">
          <aside className="hidden lg:block">
            <div className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-stone-line bg-white p-5 shadow-soft">
              <ExploreFilters filters={filters} regions={regions} onChange={update} onReset={reset} />
            </div>
          </aside>

          <div ref={resultsRef}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <label className="sr-only" htmlFor="explore-search">
                  Search trails
                </label>
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                />
                <input
                  id="explore-search"
                  type="search"
                  value={searchDraft}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search by name, region or feature"
                  className="input pl-10"
                />
              </div>

              <button
                type="button"
                className="btn-secondary lg:hidden"
                onClick={() => setFiltersOpen(true)}
                aria-expanded={filtersOpen}
              >
                <Icon name="filter" className="h-4 w-4" />
                Filters{activeCount > 0 ? ` (${activeCount})` : ''}
              </button>

              <div className="flex items-center gap-2">
                <label className="sr-only" htmlFor="explore-sort">
                  Sort trails
                </label>
                <select
                  id="explore-sort"
                  className="input w-auto py-2.5"
                  value={filters.sort}
                  onChange={(event) => update({ sort: event.target.value as TrailFilterState['sort'] })}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <div className="flex rounded-full border border-stone-line bg-white p-0.5" role="group" aria-label="View mode">
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    aria-pressed={view === 'list'}
                    className={cx(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                      view === 'list' ? 'bg-forest text-white' : 'text-ink-muted hover:text-forest-700',
                    )}
                  >
                    <Icon name="list" className="h-3.5 w-3.5" /> List
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('map')}
                    aria-pressed={view === 'map'}
                    className={cx(
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                      view === 'map' ? 'bg-forest text-white' : 'text-ink-muted hover:text-forest-700',
                    )}
                  >
                    <Icon name="map" className="h-3.5 w-3.5" /> Map
                  </button>
                </div>
              </div>
            </div>

            {hasFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {filters.region && (
                  <button type="button" className="chip chip-active" onClick={() => update({ region: '' })}>
                    {filters.region} <Icon name="close" className="h-3 w-3" />
                  </button>
                )}
                {filters.difficulty && (
                  <button type="button" className="chip chip-active" onClick={() => update({ difficulty: '' })}>
                    {DIFFICULTY_LABELS[filters.difficulty as keyof typeof DIFFICULTY_LABELS] ?? filters.difficulty}
                    <Icon name="close" className="h-3 w-3" />
                  </button>
                )}
                {filters.activity && (
                  <button type="button" className="chip chip-active" onClick={() => update({ activity: '' })}>
                    {filters.activity.replace('_', ' ')} <Icon name="close" className="h-3 w-3" />
                  </button>
                )}
                {filters.season && (
                  <button type="button" className="chip chip-active" onClick={() => update({ season: '' })}>
                    {filters.season} <Icon name="close" className="h-3 w-3" />
                  </button>
                )}
                {filters.maxDuration !== null && (
                  <button type="button" className="chip chip-active" onClick={() => update({ maxDuration: null })}>
                    ≤ {filters.maxDuration} days <Icon name="close" className="h-3 w-3" />
                  </button>
                )}
                {filters.minElevation !== null && (
                  <button type="button" className="chip chip-active" onClick={() => update({ minElevation: null })}>
                    ≥ {filters.minElevation} m <Icon name="close" className="h-3 w-3" />
                  </button>
                )}
                {(filters.minDistance !== null || filters.maxDistance !== null) && (
                  <button
                    type="button"
                    className="chip chip-active"
                    onClick={() => update({ minDistance: null, maxDistance: null })}
                  >
                    distance {filters.minDistance ?? 0}–{filters.maxDistance ?? '∞'} km
                    <Icon name="close" className="h-3 w-3" />
                  </button>
                )}
                <button type="button" onClick={reset} className="text-xs font-semibold text-forest-700 hover:underline">
                  Clear all
                </button>
              </div>
            )}

            <div className="mt-6">
              {error && <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />}

              {!error && loading && (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <TrailCardSkeleton key={index} />
                  ))}
                </div>
              )}

              {!error && !loading && result && result.items.length === 0 && (
                <EmptyState
                  title="No trails match those filters"
                  description="Try widening the distance or duration, or clear a couple of filters. The catalogue currently covers published routes only."
                  action={
                    <button type="button" className="btn-primary" onClick={reset}>
                      Clear all filters
                    </button>
                  }
                />
              )}

              {!error && !loading && result && result.items.length > 0 && view === 'list' && (
                <>
                  <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                    {result.items.map((trail) => (
                      <TrailCard key={trail.id} trail={trail} />
                    ))}
                  </div>
                  <Pagination page={result.page} totalPages={result.totalPages} onChange={goToPage} />
                </>
              )}

              {!error && !loading && result && result.items.length > 0 && view === 'map' && (
                <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="lg:sticky lg:top-28 lg:self-start">
                    <MapView
                      markers={result.items.map((trail) => ({
                        id: trail.id,
                        lat: trail.startLat,
                        lng: trail.startLng,
                        label: trail.name,
                        slug: trail.slug,
                        meta: trailMarkerMeta(trail),
                      }))}
                      heightClass="h-[26rem] lg:h-[36rem]"
                      ariaLabel="Map of trail start points for the current results"
                    />
                    <p className="mt-2 px-1 text-xs text-ink-faint">
                      Pins mark published start points. Route geometry is on each trail page.
                    </p>
                  </div>
                  <div className="divide-y divide-stone-line rounded-2xl border border-stone-line bg-white px-5 shadow-soft">
                    {result.items.map((trail) => (
                      <TrailCard key={trail.id} trail={trail} variant="compact" />
                    ))}
                  </div>
                  <div className="lg:col-span-2">
                    <Pagination page={result.page} totalPages={result.totalPages} onChange={goToPage} />
                  </div>
                </div>
              )}
            </div>

            {contentSource === 'sample' && !error && (
              <Notice tone="neutral" className="mt-8">
                You are browsing the sample dataset bundled with this project. Connect Supabase and run the included
                migrations to serve live trail records instead.
              </Notice>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter trails"
        description="Changes apply immediately."
        size="md"
        footer={
          <button type="button" className="btn-primary" onClick={() => setFiltersOpen(false)}>
            Show {result?.total ?? 0} results
          </button>
        }
      >
        <ExploreFilters filters={filters} regions={regions} onChange={update} onReset={reset} />
      </Modal>
    </div>
  );
}
