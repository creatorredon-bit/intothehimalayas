import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTrips } from '@/trips/useTrips';
import { listAllTrails } from '@/data/content';
import { calculateBudget, DEFAULT_BUDGET_INPUTS, sumItemCosts, type BudgetInputs } from '@/lib/budget';
import {
  dayCount,
  formatDate,
  formatDateRange,
  formatNpr,
  pluralize,
} from '@/lib/format';
import { describeError } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { Icon } from '@/components/Icons';
import {
  EmptyState,
  ErrorState,
  Field,
  LoadingRow,
  Modal,
  Notice,
  PageIntro,
  Spinner,
} from '@/components/ui';
import { cx } from '@/lib/cx';
import type { Trail, TripDay } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/* List                                                                       */
/* -------------------------------------------------------------------------- */

export function TripsPage() {
  const { trips, loading, error, isGuest, create } = useTrips();
  const { push } = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelers, setTravelers] = useState('1');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!title.trim()) return setFormError('Give the trip a name.');
    if (startDate && endDate && endDate < startDate) return setFormError('The end date cannot be before the start date.');
    const travelerCount = Number(travelers);
    if (!Number.isInteger(travelerCount) || travelerCount < 1) return setFormError('At least one traveller is required.');

    setSaving(true);
    try {
      const trip = await create({
        title: title.trim(),
        startDate: startDate || null,
        endDate: endDate || null,
        travelers: travelerCount,
        budgetNpr: budget === '' ? null : Number(budget),
        notes: notes.trim() || null,
      });
      push('Trip created.', 'success');
      setOpen(false);
      setTitle('');
      setStartDate('');
      setEndDate('');
      setTravelers('1');
      setBudget('');
      setNotes('');
      navigate(`/plan/${trip.id}`);
    } catch (err) {
      setFormError(describeError(err, 'Could not create the trip.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageIntro
        eyebrow="Trip planner"
        title="Put dates around the trails"
        description="Create a trip, add the routes you want, and lay them out day by day with notes and cost estimates."
      >
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
            <Icon name="plus" className="h-4 w-4" />
            New trip
          </button>
          {isGuest && (
            <span className="text-xs text-ink-muted">
              Guest mode: trips are stored in this browser.{' '}
              <Link to="/login?next=/plan" className="font-semibold text-forest-700 hover:underline">
                Sign in to sync
              </Link>
            </span>
          )}
        </div>
      </PageIntro>

      <div className="container-page py-10">
        {isGuest && (
          <Notice tone="info" className="mb-6" title="Planning without an account">
            This trip list is saved in this browser only. Create a free account to sync trips, save trails and keep
            notes across devices — the database enforces ownership with row-level security.
          </Notice>
        )}

        {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
        {loading && <LoadingRow label="Loading your trips" />}

        {!loading && !error && trips.length === 0 && (
          <EmptyState
            icon="calendar"
            title="No trips yet"
            description="Start with one route and a rough date. You can add days and swap trails as the plan firms up."
            action={
              <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
                Create your first trip
              </button>
            }
          />
        )}

        {trips.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {trips.map((trip) => {
              const itemCosts = sumItemCosts(trip.days.flatMap((day) => day.items.map((item) => item.estimatedCostNpr)));
              const length = dayCount(trip.startDate, trip.endDate);
              return (
                <Link
                  key={trip.id}
                  to={`/plan/${trip.id}`}
                  className="card group flex flex-col p-6 transition hover:shadow-lift"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-forest-600">
                        {formatDateRange(trip.startDate, trip.endDate)}
                      </p>
                      <h2 className="mt-2 text-xl leading-snug group-hover:text-forest-700">{trip.title}</h2>
                    </div>
                    <span className="rounded-full bg-forest-50 px-2.5 py-1 text-[0.65rem] font-semibold text-forest-700">
                      {trip.days.length} {pluralize(trip.days.length, 'day')}
                    </span>
                  </div>
                  <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-stone-line pt-4 text-xs">
                    <div>
                      <dt className="text-ink-faint">Travellers</dt>
                      <dd className="mt-0.5 font-medium text-ink-soft">{trip.travelers}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Planned budget</dt>
                      <dd className="mt-0.5 font-medium text-ink-soft">{formatNpr(trip.budgetNpr)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Item estimates</dt>
                      <dd className="mt-0.5 font-medium text-ink-soft">{formatNpr(itemCosts)}</dd>
                    </div>
                    <div>
                      <dt className="text-ink-faint">Calendar length</dt>
                      <dd className="mt-0.5 font-medium text-ink-soft">{length ? `${length} days` : '—'}</dd>
                    </div>
                  </dl>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-forest-700">
                    Open itinerary <Icon name="arrowRight" className="h-3.5 w-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New trip"
        description="You can change all of this later."
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="new-trip-form" className="btn-primary" disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />}
              Create trip
            </button>
          </>
        }
      >
        <form id="new-trip-form" onSubmit={onCreate} className="space-y-4">
          <Field label="Trip name" htmlFor="trip-title" error={formError ?? undefined}>
            <input
              id="trip-title"
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Autumn in the Khumbu"
              required
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="trip-start">
              <input
                id="trip-start"
                type="date"
                className="input"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </Field>
            <Field label="End date" htmlFor="trip-end">
              <input
                id="trip-end"
                type="date"
                className="input"
                min={startDate || undefined}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Travellers" htmlFor="trip-travelers">
              <input
                id="trip-travelers"
                type="number"
                min={1}
                className="input"
                value={travelers}
                onChange={(event) => setTravelers(event.target.value)}
              />
            </Field>
            <Field label="Planned budget (NPR)" htmlFor="trip-budget" hint="Optional. Your own figure.">
              <input
                id="trip-budget"
                type="number"
                min={0}
                className="input"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                placeholder="e.g. 180000"
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="trip-notes">
            <textarea
              id="trip-notes"
              className="input min-h-24"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Flight buffer, permits, who is carrying the stove…"
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Detail                                                                     */
/* -------------------------------------------------------------------------- */

export function TripDetailPage() {
  const { tripId = '' } = useParams();
  const {
    trips,
    loading,
    error,
    isGuest,
    update,
    remove,
    addDay,
    updateDay,
    removeDay,
    addItem,
    removeItem,
  } = useTrips();
  const { push } = useToast();
  const navigate = useNavigate();

  const trip = trips.find((item) => item.id === tripId) ?? null;
  const [trailOptions, setTrailOptions] = useState<Trail[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dayOpen, setDayOpen] = useState(false);
  const [itemDay, setItemDay] = useState<TripDay | null>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editTravelers, setEditTravelers] = useState('1');
  const [editBudget, setEditBudget] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [dayTitle, setDayTitle] = useState('');
  const [dayDate, setDayDate] = useState('');

  const [itemTitle, setItemTitle] = useState('');
  const [itemTrailId, setItemTrailId] = useState('');
  const [itemTime, setItemTime] = useState('');
  const [itemCost, setItemCost] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [itemError, setItemError] = useState<string | null>(null);

  const [budgetInputs, setBudgetInputs] = useState<BudgetInputs>(DEFAULT_BUDGET_INPUTS);

  useEffect(() => {
    listAllTrails()
      .then(setTrailOptions)
      .catch(() => setTrailOptions([]));
  }, []);

  useEffect(() => {
    if (!trip) return;
    setEditTitle(trip.title);
    setEditStart(trip.startDate ?? '');
    setEditEnd(trip.endDate ?? '');
    setEditTravelers(String(trip.travelers));
    setEditBudget(trip.budgetNpr === null ? '' : String(trip.budgetNpr));
    setEditNotes(trip.notes ?? '');
    setBudgetInputs((current) => ({ ...current, travelers: trip.travelers, nights: Math.max(1, trip.days.length) }));
  }, [trip]);

  const itemCosts = useMemo(
    () => (trip ? sumItemCosts(trip.days.flatMap((day) => day.items.map((item) => item.estimatedCostNpr))) : 0),
    [trip],
  );
  const estimate = useMemo(() => calculateBudget(budgetInputs), [budgetInputs]);

  const onSaveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setSettingsError(null);
    if (!editTitle.trim()) return setSettingsError('A trip needs a name.');
    if (editStart && editEnd && editEnd < editStart) return setSettingsError('End date is before the start date.');
    setBusy(true);
    try {
      await update(tripId, {
        title: editTitle.trim(),
        startDate: editStart || null,
        endDate: editEnd || null,
        travelers: Math.max(1, Number(editTravelers) || 1),
        budgetNpr: editBudget === '' ? null : Number(editBudget),
        notes: editNotes.trim() || null,
      });
      setSettingsOpen(false);
      push('Trip updated.', 'success');
    } catch (err) {
      setSettingsError(describeError(err, 'Could not update the trip.'));
    } finally {
      setBusy(false);
    }
  };

  const onAddDay = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trip) return;
    setBusy(true);
    try {
      await addDay(trip, { title: dayTitle.trim() || 'New day', date: dayDate || null });
      setDayOpen(false);
      setDayTitle('');
      setDayDate('');
      push('Day added.', 'success');
    } catch (err) {
      push(describeError(err, 'Could not add the day.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const onAddItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trip || !itemDay) return;
    setItemError(null);
    if (!itemTitle.trim()) return setItemError('Give the item a title.');

    const selected = trailOptions.find((trail) => trail.id === itemTrailId);
    setBusy(true);
    try {
      await addItem(trip.id, itemDay.id, {
        title: itemTitle.trim(),
        trailId: selected?.id ?? null,
        startTime: itemTime || null,
        notes: itemNotes.trim() || null,
        estimatedCostNpr: itemCost === '' ? null : Number(itemCost),
      });
      setItemDay(null);
      setItemTitle('');
      setItemTrailId('');
      setItemTime('');
      setItemCost('');
      setItemNotes('');
      push('Added to the day.', 'success');
    } catch (err) {
      setItemError(describeError(err, 'Could not add the item.'));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!trip) return;
    if (!window.confirm(`Delete “${trip.title}”? This cannot be undone.`)) return;
    try {
      await remove(trip.id);
      push('Trip deleted.', 'success');
      navigate('/plan');
    } catch (err) {
      push(describeError(err, 'Could not delete the trip.'), 'error');
    }
  };

  if (loading) return <LoadingRow label="Loading trip" />;

  if (error) {
    return (
      <div className="container-page py-20">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="container-page py-20">
        <EmptyState
          icon="calendar"
          title="Trip not found"
          description="It may have been deleted, or it belongs to another account."
          action={
            <Link to="/plan" className="btn-primary">
              Back to your trips
            </Link>
          }
        />
      </div>
    );
  }

  const calendarLength = dayCount(trip.startDate, trip.endDate);

  return (
    <div className="container-page py-10">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-xs text-ink-faint">
        <Link to="/plan" className="hover:text-forest-700">
          Trip planner
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink-muted">{trip.title}</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="eyebrow">{formatDateRange(trip.startDate, trip.endDate)}</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">{trip.title}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {trip.travelers} {pluralize(trip.travelers, 'traveller')} · {trip.days.length}{' '}
            {pluralize(trip.days.length, 'planned day')}
            {calendarLength ? ` · ${calendarLength} calendar days` : ''}
            {isGuest && ' · saved on this device'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary btn-sm" onClick={() => setSettingsOpen(true)}>
            <Icon name="settings" className="h-4 w-4" /> Trip settings
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={() => setDayOpen(true)}>
            <Icon name="plus" className="h-4 w-4" /> Add day
          </button>
          <button type="button" className="btn-ghost btn-sm text-red-600 hover:bg-red-50" onClick={onDelete}>
            <Icon name="trash" className="h-4 w-4" /> Delete
          </button>
        </div>
      </header>

      {isGuest && (
        <Notice tone="info" className="mt-6" title="This plan lives in this browser">
          Sign in to keep it across devices. Guest trips are not uploaded anywhere.
        </Notice>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)] lg:gap-12">
        <div className="space-y-4">
          {trip.days.length === 0 && (
            <EmptyState
              icon="calendar"
              title="No days yet"
              description="Add a day, then attach trails, transfers or rest days to it."
              action={
                <button type="button" className="btn-primary" onClick={() => setDayOpen(true)}>
                  Add the first day
                </button>
              }
            />
          )}

          {trip.days.map((day) => (
            <section key={day.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-forest-600">
                    Day {day.dayNumber}
                    {day.date ? ` · ${formatDate(day.date)}` : ''}
                  </p>
                  <input
                    aria-label={`Title for day ${day.dayNumber}`}
                    className="mt-1 w-full max-w-md rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-lg font-semibold text-ink hover:border-stone-line focus:border-forest-300 focus:bg-white focus:outline-none"
                    defaultValue={day.title}
                    onBlur={async (event) => {
                      const value = event.target.value.trim();
                      if (!value || value === day.title) return;
                      try {
                        await updateDay(trip.id, day.id, { title: value });
                      } catch (err) {
                        push(describeError(err, 'Could not rename the day.'), 'error');
                      }
                    }}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setItemDay(day);
                      setItemError(null);
                    }}
                  >
                    <Icon name="plus" className="h-3.5 w-3.5" /> Add stop
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete day ${day.dayNumber}`}
                    className="rounded-full p-2 text-ink-faint hover:bg-red-50 hover:text-red-600"
                    onClick={async () => {
                      try {
                        await removeDay(trip.id, day.id);
                        push('Day removed.', 'success');
                      } catch (err) {
                        push(describeError(err, 'Could not remove the day.'), 'error');
                      }
                    }}
                  >
                    <Icon name="trash" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {day.items.length === 0 ? (
                <p className="mt-4 rounded-lg border border-dashed border-stone-line bg-stone-paper/50 px-4 py-3 text-sm text-ink-muted">
                  Nothing planned for this day yet.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {day.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-stone-line bg-mint/60 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          {item.startTime && <span className="mr-2 text-xs font-medium text-forest-700">{item.startTime}</span>}
                          {item.trailSlug ? (
                            <Link to={`/trails/${item.trailSlug}`} className="hover:underline">
                              {item.title}
                            </Link>
                          ) : (
                            item.title
                          )}
                        </p>
                        {item.notes && <p className="mt-1 text-xs leading-relaxed text-ink-muted">{item.notes}</p>}
                        {item.estimatedCostNpr !== null && (
                          <p className="mt-1 text-xs font-medium text-forest-700">
                            Est. {formatNpr(item.estimatedCostNpr)}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${item.title}`}
                        className="rounded-full p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600"
                        onClick={async () => {
                          try {
                            await removeItem(trip.id, day.id, item.id);
                          } catch (err) {
                            push(describeError(err, 'Could not remove the item.'), 'error');
                          }
                        }}
                      >
                        <Icon name="close" className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
          <div className="card p-6">
            <h2 className="text-lg">Budget</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-muted">Planned budget</dt>
                <dd className="font-semibold text-ink">{formatNpr(trip.budgetNpr)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-muted">Item estimates</dt>
                <dd className="font-semibold text-ink">{formatNpr(itemCosts)}</dd>
              </div>
              {trip.budgetNpr !== null && (
                <div className="flex items-center justify-between border-t border-stone-line pt-3">
                  <dt className="text-ink-muted">Remaining</dt>
                  <dd className={cx('font-semibold', trip.budgetNpr - itemCosts < 0 ? 'text-red-600' : 'text-forest-700')}>
                    {formatNpr(trip.budgetNpr - itemCosts)}
                  </dd>
                </div>
              )}
              {trip.budgetNpr !== null && (
                <div className="flex items-center justify-between text-xs text-ink-faint">
                  <dt>Per person</dt>
                  <dd>{formatNpr(trip.budgetNpr / trip.travelers)}</dd>
                </div>
              )}
            </dl>
            <button type="button" className="btn-secondary btn-sm mt-4 w-full" onClick={() => setBudgetOpen(true)}>
              Build an estimate
            </button>
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              Estimates use the numbers you enter. We do not apply an invented “average daily cost”.
            </p>
          </div>

          {trip.notes && (
            <div className="card p-6">
              <h2 className="text-lg">Notes</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-muted">{trip.notes}</p>
            </div>
          )}

          <div className="card p-6">
            <h2 className="text-lg">Trails to add</h2>
            <p className="mt-1.5 text-xs text-ink-muted">Open a trail and use “Add to a trip”, or add a free-text stop.</p>
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              {trailOptions.slice(0, 8).map((trail) => (
                <Link
                  key={trail.id}
                  to={`/trails/${trail.slug}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-stone-line px-3 py-2 text-xs hover:border-forest-300"
                >
                  <span className="truncate font-medium text-ink-soft">{trail.name}</span>
                  <Icon name="arrowRight" className="h-3.5 w-3.5 shrink-0 text-forest" />
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Settings modal */}
      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Trip settings"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setSettingsOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="trip-settings-form" className="btn-primary" disabled={busy}>
              {busy && <Spinner className="h-4 w-4" />} Save changes
            </button>
          </>
        }
      >
        <form id="trip-settings-form" onSubmit={onSaveSettings} className="space-y-4">
          <Field label="Trip name" htmlFor="edit-title" error={settingsError ?? undefined}>
            <input id="edit-title" className="input" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start date" htmlFor="edit-start">
              <input id="edit-start" type="date" className="input" value={editStart} onChange={(event) => setEditStart(event.target.value)} />
            </Field>
            <Field label="End date" htmlFor="edit-end">
              <input
                id="edit-end"
                type="date"
                className="input"
                min={editStart || undefined}
                value={editEnd}
                onChange={(event) => setEditEnd(event.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Travellers" htmlFor="edit-travelers">
              <input
                id="edit-travelers"
                type="number"
                min={1}
                className="input"
                value={editTravelers}
                onChange={(event) => setEditTravelers(event.target.value)}
              />
            </Field>
            <Field label="Planned budget (NPR)" htmlFor="edit-budget">
              <input
                id="edit-budget"
                type="number"
                min={0}
                className="input"
                value={editBudget}
                onChange={(event) => setEditBudget(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="edit-notes">
            <textarea id="edit-notes" className="input min-h-24" value={editNotes} onChange={(event) => setEditNotes(event.target.value)} />
          </Field>
        </form>
      </Modal>

      {/* Add day modal */}
      <Modal
        open={dayOpen}
        onClose={() => setDayOpen(false)}
        title="Add a day"
        size="sm"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setDayOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="add-day-form" className="btn-primary" disabled={busy}>
              Add day
            </button>
          </>
        }
      >
        <form id="add-day-form" onSubmit={onAddDay} className="space-y-4">
          <Field label="Day title" htmlFor="day-title" hint="e.g. Lukla to Phakding">
            <input id="day-title" className="input" value={dayTitle} onChange={(event) => setDayTitle(event.target.value)} autoFocus />
          </Field>
          <Field label="Date (optional)" htmlFor="day-date">
            <input id="day-date" type="date" className="input" value={dayDate} onChange={(event) => setDayDate(event.target.value)} />
          </Field>
        </form>
      </Modal>

      {/* Add item modal */}
      <Modal
        open={itemDay !== null}
        onClose={() => setItemDay(null)}
        title={itemDay ? `Add to day ${itemDay.dayNumber}` : 'Add a stop'}
        description="Attach a saved route or describe any other stop."
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setItemDay(null)}>
              Cancel
            </button>
            <button type="submit" form="add-item-form" className="btn-primary" disabled={busy}>
              Add stop
            </button>
          </>
        }
      >
        <form id="add-item-form" onSubmit={onAddItem} className="space-y-4">
          <Field label="Stop title" htmlFor="item-title" error={itemError ?? undefined}>
            <input
              id="item-title"
              className="input"
              value={itemTitle}
              onChange={(event) => setItemTitle(event.target.value)}
              placeholder="Trek to Namche Bazaar"
              required
            />
          </Field>
          <Field label="Link a trail (optional)" htmlFor="item-trail" hint="Selecting a trail auto-fills the title if empty.">
            <select
              id="item-trail"
              className="input"
              value={itemTrailId}
              onChange={(event) => {
                const value = event.target.value;
                setItemTrailId(value);
                const match = trailOptions.find((trail) => trail.id === value);
                if (match && !itemTitle.trim()) setItemTitle(match.name);
              }}
            >
              <option value="">No trail</option>
              {trailOptions.map((trail) => (
                <option key={trail.id} value={trail.id}>
                  {trail.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start time (optional)" htmlFor="item-time">
              <input id="item-time" type="time" className="input" value={itemTime} onChange={(event) => setItemTime(event.target.value)} />
            </Field>
            <Field label="Estimated cost (NPR)" htmlFor="item-cost">
              <input
                id="item-cost"
                type="number"
                min={0}
                className="input"
                value={itemCost}
                onChange={(event) => setItemCost(event.target.value)}
                placeholder="e.g. 2500"
              />
            </Field>
          </div>
          <Field label="Notes" htmlFor="item-notes">
            <textarea id="item-notes" className="input min-h-20" value={itemNotes} onChange={(event) => setItemNotes(event.target.value)} />
          </Field>
        </form>
      </Modal>

      {/* Budget builder */}
      <Modal
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        title="Build an estimate"
        description="Every figure comes from you. Apply the total to this trip's planned budget."
        size="lg"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setBudgetOpen(false)}>
              Close
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                try {
                  await update(trip.id, { budgetNpr: estimate.total });
                  setBudgetOpen(false);
                  push('Budget applied to the trip.', 'success');
                } catch (err) {
                  push(describeError(err, 'Could not update the budget.'), 'error');
                }
              }}
            >
              Use {formatNpr(estimate.total)}
            </button>
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            {(
              [
                ['travellers', 'Travellers', budgetInputs.travelers, (value: number) => ({ travelers: value })],
                ['nights', 'Nights', budgetInputs.nights, (value: number) => ({ nights: value })],
                ['lodging', 'Lodging / night', budgetInputs.lodgingPerNightNpr, (value: number) => ({ lodgingPerNightNpr: value })],
                ['food', 'Food / person / day', budgetInputs.foodPerDayNpr, (value: number) => ({ foodPerDayNpr: value })],
                ['transport', 'Transport / person', budgetInputs.transportNpr, (value: number) => ({ transportNpr: value })],
                ['permits', 'Permits / person', budgetInputs.permitsNpr, (value: number) => ({ permitsNpr: value })],
                ['guide', 'Guide / day', budgetInputs.guidePerDayNpr, (value: number) => ({ guidePerDayNpr: value })],
                ['contingency', 'Contingency %', budgetInputs.contingencyPercent, (value: number) => ({ contingencyPercent: value })],
              ] as [string, string, number, (value: number) => Partial<BudgetInputs>][]
            ).map(([key, label, value, patch]) => (
              <label key={key} className="block">
                <span className="label">{label}</span>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={value}
                  onChange={(event) =>
                    setBudgetInputs((current) => ({ ...current, ...patch(Number(event.target.value) || 0) }))
                  }
                />
              </label>
            ))}
          </div>
          <div className="rounded-xl bg-forest-50/70 p-5">
            <h3 className="text-base font-semibold text-forest-900">Breakdown</h3>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                ['Lodging', estimate.lodging],
                ['Food', estimate.food],
                ['Transport', estimate.transport],
                ['Permits', estimate.permits],
                ['Guide', estimate.guide],
                ['Contingency', estimate.contingency],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex justify-between">
                  <dt className="text-ink-muted">{label}</dt>
                  <dd className="font-medium text-ink">{formatNpr(Number(value))}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 border-t border-forest-200 pt-4">
              <div className="flex items-baseline justify-between">
                <dt className="text-sm font-semibold text-forest-900">Total</dt>
                <dd className="font-display text-2xl text-forest-900">{formatNpr(estimate.total)}</dd>
              </div>
              <p className="mt-1 text-xs text-forest-800/80">
                {formatNpr(estimate.perPerson)} per person · {formatNpr(estimate.perDay)} per person per day
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
