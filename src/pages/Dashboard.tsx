import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/auth/AuthProvider';
import { useSavedTrails } from '@/saved/SavedTrailsProvider';
import { useTrips } from '@/trips/useTrips';
import { useToast } from '@/components/Toast';
import { contentSource, listRegions } from '@/data/content';
import {
  ACTIVITY_LABELS,
  DIFFICULTY_LABELS,
  SEASON_LABELS,
  formatDate,
  formatDateRange,
  initials,
} from '@/lib/format';
import { Icon } from '@/components/Icons';
import { Field, Notice, Spinner } from '@/components/ui';
import { cx } from '@/lib/cx';
import type { Activity, Difficulty, Season } from '@/lib/types';

export default function DashboardPage() {
  const { user, profile, profileLoading, updateProfile, sendPasswordReset, resendVerification, signOut } = useAuth();
  const { saved, loading: savedLoading } = useSavedTrails();
  const { trips, loading: tripsLoading } = useTrips();
  const { push } = useToast();

  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [homeRegion, setHomeRegion] = useState(profile?.homeRegion ?? '');
  const [preferredDifficulty, setPreferredDifficulty] = useState<string>(profile?.preferredDifficulty ?? '');
  const [preferredActivity, setPreferredActivity] = useState<string>(profile?.preferredActivity ?? '');
  const [preferredSeason, setPreferredSeason] = useState<string>(profile?.preferredSeason ?? '');
  const [regions, setRegions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.fullName);
    setBio(profile.bio ?? '');
    setHomeRegion(profile.homeRegion ?? '');
    setPreferredDifficulty(profile.preferredDifficulty ?? '');
    setPreferredActivity(profile.preferredActivity ?? '');
    setPreferredSeason(profile.preferredSeason ?? '');
  }, [profile]);

  useEffect(() => {
    listRegions()
      .then(setRegions)
      .catch(() => setRegions([]));
  }, []);

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setSavedMsg(null);
    if (fullName.trim().length < 2) return setFormError('Please enter your name.');
    if (bio.length > 600) return setFormError('Keep the bio under 600 characters.');
    setSaving(true);
    const result = await updateProfile({
      fullName: fullName.trim(),
      bio: bio.trim() || null,
      homeRegion: homeRegion || null,
      preferredDifficulty: preferredDifficulty || null,
      preferredActivity: preferredActivity || null,
      preferredSeason: preferredSeason || null,
    });
    setSaving(false);
    if (result.error) setFormError(result.error);
    else {
      setSavedMsg('Profile saved.');
      push('Profile updated.', 'success');
    }
  };

  const onPasswordReset = async () => {
    if (!user?.email) return;
    const result = await sendPasswordReset(user.email);
    push(result.error ?? `Password reset link sent to ${user.email}.`, result.error ? 'error' : 'success');
  };

  const onResend = async () => {
    if (!user?.email) return;
    const result = await resendVerification(user.email);
    push(result.error ?? 'Verification email sent.', result.error ? 'error' : 'success');
  };

  if (profileLoading && !profile) {
    return (
      <div className="container-page flex min-h-[50vh] items-center justify-center py-20" role="status">
        <Spinner className="h-7 w-7 text-forest" />
        <span className="sr-only">Loading your profile</span>
      </div>
    );
  }

  return (
    <div className="container-page py-10 sm:py-12">
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-forest font-display text-2xl text-white">
            {initials(profile?.fullName || user?.email || 'You')}
          </span>
          <div>
            <p className="eyebrow">Your account</p>
            <h1 className="mt-1 text-3xl sm:text-4xl">{profile?.fullName || 'Trekker'}</h1>
            <p className="mt-1 text-sm text-ink-muted">{user?.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="badge">
                {profile?.role === 'admin' ? 'Admin' : profile?.role === 'moderator' ? 'Moderator' : 'Member'}
              </span>
              {user && !user.email_confirmed_at && (
                <span className="badge bg-gold/20 text-[#7a5207]">Email not confirmed</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile?.role === 'admin' && (
            <Link to="/admin" className="btn-secondary btn-sm">
              <Icon name="shield" className="h-4 w-4" /> Admin dashboard
            </Link>
          )}
          <Link to="/plan" className="btn-primary btn-sm">
            <Icon name="calendar" className="h-4 w-4" /> Plan a trip
          </Link>
        </div>
      </header>

      {user && !user.email_confirmed_at && (
        <Notice
          tone="warning"
          className="mt-6"
          title="Confirm your email address"
          action={
            <button type="button" className="btn-secondary btn-sm" onClick={() => void onResend()}>
              Resend verification email
            </button>
          }
        >
          Your account exists but the address is unverified. Check your inbox for the confirmation link.
        </Notice>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">Saved trails</p>
          <p className="mt-2 font-display text-3xl">{savedLoading ? '—' : saved.length}</p>
          <Link to="/saved" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:underline">
            Open library <Icon name="arrowRight" className="h-3 w-3" />
          </Link>
        </div>
        <div className="card p-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">Trips</p>
          <p className="mt-2 font-display text-3xl">{tripsLoading ? '—' : trips.length}</p>
          <Link to="/plan" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:underline">
            Open planner <Icon name="arrowRight" className="h-3 w-3" />
          </Link>
        </div>
        <div className="card p-5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">Content source</p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {contentSource === 'supabase' ? 'Live Supabase project' : 'Sample dataset'}
          </p>
          <Link to="/help#setup" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:underline">
            Setup status <Icon name="arrowRight" className="h-3 w-3" />
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-6">
          <h2 className="text-xl">Profile and preferences</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Used to tailor suggestions. Nothing here is shown publicly except your name on reviews you publish.
          </p>
          <form onSubmit={onSave} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="profile-name">
                <input
                  id="profile-name"
                  className="input"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                />
              </Field>
              <Field label="Home region" htmlFor="profile-region">
                <select
                  id="profile-region"
                  className="input"
                  value={homeRegion}
                  onChange={(event) => setHomeRegion(event.target.value)}
                >
                  <option value="">Not set</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                  <option value="Outside Nepal">Outside Nepal</option>
                </select>
              </Field>
            </div>

            <Field label="Bio" htmlFor="profile-bio" hint="A sentence or two about how you like to walk.">
              <textarea
                id="profile-bio"
                className="input min-h-24"
                value={bio}
                maxLength={600}
                onChange={(event) => setBio(event.target.value)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Preferred level" htmlFor="profile-difficulty">
                <select
                  id="profile-difficulty"
                  className="input"
                  value={preferredDifficulty}
                  onChange={(event) => setPreferredDifficulty(event.target.value)}
                >
                  <option value="">Any</option>
                  {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((value) => (
                    <option key={value} value={value}>
                      {DIFFICULTY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Preferred activity" htmlFor="profile-activity">
                <select
                  id="profile-activity"
                  className="input"
                  value={preferredActivity}
                  onChange={(event) => setPreferredActivity(event.target.value)}
                >
                  <option value="">Any</option>
                  {(Object.keys(ACTIVITY_LABELS) as Activity[]).map((value) => (
                    <option key={value} value={value}>
                      {ACTIVITY_LABELS[value]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Preferred season" htmlFor="profile-season">
                <select
                  id="profile-season"
                  className="input"
                  value={preferredSeason}
                  onChange={(event) => setPreferredSeason(event.target.value)}
                >
                  <option value="">Any</option>
                  {(Object.keys(SEASON_LABELS) as Season[]).map((value) => (
                    <option key={value} value={value}>
                      {SEASON_LABELS[value]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {formError && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {formError}
              </p>
            )}
            {savedMsg && <p className="text-sm font-medium text-forest-700">{savedMsg}</p>}

            <button type="submit" className="btn-primary" disabled={saving}>
              {saving && <Spinner className="h-4 w-4" />} Save profile
            </button>
          </form>
        </section>

        <div className="space-y-5">
          <section className="card p-6">
            <h2 className="text-xl">Recent saves</h2>
            {saved.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">Nothing saved yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {saved.slice(0, 4).map((item) => (
                  <li key={item.trailId}>
                    <Link
                      to={`/trails/${item.slug}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-stone-line px-3 py-2 text-sm hover:border-forest-300"
                    >
                      <span className="truncate">{item.name}</span>
                      <Icon name="arrowRight" className="h-3.5 w-3.5 shrink-0 text-forest" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-xl">Upcoming trips</h2>
            {trips.length === 0 ? (
              <p className="mt-3 text-sm text-ink-muted">No trips yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {trips.slice(0, 3).map((trip) => (
                  <li key={trip.id}>
                    <Link to={`/plan/${trip.id}`} className="block rounded-lg border border-stone-line px-3 py-2.5 hover:border-forest-300">
                      <p className="text-sm font-semibold text-ink">{trip.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{formatDateRange(trip.startDate, trip.endDate)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-xl">Account settings</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs text-ink-faint">Email</dt>
                <dd className="font-medium text-ink">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-faint">Member since</dt>
                <dd className="font-medium text-ink">
                  {profile?.createdAt ? formatDate(profile.createdAt) : '—'}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" className="btn-secondary btn-sm justify-start" onClick={() => void onPasswordReset()}>
                Send password reset link
              </button>
              <button
                type="button"
                className={cx('btn-ghost btn-sm justify-start text-red-600 hover:bg-red-50')}
                onClick={async () => {
                  await signOut();
                  push('Signed out.', 'success');
                }}
              >
                <Icon name="logout" className="h-4 w-4" /> Sign out
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              Changing your email address requires re-verification and is handled by Supabase Auth. Use the reset link
              to regain access at any time.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
