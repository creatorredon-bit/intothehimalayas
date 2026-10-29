import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/Toast';
import {
  COMMUNITY_CATEGORIES,
  COMMUNITY_CATEGORY_LABELS,
  createCommunityPost,
  deleteCommunityPost,
  isCommunityCategory,
  listCommunityPosts,
} from '@/data/community';
import { formatDate } from '@/lib/format';
import { describeError } from '@/lib/supabase';
import { Icon } from '@/components/Icons';
import { cx } from '@/lib/cx';
import {
  EmptyState,
  ErrorState,
  Field,
  LoadingRow,
  Modal,
  Notice,
  PageIntro,
} from '@/components/ui';
import type { CommunityCategory, CommunityPost } from '@/lib/types';

const categoryTone: Record<CommunityCategory, string> = {
  announcement: 'bg-forest-50 text-forest-700',
  trail_update: 'bg-sky/15 text-[#1d6d87]',
  safety: 'bg-red-50 text-red-700',
  event: 'bg-gold/20 text-[#7a5207]',
};

const roleLabel = (role: CommunityPost['authorRole']) => (role === 'admin' ? 'Admin' : 'Moderator');

export default function CommunityPage() {
  const { user, profile, configured, isStaff, profileLoading } = useAuth();
  const { push } = useToast();

  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<'all' | CommunityCategory>('all');

  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [postCategory, setPostCategory] = useState<CommunityCategory>('announcement');
  const [pinned, setPinned] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await listCommunityPosts());
    } catch (err) {
      setError(describeError(err, 'Could not load the community board.'));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = category === 'all' ? posts : posts.filter((post) => post.category === category);
  const hasSamples = posts.some((post) => post.isSample);

  const canDelete = (post: CommunityPost) =>
    Boolean(user) && (profile?.role === 'admin' || post.authorId === user?.id) && !post.isSample;

  const openComposer = () => {
    setTitle('');
    setBody('');
    setPostCategory('announcement');
    setPinned(false);
    setFormError(null);
    setComposerOpen(true);
  };

  const onPublish = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!user || !profile || !isStaff) {
      setFormError('Only administrators and moderators can publish announcements.');
      return;
    }
    if (title.trim().length < 4) return setFormError('Give the announcement a title of at least 4 characters.');
    if (body.trim().length < 20) return setFormError('Write at least a couple of sentences.');

    setSaving(true);
    try {
      await createCommunityPost(
        {
          id: user.id,
          name: profile.fullName || 'Site team',
          role: profile.role === 'admin' ? 'admin' : 'moderator',
        },
        {
          title: title.trim(),
          body: body.trim(),
          category: postCategory,
          pinned,
        },
      );
      push('Announcement published.', 'success');
      setComposerOpen(false);
      await load();
    } catch (err) {
      setFormError(describeError(err, 'Could not publish the announcement.'));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (post: CommunityPost) => {
    setRemovingId(post.id);
    try {
      await deleteCommunityPost(post.id);
      setPosts((prev) => prev.filter((item) => item.id !== post.id));
      push('Announcement removed.', 'success');
    } catch (err) {
      push(describeError(err, 'Could not remove the announcement.'), 'error');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div>
      <PageIntro
        eyebrow="Community"
        title="Notes from the trail crew"
        description="Route and access updates, safety reminders and trip notices, published by the site's administrators and moderators. Everything here is readable by anyone."
      >
        <div className="flex flex-wrap items-center gap-3">
          {isStaff && (
            <button type="button" className="btn-primary" onClick={openComposer}>
              <Icon name="edit" className="h-4 w-4" />
              New announcement
            </button>
          )}
          {user && !isStaff && !profileLoading && (
            <span className="text-xs text-ink-muted">
              Posting is limited to administrators and moderators. {configured ? '' : 'Accounts are not connected in this build.'}
            </span>
          )}
          {!user && configured && (
            <Link to="/login?next=/community" className="text-xs font-semibold text-forest-700 hover:underline">
              Sign in as staff to post
            </Link>
          )}
        </div>
      </PageIntro>

      <div className="container-page py-10">
        {!configured && (
          <Notice tone="warning" className="mb-6" title="Sample community board">
            Accounts and the database are not configured in this build, so these are sample announcements included
            with the project. Connect Supabase and run the migrations to publish real ones; posting stays restricted to
            administrators and moderators by row-level security.
          </Notice>
        )}

        <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Filter announcements by category">
          <button
            type="button"
            className={cx('chip', category === 'all' && 'chip-active')}
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
          >
            All posts
          </button>
          {COMMUNITY_CATEGORIES.map((value) => (
            <button
              key={value}
              type="button"
              className={cx('chip', category === value && 'chip-active')}
              aria-pressed={category === value}
              onClick={() => setCategory(value)}
            >
              {COMMUNITY_CATEGORY_LABELS[value]}
            </button>
          ))}
        </div>

        {error && <ErrorState message={error} onRetry={() => void load()} />}
        {loading && <LoadingRow label="Loading the board" />}

        {!loading && !error && visible.length === 0 && (
          <EmptyState
            icon="book"
            title={category === 'all' ? 'No announcements yet' : `No ${COMMUNITY_CATEGORY_LABELS[category].toLowerCase()} posts yet`}
            description="When the team has something verified to share, it appears here."
            action={
              category !== 'all' ? (
                <button type="button" className="btn-secondary" onClick={() => setCategory('all')}>
                  Show all posts
                </button>
              ) : undefined
            }
          />
        )}

        {!loading && visible.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
            <div className="space-y-5">
              {visible.map((post) => (
                <article key={post.id} className="card p-6 sm:p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cx('rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em]', categoryTone[post.category])}>
                      {COMMUNITY_CATEGORY_LABELS[post.category]}
                    </span>
                    {post.pinned && (
                      <span className="badge bg-gold/20 text-[#7a5207]">
                        <Icon name="star" className="h-3 w-3" /> Pinned
                      </span>
                    )}
                    {post.isSample && <span className="badge bg-stone-paper text-ink-muted">Sample announcement</span>}
                  </div>

                  <h2 className="mt-3 text-2xl leading-snug">{post.title}</h2>
                  <p className="mt-1.5 text-xs text-ink-faint">
                    {post.authorName} · {roleLabel(post.authorRole)} · {formatDate(post.createdAt)}
                  </p>
                  <div className="mt-4 space-y-3 text-[0.95rem] leading-7 text-ink-soft">
                    {post.body.split(/\n{2,}/).map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>

                  {canDelete(post) && (
                    <div className="mt-5 flex justify-end border-t border-stone-line pt-4">
                      <button
                        type="button"
                        className="btn-ghost btn-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => void onDelete(post)}
                        disabled={removingId === post.id}
                      >
                        <Icon name="trash" className="h-4 w-4" />
                        {removingId === post.id ? 'Removing…' : 'Remove post'}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>

            <aside className="space-y-5">
              <section className="card p-6">
                <h2 className="text-lg">Who writes here</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  Administrators and moderators publish to this board. Anyone can read it, signed in or not. There are no
                  member-authored posts, so nothing here is an unverified crowd report.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-ink-faint">
                  Roles are checked by the database on every insert and update — hiding a button is not the security
                  boundary.
                </p>
              </section>

              <section className="card p-6">
                <h2 className="text-lg">Before you rely on a post</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                  Check the date. Conditions, permits and teahouse openings change with the season. A post is not a
                  substitute for asking a local guide or the relevant park office.
                </p>
                <Link to="/help#permits" className="link-underline mt-3 inline-flex items-center gap-1.5 text-sm">
                  Permits and safety guidance <Icon name="arrowRight" className="h-4 w-4" />
                </Link>
              </section>

              {hasSamples && (
                <p className="px-1 text-xs leading-relaxed text-ink-faint">
                  Sample announcements are bundled with this project for layout preview and are labelled as such.
                </p>
              )}
            </aside>
          </div>
        )}
      </div>

      <Modal
        open={composerOpen}
        onClose={() => {
          if (!saving) setComposerOpen(false);
        }}
        title="New announcement"
        description="Published immediately to everyone. Keep it specific, dated and sourced."
        size="lg"
      >
        <form className="space-y-4" onSubmit={onPublish}>
          <Field label="Title" htmlFor="community-title">
            <input
              id="community-title"
              className="input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Lukla flights suspended until Friday"
              maxLength={140}
              autoFocus
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category" htmlFor="community-category">
              <select
                id="community-category"
                className="input"
                value={postCategory}
                onChange={(event) => {
                  if (isCommunityCategory(event.target.value)) setPostCategory(event.target.value);
                }}
              >
                {COMMUNITY_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {COMMUNITY_CATEGORY_LABELS[value]}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex items-end pb-1">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-line text-forest focus:ring-forest-200"
                  checked={pinned}
                  onChange={(event) => setPinned(event.target.checked)}
                />
                Pin to the top of the board
              </label>
            </div>
          </div>

          <Field
            label="Message"
            htmlFor="community-body"
            hint={`${body.length}/4000 characters. Blank lines separate paragraphs.`}
          >
            <textarea
              id="community-body"
              className="input min-h-[10rem] resize-y"
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, 4000))}
              placeholder="What changed, where, as of when, and where you heard it."
            />
          </Field>

          {formError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {formError}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setComposerOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Publishing…' : 'Publish announcement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
