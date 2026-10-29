import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useSavedTrails } from '@/saved/SavedTrailsProvider';
import { useToast } from './Toast';
import { Icon } from './Icons';
import { SampleBadge } from './ui';
import {
  ACTIVITY_LABELS,
  DIFFICULTY_LABELS,
  difficultyTone,
  formatDistance,
  formatDuration,
  formatElevation,
} from '@/lib/format';
import { cx } from '@/lib/cx';
import type { Trail } from '@/lib/types';

type Variant = 'default' | 'editorial' | 'compact';

export function SaveButton({
  trail,
  size = 'md',
  showLabel = false,
  className,
}: {
  trail: Trail;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}) {
  const { isSaved, toggle } = useSavedTrails();
  const { configured } = useAuth();
  const { push } = useToast();
  const saved = isSaved(trail.id);

  const onClick = async () => {
    const result = await toggle(trail);
    if (result.error) {
      push(result.error, 'error');
      return;
    }
    push(
      result.saved
        ? configured
          ? 'Saved to your trails.'
          : 'Saved on this device. Sign in to sync across devices.'
        : 'Removed from saved trails.',
      'success',
    );
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${trail.name} from saved trails` : `Save ${trail.name}`}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full border transition',
        saved
          ? 'border-forest bg-forest text-white hover:bg-forest-700'
          : 'border-stone-line bg-white/95 text-ink-soft hover:border-forest-300 hover:text-forest-700',
        size === 'sm' ? 'h-8 w-8' : 'px-4 py-2.5 text-sm font-semibold',
        className,
      )}
    >
      <Icon name="heart" className={size === 'sm' ? 'h-4 w-4' : 'h-4 w-4'} />
      {showLabel && <span>{saved ? 'Saved' : 'Save'}</span>}
    </button>
  );
}

export function TrailCard({
  trail,
  variant = 'default',
  className,
}: {
  trail: Trail;
  variant?: Variant;
  className?: string;
}) {
  const meta = (
    <>
      <span className="inline-flex items-center gap-1">
        <Icon name="route" className="h-3.5 w-3.5" /> {formatDistance(trail.distanceKm)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Icon name="clock" className="h-3.5 w-3.5" /> {formatDuration(trail.durationDays)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Icon name="arrowUp" className="h-3.5 w-3.5" /> {formatElevation(trail.maxElevationM)}
      </span>
    </>
  );

  if (variant === 'compact') {
    return (
      <article className={cx('group relative flex gap-4 border-b border-stone-line py-4 last:border-0', className)}>
        <Link
          to={`/trails/${trail.slug}`}
          className="relative h-24 w-28 shrink-0 overflow-hidden rounded-xl bg-stone-paper sm:h-28 sm:w-36"
          tabIndex={-1}
          aria-hidden="true"
        >
          <img
            src={trail.heroImage}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-forest-600">{trail.region}</p>
          <h3 className="mt-1 text-lg leading-snug">
            <Link to={`/trails/${trail.slug}`} className="hover:text-forest-700">
              {trail.name}
            </Link>
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">{meta}</div>
        </div>
        <SaveButton trail={trail} size="sm" className="self-start" />
      </article>
    );
  }

  const isEditorial = variant === 'editorial';

  return (
    <article
      className={cx(
        'group relative overflow-hidden rounded-2xl border border-stone-line bg-white shadow-soft transition duration-300 hover:shadow-lift',
        className,
      )}
    >
      <Link to={`/trails/${trail.slug}`} className="block focus-visible:outline-none">
        <div className={cx('relative overflow-hidden', isEditorial ? 'aspect-[4/3] sm:aspect-[16/11]' : 'aspect-[4/3]')}>
          <img
            src={trail.heroImage}
            alt={`${trail.name}, ${trail.region}`}
            loading="lazy"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
          />
          <div
            className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/75 to-transparent"
            aria-hidden="true"
          />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            <span
              className={cx(
                'rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] ring-1',
                difficultyTone(trail.difficulty),
              )}
            >
              {DIFFICULTY_LABELS[trail.difficulty]}
            </span>
            {trail.isSample && <SampleBadge className="bg-white/90 text-[#7a5207]" />}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-white/75">
              {trail.region} · {ACTIVITY_LABELS[trail.activity]}
            </p>
            <h3 className={cx('mt-1.5 text-white', isEditorial ? 'text-2xl sm:text-3xl' : 'text-xl')}>
              {trail.name}
            </h3>
            {isEditorial && <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/85">{trail.summary}</p>}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3.5 text-xs text-ink-muted sm:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">{meta}</div>
          <span className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-forest-700">
            Details <Icon name="arrowRight" className="h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
      <SaveButton
        trail={trail}
        size="sm"
        className="absolute right-3 top-3 shadow-sm"
      />
    </article>
  );
}
