import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useSavedTrails } from '@/saved/SavedTrailsProvider';
import { createCollection, deleteCollection, updateSavedTrail } from '@/data/user';
import { DIFFICULTY_LABELS, difficultyTone, formatDistance, formatDuration } from '@/lib/format';
import { describeError } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { Icon } from '@/components/Icons';
import { EmptyState, ErrorState, Field, Modal, Notice, PageIntro, Spinner } from '@/components/ui';
import { cx } from '@/lib/cx';

export default function SavedTrailsPage() {
  const { user, configured } = useAuth();
  const { saved, collections, loading, error, refresh, refreshCollections, remove } = useSavedTrails();
  const { push } = useToast();

  const [collectionFilter, setCollectionFilter] = useState<string>('all');
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [noteTarget, setNoteTarget] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const visible = useMemo(() => {
    if (collectionFilter === 'all') return saved;
    if (collectionFilter === 'unfiled') return saved.filter((item) => !item.collectionId);
    return saved.filter((item) => item.collectionId === collectionFilter);
  }, [collectionFilter, saved]);

  const onCreateCollection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (!collectionName.trim()) return setCollectionError('Give the collection a name.');
    setBusy(true);
    setCollectionError(null);
    try {
      await createCollection(user.id, collectionName.trim());
      await refreshCollections();
      setCollectionOpen(false);
      setCollectionName('');
      push('Collection created.', 'success');
    } catch (err) {
      setCollectionError(describeError(err, 'Could not create the collection.'));
    } finally {
      setBusy(false);
    }
  };

  const assignCollection = async (trailId: string, collectionId: string) => {
    if (!user) return;
    try {
      await updateSavedTrail(user.id, trailId, { collectionId: collectionId || null });
      await refresh();
      push('Collection updated.', 'success');
    } catch (err) {
      push(describeError(err, 'Could not update the collection.'), 'error');
    }
  };

  const removeCollection = async (collectionId: string) => {
    if (!user) return;
    if (!window.confirm('Delete this collection? Saved trails stay in your list and become unfiled.')) return;
    try {
      await deleteCollection(user.id, collectionId);
      await Promise.all([refreshCollections(), refresh()]);
      setCollectionFilter('all');
      push('Collection deleted.', 'success');
    } catch (err) {
      push(describeError(err, 'Could not delete the collection.'), 'error');
    }
  };

  const saveNote = async () => {
    if (!user || !noteTarget) return;
    setBusy(true);
    try {
      await updateSavedTrail(user.id, noteTarget, { note: noteDraft.trim() || null });
      await refresh();
      setNoteTarget(null);
      setNoteDraft('');
      push('Note saved.', 'success');
    } catch (err) {
      push(describeError(err, 'Could not save the note.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageIntro
        eyebrow="Your library"
        title="Saved trails"
        description="A shortlist with your own notes. Signed-in saves sync to your account; guest saves stay on this device."
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="badge">{saved.length} saved</span>
          {user && (
            <button type="button" className="btn-secondary btn-sm" onClick={() => setCollectionOpen(true)}>
              <Icon name="plus" className="h-4 w-4" /> New collection
            </button>
          )}
          {!configured && <span className="badge bg-gold/20 text-[#7a5207]">Device only</span>}
        </div>
      </PageIntro>

      <div className="container-page py-10">
        {!user && (
          <Notice tone="info" className="mb-6" title="Saving without an account">
            These saves live in this browser. Sign in to keep them across devices, add notes to the server copy and
            organise them into collections.{' '}
            <Link to="/login?next=/saved" className="font-semibold underline">
              Sign in
            </Link>
          </Notice>
        )}

        {error && <ErrorState message={error} onRetry={() => void refresh()} />}
        {loading && (
          <p className="flex items-center gap-2 py-10 text-sm text-ink-muted">
            <Spinner className="h-4 w-4 text-forest" /> Loading saved trails…
          </p>
        )}

        {!loading && saved.length === 0 && (
          <EmptyState
            icon="heart"
            title="Nothing saved yet"
            description="Use the heart on any trail to keep it here. Your notes and collections stay private to your account."
            action={
              <Link to="/explore" className="btn-primary">
                Find a trail
              </Link>
            }
          />
        )}

        {saved.length > 0 && (
          <>
            {user && collections.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={cx('chip', collectionFilter === 'all' && 'chip-active')}
                  onClick={() => setCollectionFilter('all')}
                >
                  All saved
                </button>
                <button
                  type="button"
                  className={cx('chip', collectionFilter === 'unfiled' && 'chip-active')}
                  onClick={() => setCollectionFilter('unfiled')}
                >
                  Unfiled
                </button>
                {collections.map((collection) => (
                  <span key={collection.id} className="inline-flex items-center">
                    <button
                      type="button"
                      className={cx('chip', collectionFilter === collection.id && 'chip-active')}
                      onClick={() => setCollectionFilter(collection.id)}
                    >
                      {collection.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete collection ${collection.name}`}
                      className="ml-1 rounded-full p-1 text-ink-faint hover:bg-red-50 hover:text-red-600"
                      onClick={() => void removeCollection(collection.id)}
                    >
                      <Icon name="trash" className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {visible.length === 0 ? (
              <EmptyState
                icon="layers"
                title="Nothing in this collection"
                description="Assign a saved trail to this collection from its card."
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((item) => (
                  <article key={item.trailId} className="card overflow-hidden">
                    <Link to={`/trails/${item.slug}`} className="block overflow-hidden">
                      <img
                        src={item.heroImage}
                        alt={item.name}
                        loading="lazy"
                        className="aspect-[16/10] w-full object-cover transition duration-500 hover:scale-[1.03]"
                      />
                    </Link>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-forest-600">
                            {item.region}
                          </p>
                          <h2 className="mt-1 text-lg leading-snug">
                            <Link to={`/trails/${item.slug}`} className="hover:text-forest-700">
                              {item.name}
                            </Link>
                          </h2>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remove ${item.name} from saved trails`}
                          className="rounded-full p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600"
                          onClick={async () => {
                            const result = await remove(item.trailId);
                            if (result.error) push(result.error, 'error');
                            else push('Removed from saved trails.', 'success');
                          }}
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                        <span className={cx('rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ring-1', difficultyTone(item.difficulty))}>
                          {DIFFICULTY_LABELS[item.difficulty]}
                        </span>
                        <span>{formatDistance(item.distanceKm)}</span>
                        <span>{formatDuration(item.durationDays)}</span>
                      </div>

                      {item.note && (
                        <p className="mt-3 rounded-lg bg-stone-paper px-3 py-2 text-xs leading-relaxed text-ink-soft">
                          {item.note}
                        </p>
                      )}

                      {user && (
                        <div className="mt-4 space-y-2 border-t border-stone-line pt-3">
                          <label className="sr-only" htmlFor={`collection-${item.trailId}`}>
                            Collection for {item.name}
                          </label>
                          <select
                            id={`collection-${item.trailId}`}
                            className="input py-1.5 text-xs"
                            value={item.collectionId ?? ''}
                            onChange={(event) => void assignCollection(item.trailId, event.target.value)}
                          >
                            <option value="">Unfiled</option>
                            {collections.map((collection) => (
                              <option key={collection.id} value={collection.id}>
                                {collection.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="text-xs font-semibold text-forest-700 hover:underline"
                            onClick={() => {
                              setNoteTarget(item.trailId);
                              setNoteDraft(item.note ?? '');
                            }}
                          >
                            {item.note ? 'Edit note' : 'Add a note'}
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={collectionOpen}
        onClose={() => setCollectionOpen(false)}
        title="New collection"
        description="Group saved trails by season, region or who you are going with."
        size="sm"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setCollectionOpen(false)}>
              Cancel
            </button>
            <button type="submit" form="collection-form" className="btn-primary" disabled={busy}>
              {busy && <Spinner className="h-4 w-4" />} Create
            </button>
          </>
        }
      >
        <form id="collection-form" onSubmit={onCreateCollection}>
          <Field label="Collection name" htmlFor="collection-name" error={collectionError ?? undefined}>
            <input
              id="collection-name"
              className="input"
              value={collectionName}
              onChange={(event) => setCollectionName(event.target.value)}
              placeholder="Autumn 2027 shortlist"
              autoFocus
              required
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={noteTarget !== null}
        onClose={() => setNoteTarget(null)}
        title="Trail note"
        description="Only visible to you."
        size="sm"
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setNoteTarget(null)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={() => void saveNote()} disabled={busy}>
              Save note
            </button>
          </>
        }
      >
        <Field label="Note" htmlFor="saved-note">
          <textarea
            id="saved-note"
            className="input min-h-28"
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Needs two spare days for the Lukla flight…"
          />
        </Field>
      </Modal>
    </div>
  );
}
