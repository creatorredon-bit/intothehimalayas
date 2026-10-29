import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/Toast';
import { getTrailBySlug, listReviews, listTrails } from '@/data/content';
import { createReview } from '@/data/user';
import { siteOrigin, setupHint } from '@/lib/env';
import { describeError } from '@/lib/supabase';
import {
  ACTIVITY_LABELS,
  DIFFICULTY_LABELS,
  SEASON_LABELS,
  averageRating,
  difficultyTone,
  formatDate,
  formatDistance,
  formatDuration,
  formatElevation,
  initials,
  pluralize,
} from '@/lib/format';
import { DEFAULT_FILTERS } from '@/lib/trailFilters';
import { cx } from '@/lib/cx';
import { Icon } from '@/components/Icons';
import { MapView } from '@/components/MapView';
import { SaveButton, TrailCard } from '@/components/TrailCard';
import {
  DetailSkeleton,
  EmptyState,
  ErrorState,
  Field,
  MetaItem,
  Notice,
  SampleBadge,
  Spinner,
} from '@/components/ui';
import type { Review, Trail } from '@/lib/types';

function Stars({ rating, label }: { rating: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={label ?? `${rating} out of 5`} role="img">
      {[1, 2, 3, 4, 5].map((value) => (
        <Icon
          key={value}
          name="star"
          className={cx('h-3.5 w-3.5', value <= Math.round(rating) ? 'text-gold' : 'text-stone-line')}
          strokeWidth={2}
        />
      ))}
    </span>
  );
}

export default function TrailDetailPage() {
  const { slug = '' } = useParams();
  const { user, configured, profile } = useAuth();
  const { push } = useToast();

  const [trail, setTrail] = useState<Trail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similar, setSimilar] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [visitedOn, setVisitedOn] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSubmitted(false);
    try {
      const found = await getTrailBySlug(slug);
      setTrail(found);
      if (!found) {
        setLoading(false);
        return;
      }
      const [reviewList, related] = await Promise.all([
        listReviews(found.id),
        listTrails({ ...DEFAULT_FILTERS, region: found.region, pageSize: 4 }),
      ]);
      setReviews(reviewList);
      setSimilar(related.items.filter((item) => item.id !== found.id).slice(0, 3));
    } catch (err) {
      setError(describeError(err, 'Could not load this trail.'));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const onShare = async () => {
    if (!trail) return;
    const url = `${siteOrigin()}/trails/${trail.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: trail.name, text: trail.summary, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      push('Link copied to your clipboard.', 'success');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') push('Could not share this link.', 'error');
    }
  };

  const onSubmitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trail || !user) return;
    setReviewError(null);
    if (reviewBody.trim().length < 20) {
      setReviewError('Please write at least 20 characters so the review is useful to other walkers.');
      return;
    }
    setSubmitting(true);
    try {
      await createReview(user.id, {
        trailId: trail.id,
        rating,
        title: reviewTitle.trim() || null,
        body: reviewBody.trim(),
        visitedOn: visitedOn || null,
        authorName: profile?.fullName || user.email?.split('@')[0] || 'Trekker',
      });
      setSubmitted(true);
      setReviewTitle('');
      setReviewBody('');
      setVisitedOn('');
      push('Review submitted for moderation. Thank you.', 'success');
    } catch (err) {
      setReviewError(describeError(err, 'Could not submit your review.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <DetailSkeleton />;

  if (error) {
    return (
      <div className="container-page py-20">
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  if (!trail) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon="compass"
          title="We could not find that trail"
          description="The link may be out of date, or the trail may have been unpublished."
          action={
            <Link to="/explore" className="btn-primary">
              Browse all trails
            </Link>
          }
        />
      </div>
    );
  }

  const reviewAverage = trail.avgRating ?? averageRating(reviews.map((review) => review.rating));
  const reviewCount = trail.reviewCount && trail.reviewCount > 0 ? trail.reviewCount : reviews.length;

  return (
    <article>
      <div className="container-page pt-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-ink-faint">
          <Link to="/" className="hover:text-forest-700">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link to="/explore" className="hover:text-forest-700">
            Trails
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink-muted">{trail.region}</span>
        </nav>
      </div>

      <header className="container-page grid gap-8 pb-10 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cx(
                'rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] ring-1',
                difficultyTone(trail.difficulty),
              )}
            >
              {DIFFICULTY_LABELS[trail.difficulty]}
            </span>
            <span className="badge">{ACTIVITY_LABELS[trail.activity]}</span>
            <span className="text-xs text-ink-faint">{trail.region} · Nepal</span>
            {trail.isSample && <SampleBadge />}
          </div>

          <h1 className="mt-4 text-balance text-4xl leading-[1.05] sm:text-5xl lg:text-[3.4rem]">{trail.name}</h1>
          <p className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-ink-soft">{trail.summary}</p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <SaveButton trail={trail} showLabel />
            <button type="button" onClick={onShare} className="btn-secondary">
              <Icon name="share" className="h-4 w-4" />
              Share
            </button>
            <Link to="/plan" className="btn-ghost">
              <Icon name="calendar" className="h-4 w-4" />
              Add to a trip
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-2">
              <Stars rating={reviewAverage ?? 0} label={reviewAverage ? `${reviewAverage} out of 5` : 'No ratings yet'} />
              {reviewAverage ? `${reviewAverage.toFixed(1)} · ${reviewCount} ${pluralize(reviewCount, 'review')}` : 'No reviews yet'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="clock" className="h-4 w-4" /> Updated data from published route sources
            </span>
          </div>
        </div>

        <div>
          <div className="overflow-hidden rounded-3xl border border-stone-line bg-stone-paper shadow-soft">
            <img
              src={trail.heroImage}
              alt={`${trail.name} landscape in ${trail.region}, Nepal`}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
          {trail.gallery.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {trail.gallery.slice(0, 2).map((image, index) => (
                <img
                  key={image + index}
                  src={image}
                  alt={`${trail.name} scenery ${index + 1}`}
                  loading="lazy"
                  className="aspect-[16/10] w-full rounded-xl border border-stone-line object-cover"
                />
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="border-y border-stone-line bg-white">
        <dl className="container-page grid grid-cols-2 gap-6 py-6 sm:grid-cols-3 lg:grid-cols-6">
          <MetaItem icon="route" label="Distance" value={formatDistance(trail.distanceKm)} />
          <MetaItem icon="clock" label="Duration" value={formatDuration(trail.durationDays)} />
          <MetaItem icon="arrowUp" label="Highest point" value={formatElevation(trail.maxElevationM)} />
          <MetaItem
            icon="layers"
            label="Total ascent"
            value={trail.elevationGainM ? formatElevation(trail.elevationGainM) : 'Not published'}
          />
          <MetaItem icon="map" label="Start" value={trail.startPointName} />
          <MetaItem
            icon="sun"
            label="Best seasons"
            value={trail.bestSeasons.map((season) => SEASON_LABELS[season].split(' ')[0]).join(', ') || '—'}
          />
        </dl>
      </div>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,0.85fr)] lg:gap-14">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="text-2xl sm:text-3xl">
              About this route
            </h2>
            <p className="mt-4 whitespace-pre-line text-[0.98rem] leading-7 text-ink-soft">{trail.description}</p>
            {trail.destinationSlug && (
              <p className="mt-5 text-sm">
                Gateway region:{' '}
                <Link to={`/destinations/${trail.destinationSlug}`} className="link-underline">
                  {trail.destinationName ?? trail.region}
                </Link>
              </p>
            )}
          </section>

          <section aria-labelledby="map-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="map-heading" className="text-2xl sm:text-3xl">
                Route map
              </h2>
              <p className="text-xs text-ink-faint">
                Start point: {trail.startPointName} ({trail.startLat.toFixed(4)}, {trail.startLng.toFixed(4)})
              </p>
            </div>
            <div className="mt-4">
              <MapView
                markers={[
                  {
                    id: trail.id,
                    lat: trail.startLat,
                    lng: trail.startLng,
                    label: trail.startPointName,
                    meta: `${trail.name} start`,
                  },
                ]}
                route={trail.route?.coordinates ?? null}
                heightClass="h-[24rem]"
                ariaLabel={`Map of the ${trail.name} route`}
              />
            </div>
            <Notice tone="warning" className="mt-4" title="Use this as a planning sketch">
              Route lines are drawn through documented villages and passes; they are not surveyed GPS traces. Carry a
              paper map or an offline GPX from a current source, and ask locally about closures.
            </Notice>
          </section>

          <section aria-labelledby="itinerary-heading">
            <h2 id="itinerary-heading" className="text-2xl sm:text-3xl">
              Day by day
            </h2>
            {trail.itinerary.length > 0 ? (
              <ol className="mt-5 space-y-3">
                {trail.itinerary.map((day) => (
                  <li key={`${day.day}-${day.title}`}>
                    <details className="group rounded-xl border border-stone-line bg-white p-0 open:shadow-soft">
                      <summary className="flex cursor-pointer list-none items-start gap-4 p-4 [&::-webkit-details-marker]:hidden">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-50 text-xs font-bold text-forest-700">
                          {day.day}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-base font-semibold text-ink">{day.title}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
                            {day.altitudeM && (
                              <span className="inline-flex items-center gap-1">
                                <Icon name="arrowUp" className="h-3.5 w-3.5" /> {formatElevation(day.altitudeM)}
                              </span>
                            )}
                            {day.walkingHours && (
                              <span className="inline-flex items-center gap-1">
                                <Icon name="clock" className="h-3.5 w-3.5" /> {day.walkingHours}
                              </span>
                            )}
                            {day.accommodation && (
                              <span className="inline-flex items-center gap-1">
                                <Icon name="bed" className="h-3.5 w-3.5" /> {day.accommodation}
                              </span>
                            )}
                          </span>
                        </span>
                        <Icon
                          name="chevronDown"
                          className="mt-1.5 h-4 w-4 shrink-0 text-ink-faint transition group-open:rotate-180"
                        />
                      </summary>
                      <p className="border-t border-stone-line px-4 py-3 pl-[4.25rem] text-sm leading-relaxed text-ink-muted">
                        {day.description}
                      </p>
                    </details>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">No day-by-day breakdown has been published for this route.</p>
            )}
          </section>

          <section aria-labelledby="facilities-heading" className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 id="facilities-heading" className="text-2xl">
                On the trail
              </h2>
              <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
                {trail.facilities.map((facility) => (
                  <li key={facility} className="flex items-start gap-2.5">
                    <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                    <span className="leading-relaxed">{facility}</span>
                  </li>
                ))}
                {trail.facilities.length === 0 && <li className="text-ink-muted">No facilities documented yet.</li>}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl">Permits</h2>
              {trail.permitsRequired && trail.permitsRequired.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {trail.permitsRequired.map((permit) => (
                    <li key={permit} className="chip cursor-default">
                      {permit}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">{trail.permitInfo}</p>
            </div>
          </section>

          <section aria-labelledby="safety-heading">
            <h2 id="safety-heading" className="text-2xl sm:text-3xl">
              Safety and altitude
            </h2>
            <div className="mt-4 rounded-2xl border border-gold/50 bg-gold/10 p-5">
              <div className="flex items-start gap-3">
                <Icon name="shield" className="mt-0.5 h-5 w-5 shrink-0 text-[#8a5a05]" />
                <div>
                  <p className="font-semibold text-[#7a5207]">Read this before you book anything</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#7a5207]/90">{trail.safetyNotes}</p>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="reviews-heading" id="reviews">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="reviews-heading" className="text-2xl sm:text-3xl">
                  Reviews
                </h2>
                <p className="mt-1.5 text-sm text-ink-muted">
                  {reviewCount > 0
                    ? `${reviewCount} ${pluralize(reviewCount, 'moderated review')}${reviewAverage ? ` · ${reviewAverage.toFixed(1)} average` : ''}`
                    : 'No approved reviews yet. Yours would be the first.'}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-stone-line bg-white p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-50 text-xs font-bold text-forest-700">
                      {initials(review.authorName || 'Trekker')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <p className="text-sm font-semibold text-ink">{review.authorName || 'Verified trekker'}</p>
                        <Stars rating={review.rating} />
                        <span className="text-xs text-ink-faint">{formatDate(review.createdAt)}</span>
                      </div>
                      {review.title && <h3 className="mt-2 text-base font-semibold">{review.title}</h3>}
                      <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{review.body}</p>
                      {review.visitedOn && (
                        <p className="mt-2 text-xs text-ink-faint">Walked in {formatDate(review.visitedOn)}</p>
                      )}
                    </div>
                  </div>
                </article>
              ))}

              {reviews.length === 0 && (
                <div className="rounded-xl border border-dashed border-stone-line bg-stone-paper/60 p-6 text-sm leading-relaxed text-ink-muted">
                  This project does not seed invented reviews. Approved reviews from signed-in walkers appear here once
                  a moderator publishes them.
                </div>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-stone-line bg-white p-6">
              <h3 className="text-lg">Walked this route?</h3>
              {!configured ? (
                <Notice tone="neutral" className="mt-3" title="Reviews need a Supabase project">
                  {setupHint} Reviews are written to <code className="rounded bg-stone-paper px-1 py-0.5">trail_reviews</code>{' '}
                  and moderated before they appear.
                </Notice>
              ) : !user ? (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
                  <Link to={`/login?next=/trails/${trail.slug}`} className="btn-primary btn-sm">
                    Sign in to review
                  </Link>
                  <span>One review per trail; edits are moderated.</span>
                </div>
              ) : submitted ? (
                <Notice tone="success" className="mt-3" title="Submitted for moderation">
                  Your review is queued for approval. It will appear here once published.
                </Notice>
              ) : (
                <form onSubmit={onSubmitReview} className="mt-4 space-y-4">
                  <fieldset>
                    <legend className="label">Your rating</legend>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-label={`${value} star${value === 1 ? '' : 's'}`}
                          aria-pressed={rating === value}
                          onClick={() => setRating(value)}
                          className="rounded p-1 transition hover:bg-gold/10"
                        >
                          <Icon
                            name="star"
                            className={cx('h-6 w-6', value <= rating ? 'text-gold' : 'text-stone-line')}
                            strokeWidth={1.8}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-ink-muted">{rating} / 5</span>
                    </div>
                  </fieldset>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Title (optional)" htmlFor="review-title">
                      <input
                        id="review-title"
                        className="input"
                        maxLength={120}
                        value={reviewTitle}
                        onChange={(event) => setReviewTitle(event.target.value)}
                        placeholder="What stood out?"
                      />
                    </Field>
                    <Field label="Date walked (optional)" htmlFor="review-visited">
                      <input
                        id="review-visited"
                        type="date"
                        className="input"
                        max={new Date().toISOString().slice(0, 10)}
                        value={visitedOn}
                        onChange={(event) => setVisitedOn(event.target.value)}
                      />
                    </Field>
                  </div>

                  <Field
                    label="Your review"
                    htmlFor="review-body"
                    hint="Conditions, teahouses, pacing, what you would change. Minimum 20 characters."
                    error={reviewError ?? undefined}
                  >
                    <textarea
                      id="review-body"
                      className="input min-h-32"
                      value={reviewBody}
                      onChange={(event) => setReviewBody(event.target.value)}
                      placeholder="We walked in late October. The trail above Tengboche was icy before dawn…"
                      aria-invalid={Boolean(reviewError)}
                      aria-describedby={reviewError ? 'review-body-error' : 'review-body-hint'}
                      required
                    />
                  </Field>

                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? <Spinner className="h-4 w-4" /> : <Icon name="edit" className="h-4 w-4" />}
                    {submitting ? 'Submitting…' : 'Submit review'}
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <div className="card p-6">
            <p className="eyebrow">Plan around this route</p>
            <h2 className="mt-2 text-xl">Build it into a trip</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">
              Add {trail.name} to a dated itinerary with notes and cost estimates. Trips save to your account, or to
              this device if you are browsing as a guest.
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <Link to="/plan" className="btn-primary w-full">
                Open trip planner
                <Icon name="arrowRight" className="h-4 w-4" />
              </Link>
              <Link to={`/guides?region=${encodeURIComponent(trail.region)}`} className="btn-secondary w-full">
                Guides in {trail.region}
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-base font-semibold">At a glance</h2>
            <dl className="mt-4 space-y-3.5">
              <MetaItem icon="route" label="Trail distance" value={formatDistance(trail.distanceKm)} />
              <MetaItem icon="clock" label="Typical duration" value={formatDuration(trail.durationDays)} />
              <MetaItem icon="arrowUp" label="Highest point" value={formatElevation(trail.maxElevationM)} />
              <MetaItem
                icon="sun"
                label="Best months"
                value={trail.bestSeasons.map((season) => SEASON_LABELS[season]).join(' · ')}
              />
            </dl>
            <p className="mt-4 border-t border-stone-line pt-4 text-xs leading-relaxed text-ink-faint">
              Distances and altitudes are route-level figures. If a number is missing we leave it blank rather than
              guess.
            </p>
          </div>

          {trail.isSample && (
            <div className="rounded-2xl border border-gold/40 bg-gold/10 p-5">
              <SampleBadge />
              <p className="mt-2 text-xs leading-relaxed text-[#7a5207]">
                This record ships with the project as sample content. Replace or verify it from the admin dashboard
                before treating it as a commercial route description.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-stone-line bg-forest-50/60 p-5">
            <h2 className="text-sm font-semibold text-forest-900">Before you go</h2>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-forest-900/80">
              <li>Register your route and insurance with someone at home.</li>
              <li>Carry cash; ATMs above the road heads are unreliable.</li>
              <li>Check permit rules — restricted areas need an agency.</li>
              <li>Build a weather buffer before your flight home.</li>
            </ul>
            <Link to="/help#permits" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-forest-700 hover:underline">
              Permits and safety guide <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </Link>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="border-t border-stone-line bg-white">
          <div className="container-page section-pad">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Also in {trail.region}</p>
                <h2 className="mt-2 text-2xl sm:text-3xl">Other routes nearby</h2>
              </div>
              <Link to={`/explore?region=${encodeURIComponent(trail.region)}`} className="btn-secondary btn-sm">
                Filter by region
              </Link>
            </div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((item) => (
                <TrailCard key={item.id} trail={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
