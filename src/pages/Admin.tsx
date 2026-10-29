import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/auth/AuthProvider';
import {
  ADMIN_ENTITIES,
  adminCounts,
  adminDelete,
  adminList,
  adminSave,
  fromFormValue,
  toFormValue,
  type AdminCounts,
  type AdminEntity,
  type AdminRow,
} from '@/data/admin';
import { describeError } from '@/lib/supabase';
import { formatDate } from '@/lib/format';
import { useToast } from '@/components/Toast';
import { Icon } from '@/components/Icons';
import { ErrorState, Field, Modal, Notice, Spinner } from '@/components/ui';
import { cx } from '@/lib/cx';

const TAB_ORDER: AdminEntity[] = [
  'trails',
  'destinations',
  'guides',
  'stays',
  'trail_reviews',
  'inquiries',
  'contact_messages',
];

function rowTitle(entity: AdminEntity, row: AdminRow): string {
  const config = ADMIN_ENTITIES[entity];
  const value = row[config.primaryLabel];
  if (typeof value === 'string' && value.trim()) return value;
  if (entity === 'contact_messages') return String(row.email ?? 'Message');
  if (entity === 'inquiries') return String(row.name ?? 'Inquiry');
  if (entity === 'trail_reviews') return 'Untitled review';
  return String(row.id ?? 'Untitled');
}

function rowSummary(entity: AdminEntity, row: AdminRow): string {
  switch (entity) {
    case 'trails':
      return [row.region, row.difficulty, row.duration_days ? `${row.duration_days} days` : null]
        .filter(Boolean)
        .join(' · ');
    case 'destinations':
      return String(row.region ?? '');
    case 'guides':
      return [row.region, Array.isArray(row.languages) ? row.languages.join(', ') : null].filter(Boolean).join(' · ');
    case 'stays':
      return [row.type, row.region].filter(Boolean).join(' · ');
    case 'trail_reviews':
      return `${row.rating ?? '?'} / 5 · ${row.status ?? 'pending'}`;
    case 'inquiries':
      return `${row.subject_type ?? ''} · ${row.status ?? 'new'} · ${row.email ?? ''}`;
    case 'contact_messages':
      return `${row.topic ?? ''} · ${row.email ?? ''}`;
    default:
      return '';
  }
}

const statusColor = (value: unknown) => {
  const text = String(value ?? '');
  if (['published', 'approved', 'read', 'true'].includes(text)) return 'bg-forest-50 text-forest-700';
  if (['rejected', 'closed'].includes(text)) return 'bg-red-50 text-red-700';
  return 'bg-gold/20 text-[#7a5207]';
};

export default function AdminPage() {
  const { user, profile } = useAuth();
  const { push } = useToast();

  const [entity, setEntity] = useState<AdminEntity>('trails');
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [counts, setCounts] = useState<AdminCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState<AdminRow | null>(null);

  const config = ADMIN_ENTITIES[entity];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, countData] = await Promise.all([adminList(entity), adminCounts()]);
      setRows(list);
      setCounts(countData);
    } catch (err) {
      setError(describeError(err, 'Could not load admin data.'));
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    const initial: Record<string, string | boolean> = {};
    for (const field of config.fields) {
      if (field.type === 'checkbox') {
        initial[field.name] = field.name === 'published';
      } else if (field.type === 'select') {
        initial[field.name] = field.options?.[0]?.value ?? '';
      } else {
        initial[field.name] = '';
      }
    }
    setValues(initial);
    setFormErrors({});
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (row: AdminRow) => {
    const initial: Record<string, string | boolean> = {};
    for (const field of config.fields) {
      initial[field.name] = toFormValue(field, row[field.name]);
    }
    setValues(initial);
    setFormErrors({});
    setEditingId(String(row.id));
    setFormOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const errors: Record<string, string> = {};
    const payload: Record<string, unknown> = {};

    for (const field of config.fields) {
      const raw = values[field.name] ?? (field.type === 'checkbox' ? false : '');
      try {
        const converted = fromFormValue(field, raw);
        if (field.required && (converted === null || converted === '' || converted === undefined)) {
          errors[field.name] = `${field.label} is required.`;
        }
        payload[field.name] = converted;
      } catch {
        errors[field.name] = 'Invalid JSON — check the brackets and quotes.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    try {
      await adminSave(entity, payload, editingId, user.id);
      push(editingId ? 'Record updated.' : 'Record created.', 'success');
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormErrors({ _form: describeError(err, 'Could not save this record.') });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: AdminRow) => {
    const title = rowTitle(entity, row);
    if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) return;
    try {
      await adminDelete(entity, String(row.id));
      push('Record deleted.', 'success');
      await load();
    } catch (err) {
      push(describeError(err, 'Could not delete this record.'), 'error');
    }
  };

  const countCards = [
    { label: 'Trails', value: counts?.trails },
    { label: 'Destinations', value: counts?.destinations },
    { label: 'Guides', value: counts?.guides },
    { label: 'Stays', value: counts?.stays },
    { label: 'Pending reviews', value: counts?.pendingReviews },
    { label: 'Inquiries', value: counts?.inquiries },
  ];

  return (
    <div className="container-page py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Staff only</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Admin dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Signed in as {profile?.fullName || user?.email}. Every write goes through Row Level Security: the admin
            policy checks your role in the database, not just this page.
          </p>
        </div>
        {!config.readOnly && (
          <button type="button" className="btn-primary" onClick={openCreate}>
            <Icon name="plus" className="h-4 w-4" /> New {config.label.replace(/s$/, '').toLowerCase()}
          </button>
        )}
      </header>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {countCards.map((card) => (
          <div key={card.label} className="card px-4 py-3.5">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">{card.label}</p>
            <p className="mt-1 font-display text-2xl">{card.value ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-1.5 overflow-x-auto pb-2 no-scrollbar" role="tablist" aria-label="Admin sections">
        {TAB_ORDER.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={entity === tab}
            onClick={() => setEntity(tab)}
            className={cx(
              'whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-medium transition',
              entity === tab ? 'bg-forest text-white' : 'bg-white text-ink-soft ring-1 ring-stone-line hover:bg-forest-50',
            )}
          >
            {ADMIN_ENTITIES[tab].label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">{config.description}</p>
        <button type="button" className="btn-ghost btn-sm" onClick={() => void load()}>
          <Icon name="refresh" className="h-4 w-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mt-5">
          <ErrorState message={error} onRetry={load} />
        </div>
      )}

      {loading ? (
        <p className="flex items-center gap-2 py-10 text-sm text-ink-muted">
          <Spinner className="h-4 w-4 text-forest" /> Loading {config.label.toLowerCase()}…
        </p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-stone-line bg-white shadow-soft">
          {rows.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-ink-muted">
              No records yet. {config.readOnly ? '' : 'Use the button above to create the first one.'}
            </div>
          ) : (
            <ul className="divide-y divide-stone-line">
              {rows.map((row) => {
                const id = String(row.id);
                const published = row.published;
                return (
                  <li key={id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{rowTitle(entity, row)}</p>
                        {entity === 'trails' && row.featured === true && (
                          <span className="badge bg-gold/20 text-[#7a5207]">Featured</span>
                        )}
                        {entity === 'trails' && row.is_sample === true && <span className="badge">Sample</span>}
                        {typeof published === 'boolean' && (
                          <span className={cx('rounded-full px-2 py-0.5 text-[0.65rem] font-semibold', published ? 'bg-forest-50 text-forest-700' : 'bg-stone-paper text-ink-muted')}>
                            {published ? 'Published' : 'Draft'}
                          </span>
                        )}
                        {entity === 'trail_reviews' && (
                          <span className={cx('rounded-full px-2 py-0.5 text-[0.65rem] font-semibold', statusColor(row.status))}>
                            {String(row.status)}
                          </span>
                        )}
                        {entity === 'inquiries' && (
                          <span className={cx('rounded-full px-2 py-0.5 text-[0.65rem] font-semibold', statusColor(row.status))}>
                            {String(row.status ?? 'new')}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">{rowSummary(entity, row)}</p>
                      {row.created_at ? (
                        <p className="mt-0.5 text-[0.65rem] text-ink-faint">Created {formatDate(String(row.created_at))}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {entity === 'contact_messages' || entity === 'inquiries' ? (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => setViewRow(row)}>
                          View
                        </button>
                      ) : null}
                      {config.fields.length > 0 && (
                        <button type="button" className="btn-secondary btn-sm" onClick={() => openEdit(row)}>
                          <Icon name="edit" className="h-3.5 w-3.5" /> Edit
                        </button>
                      )}
                      {!config.readOnly && (
                        <button
                          type="button"
                          aria-label={`Delete ${rowTitle(entity, row)}`}
                          className="rounded-full p-2 text-ink-faint hover:bg-red-50 hover:text-red-600"
                          onClick={() => void remove(row)}
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <Notice tone="neutral" className="mt-6">
        Showing the 200 most recent records. Deletions cascade to dependent rows where the schema defines it — for
        example, deleting a trail removes its saves and trip links.
      </Notice>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingId ? `Edit ${config.label.replace(/s$/, '').toLowerCase()}` : `New ${config.label.replace(/s$/, '').toLowerCase()}`}
        size="lg"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="admin-form" className="btn-primary" disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />} Save
            </button>
          </>
        }
      >
        <form id="admin-form" onSubmit={submit} className="space-y-4">
          {formErrors._form && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {formErrors._form}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {config.fields.map((field) => {
              const id = `admin-${field.name}`;
              const value = values[field.name] ?? '';
              const error = formErrors[field.name];
              const wrapperClass = field.wide || field.type === 'textarea' || field.type === 'json' ? 'sm:col-span-2' : '';
              return (
                <div key={field.name} className={wrapperClass}>
                  {field.type === 'checkbox' ? (
                    <label className="flex items-start gap-2.5 rounded-lg border border-stone-line px-3 py-2.5 text-sm">
                      <input
                        id={id}
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-stone-line text-forest focus:ring-forest"
                        checked={Boolean(value)}
                        onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.checked }))}
                      />
                      <span>
                        <span className="font-medium text-ink">{field.label}</span>
                        {field.help && <span className="mt-0.5 block text-xs text-ink-faint">{field.help}</span>}
                      </span>
                    </label>
                  ) : (
                    <Field label={field.label + (field.required ? ' *' : '')} htmlFor={id} hint={field.help} error={error}>
                      {field.type === 'textarea' || field.type === 'json' ? (
                        <textarea
                          id={id}
                          className={cx('input', field.type === 'json' && 'font-mono text-xs', field.type === 'textarea' ? 'min-h-24' : 'min-h-40')}
                          value={String(value)}
                          onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                          spellCheck={field.type !== 'json'}
                        />
                      ) : field.type === 'select' ? (
                        <select
                          id={id}
                          className="input"
                          value={String(value)}
                          onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                        >
                          {field.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={id}
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          className="input"
                          value={String(value)}
                          onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
                        />
                      )}
                    </Field>
                  )}
                </div>
              );
            })}
          </div>
        </form>
      </Modal>

      <Modal
        open={viewRow !== null}
        onClose={() => setViewRow(null)}
        title="Record detail"
        size="lg"
        footer={
          <button type="button" className="btn-secondary" onClick={() => setViewRow(null)}>
            Close
          </button>
        }
      >
        {viewRow && (
          <dl className="space-y-3">
            {Object.entries(viewRow)
              .filter(([, value]) => value !== null && value !== undefined && value !== '')
              .map(([key, value]) => (
                <div key={key} className="grid grid-cols-[9rem_1fr] gap-3 border-b border-stone-line pb-2 text-sm last:border-0">
                  <dt className="font-medium text-ink-faint">{key}</dt>
                  <dd className="break-words text-ink-soft">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </dd>
                </div>
              ))}
          </dl>
        )}
      </Modal>
    </div>
  );
}
