import { Icon } from './Icons';
import { Field } from './ui';
import { ACTIVITY_LABELS, DIFFICULTY_LABELS, SEASON_LABELS, DIFFICULTY_ORDER } from '@/lib/format';
import { activeFilterCount } from '@/lib/trailFilters';
import type { TrailFilterState } from '@/lib/types';

interface Props {
  filters: TrailFilterState;
  regions: string[];
  onChange: (patch: Partial<TrailFilterState>) => void;
  onReset: () => void;
}

export function ExploreFilters({ filters, regions, onChange, onReset }: Props) {
  const activeCount = activeFilterCount(filters);

  const numberValue = (value: number | null) => (value === null ? '' : String(value));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-ink-muted">
          <Icon name="filter" className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-forest px-1.5 py-0.5 text-[0.6rem] font-bold text-white">{activeCount}</span>
          )}
        </h2>
        {activeCount > 0 && (
          <button type="button" onClick={onReset} className="text-xs font-semibold text-forest-700 hover:underline">
            Clear all
          </button>
        )}
      </div>

      <Field label="Region" htmlFor="filter-region">
        <select
          id="filter-region"
          className="input"
          value={filters.region}
          onChange={(event) => onChange({ region: event.target.value })}
        >
          <option value="">All regions</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Difficulty" htmlFor="filter-difficulty">
        <select
          id="filter-difficulty"
          className="input"
          value={filters.difficulty}
          onChange={(event) => onChange({ difficulty: event.target.value })}
        >
          <option value="">Any difficulty</option>
          {DIFFICULTY_ORDER.map((value) => (
            <option key={value} value={value}>
              {DIFFICULTY_LABELS[value]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Activity" htmlFor="filter-activity">
        <select
          id="filter-activity"
          className="input"
          value={filters.activity}
          onChange={(event) => onChange({ activity: event.target.value })}
        >
          <option value="">Any activity</option>
          {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Best season" htmlFor="filter-season">
        <select
          id="filter-season"
          className="input"
          value={filters.season}
          onChange={(event) => onChange({ season: event.target.value })}
        >
          <option value="">Any season</option>
          {Object.entries(SEASON_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>

      <fieldset>
        <legend className="label">Distance (km)</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="sr-only" htmlFor="filter-min-distance">
            Minimum distance in kilometres
          </label>
          <input
            id="filter-min-distance"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Min"
            className="input"
            value={numberValue(filters.minDistance)}
            onChange={(event) =>
              onChange({ minDistance: event.target.value === '' ? null : Number(event.target.value) })
            }
          />
          <label className="sr-only" htmlFor="filter-max-distance">
            Maximum distance in kilometres
          </label>
          <input
            id="filter-max-distance"
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="Max"
            className="input"
            value={numberValue(filters.maxDistance)}
            onChange={(event) =>
              onChange({ maxDistance: event.target.value === '' ? null : Number(event.target.value) })
            }
          />
        </div>
      </fieldset>

      <Field label="Maximum duration (days)" htmlFor="filter-duration">
        <input
          id="filter-duration"
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="e.g. 7"
          className="input"
          value={numberValue(filters.maxDuration)}
          onChange={(event) => onChange({ maxDuration: event.target.value === '' ? null : Number(event.target.value) })}
        />
      </Field>

      <Field label="Minimum highest point (m)" htmlFor="filter-elevation" hint="Use this to find high-altitude routes.">
        <input
          id="filter-elevation"
          type="number"
          min={0}
          step={100}
          inputMode="numeric"
          placeholder="e.g. 4000"
          className="input"
          value={numberValue(filters.minElevation)}
          onChange={(event) => onChange({ minElevation: event.target.value === '' ? null : Number(event.target.value) })}
        />
      </Field>

      <div className="rounded-xl bg-forest-50 p-4 text-xs leading-relaxed text-forest-800">
        <p className="font-semibold">Filtering by fact, not ranking</p>
        <p className="mt-1 text-forest-700/90">
          Distances and altitudes are route-level figures from published descriptions. Conditions change: check
          locally before you commit.
        </p>
      </div>

      <button type="button" onClick={onReset} className="btn-secondary w-full" disabled={activeCount === 0}>
        Reset filters
      </button>
    </div>
  );
}
