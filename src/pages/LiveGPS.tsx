import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/Toast';
import { LiveTrackMap } from '@/components/LiveTrackMap';
import { useLiveTrack } from '@/live/useLiveTrack';
import {
  broadcastPosition,
  describeAge,
  generateShareCode,
  joinPositionChannel,
  leavePositionChannel,
  normaliseShareCode,
  SHARING_AVAILABLE,
  type ShareStatus,
  type SharedPosition,
} from '@/live/sharing';
import { elapsedMs, formatElapsed, formatPace, toGpx } from '@/lib/track';
import { formatNumber } from '@/lib/format';
import { Icon } from '@/components/Icons';
import { Notice, PageIntro } from '@/components/ui';
import { cx } from '@/lib/cx';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card px-4 py-3.5">
      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tracking-tight">{value}</dd>
      {hint && <p className="mt-0.5 text-[0.7rem] text-ink-faint">{hint}</p>}
    </div>
  );
}

const stateCopy: Record<string, string> = {
  unsupported: 'This browser does not expose a Geolocation API.',
  idle: 'Ready when you are.',
  requesting: 'Waiting for the first GPS fix…',
  tracking: 'Recording fixes from your device.',
  paused: 'Paused. Elapsed time and distance are frozen.',
  denied: 'Location permission is blocked.',
  error: 'The GPS fix failed.',
};

export default function LiveGpsPage() {
  const track = useLiveTrack();
  const { user, profile } = useAuth();
  const { push } = useToast();

  const [shareCode, setShareCode] = useState('');
  const [shareStatus, setShareStatus] = useState<ShareStatus | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinedCode, setJoinedCode] = useState('');
  const [watchStatus, setWatchStatus] = useState<ShareStatus | null>(null);
  const [trackers, setTrackers] = useState<Record<string, SharedPosition>>({});

  const shareChannelRef = useRef<RealtimeChannel | null>(null);
  const watchChannelRef = useRef<RealtimeChannel | null>(null);
  const currentRef = useRef(track.current);
  const trackingRef = useRef(track.state === 'tracking');
  currentRef.current = track.current;
  trackingRef.current = track.state === 'tracking';

  const profileName = profile?.fullName || user?.email?.split('@')[0] || 'Trekker';
  const sharedList = Object.values(trackers);
  const currentAltitude = track.current?.altitudeM ?? null;
  const currentAccuracy = track.current?.accuracyM ?? null;

  useEffect(
    () => () => {
      void leavePositionChannel(shareChannelRef.current);
      void leavePositionChannel(watchChannelRef.current);
    },
    [],
  );

  const stopSharing = async () => {
    await leavePositionChannel(shareChannelRef.current);
    shareChannelRef.current = null;
    setShareCode('');
    setShareStatus(null);
  };

  const startSharing = () => {
    if (!user) {
      push('Sign in to share your position with companions.', 'error');
      return;
    }
    if (!SHARING_AVAILABLE) {
      push('Position sharing needs a configured Supabase project.', 'error');
      return;
    }
    const code = generateShareCode();
    const channel = joinPositionChannel(code, {
      onPosition: () => undefined,
      onStatus: setShareStatus,
    });
    if (!channel) {
      push('Could not open a sharing channel.', 'error');
      return;
    }
    shareChannelRef.current = channel;
    setShareCode(code);
    const fix = currentRef.current;
    if (fix) {
      void broadcastPosition(channel, {
        userId: user.id,
        name: profileName,
        lat: fix.lat,
        lng: fix.lng,
        altitudeM: fix.altitudeM,
        accuracyM: fix.accuracyM,
        timestamp: fix.timestamp,
      });
    }
  };

  const stopWatching = async () => {
    await leavePositionChannel(watchChannelRef.current);
    watchChannelRef.current = null;
    setJoinedCode('');
    setWatchStatus(null);
    setTrackers({});
  };

  const startWatching = async () => {
    if (!user) {
      push('Sign in to follow a companion’s share code.', 'error');
      return;
    }
    const code = normaliseShareCode(joinCode);
    if (code.length < 4) {
      push('Enter the share code shown on your companion’s phone.', 'error');
      return;
    }
    await stopWatching();
    const channel = joinPositionChannel(code, {
      onPosition: (position) => setTrackers((previous) => ({ ...previous, [position.userId]: position })),
      onStatus: setWatchStatus,
    });
    if (!channel) {
      push('Could not open that channel.', 'error');
      return;
    }
    watchChannelRef.current = channel;
    setJoinedCode(code);
  };

  // Broadcast the latest fix every few seconds while sharing. The interval reads
  // refs so a new fix does not tear down and recreate the timer.
  useEffect(() => {
    if (!shareCode || !user) return;
    const interval = window.setInterval(() => {
      const fix = currentRef.current;
      const channel = shareChannelRef.current;
      if (!fix || !channel || !trackingRef.current) return;
      void broadcastPosition(channel, {
        userId: user.id,
        name: profileName,
        lat: fix.lat,
        lng: fix.lng,
        altitudeM: fix.altitudeM,
        accuracyM: fix.accuracyM,
        timestamp: fix.timestamp,
      });
    }, 5000);
    return () => window.clearInterval(interval);
  }, [shareCode, user, profileName]);

  const downloadGpx = () => {
    if (track.points.length < 2) return;
    const blob = new Blob([toGpx(track.points, 'IntotheHimalayas live track')], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `intothehimalayas-track-${new Date().toISOString().slice(0, 10)}.gpx`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    push('GPX file downloaded.', 'success');
  };

  const copyCode = async () => {
    if (!shareCode) return;
    try {
      await navigator.clipboard.writeText(shareCode);
      push('Share code copied.', 'success');
    } catch {
      push('Copy was blocked by the browser. Read the code out instead.', 'error');
    }
  };

  const distanceKm = track.distanceM / 1000;
  const pace = distanceKm > 0.01 && track.elapsed > 0 ? track.elapsed / 60_000 / distanceKm : null;
  const speedKmh = track.speedMps === null ? null : track.speedMps * 3.6;
  const firstFix = track.points[0]?.timestamp;
  const lastFix = track.points[track.points.length - 1]?.timestamp;
  const canDownload = track.points.length >= 2;

  return (
    <div>
      <PageIntro
        eyebrow="Live GPS"
        title="Track the walk while it happens"
        description="Record your own route with the device GPS, watch distance, pace and altitude as you move, and — if companions split up — share your live position with a short code."
      >
        <p className="max-w-2xl text-xs leading-relaxed text-ink-faint">
          Recordings stay in this browser unless you choose to share. Browser GPS is not a navigation instrument:
          carry a map, ask locally, and treat every figure below as approximate.
        </p>
      </PageIntro>

      <div className="container-page py-10">
        {!track.secureContext && (
          <Notice tone="warning" className="mb-5" title="HTTPS is required">
            Browsers only allow location access on HTTPS or localhost. This page will not get a fix over plain HTTP.
          </Notice>
        )}

        {track.state === 'denied' && track.error && (
          <Notice tone="error" className="mb-5" title="Location blocked">
            {track.error} On Chrome or Safari, open the site settings for this origin and allow location, then use
            “Try again”.
          </Notice>
        )}

        {track.state === 'unsupported' && (
          <Notice tone="warning" className="mb-5" title="No geolocation in this browser">
            Use a current version of Chrome, Safari, Firefox or Edge on a device with a GPS or location service.
          </Notice>
        )}

        {track.state === 'error' && track.error && (
          <Notice tone="error" className="mb-5" title="No fix yet">
            {track.error}
          </Notice>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
          <div className="space-y-6">
            <section aria-labelledby="stats-heading">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="stats-heading" className="text-xl">
                  This session
                </h2>
                <p className="text-xs text-ink-faint">
                  <span
                    className={cx(
                      'mr-1.5 inline-block h-2 w-2 rounded-full align-middle',
                      track.state === 'tracking' ? 'animate-pulse bg-forest' : 'bg-ink-faint',
                    )}
                    aria-hidden="true"
                  />
                  {stateCopy[track.state]}
                </p>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Stat label="Distance" value={`${distanceKm.toFixed(2)} km`} hint={`${formatNumber(track.points.length)} fixes`} />
                <Stat label="Elapsed" value={formatElapsed(track.elapsed)} hint="moving time, pauses excluded" />
                <Stat label="Pace" value={formatPace(pace)} hint="from elapsed time" />
                <Stat
                  label="Altitude"
                  value={currentAltitude === null ? '—' : `${formatNumber(currentAltitude)} m`}
                  hint="device altitude, if available"
                />
                <Stat label="Ascent" value={`${formatNumber(track.gainM)} m`} hint="from altitude fixes" />
                <Stat
                  label="Speed"
                  value={speedKmh === null ? '—' : `${speedKmh.toFixed(1)} km/h`}
                  hint={currentAccuracy === null ? 'no fix yet' : `accuracy ±${formatNumber(currentAccuracy)} m`}
                />
              </dl>

              <div className="mt-4 flex flex-wrap gap-2.5">
                {(track.state === 'idle' || track.state === 'unsupported') && track.points.length === 0 && (
                  <button type="button" className="btn-primary" onClick={track.start} disabled={track.state === 'unsupported'}>
                    <Icon name="compass" className="h-4 w-4" /> Start tracking
                  </button>
                )}
                {track.state === 'requesting' && (
                  <>
                    <button type="button" className="btn-secondary" disabled>
                      Waiting for GPS…
                    </button>
                    <button type="button" className="btn-ghost" onClick={track.stop}>
                      Cancel
                    </button>
                  </>
                )}
                {track.state === 'tracking' && (
                  <>
                    <button type="button" className="btn-primary" onClick={track.pause}>
                      <Icon name="clock" className="h-4 w-4" /> Pause
                    </button>
                    <button type="button" className="btn-secondary" onClick={track.stop}>
                      <Icon name="check" className="h-4 w-4" /> Finish
                    </button>
                  </>
                )}
                {track.state === 'paused' && (
                  <>
                    <button type="button" className="btn-primary" onClick={track.resume}>
                      <Icon name="compass" className="h-4 w-4" /> Resume
                    </button>
                    <button type="button" className="btn-secondary" onClick={track.stop}>
                      Finish
                    </button>
                  </>
                )}
                {(track.state === 'error' || track.state === 'denied') && (
                  <button type="button" className="btn-primary" onClick={track.resume}>
                    <Icon name="refresh" className="h-4 w-4" /> Try again
                  </button>
                )}
                {track.state === 'idle' && track.points.length > 0 && (
                  <button type="button" className="btn-secondary" onClick={() => track.start()}>
                    <Icon name="plus" className="h-4 w-4" /> Start a new track
                  </button>
                )}
                <button type="button" className="btn-secondary" onClick={downloadGpx} disabled={!canDownload}>
                  <Icon name="external" className="h-4 w-4" /> Download GPX
                </button>
                {(track.points.length > 0 || track.current) && (
                  <button type="button" className="btn-ghost" onClick={track.reset}>
                    <Icon name="trash" className="h-4 w-4" /> Clear
                  </button>
                )}
              </div>

              {canDownload && (
                <p className="mt-3 text-xs text-ink-faint">
                  {firstFix ? new Date(firstFix).toLocaleTimeString() : ''} →{' '}
                  {lastFix ? new Date(lastFix).toLocaleTimeString() : ''} ·{' '}
                  {track.points.length} points · GPX exports what is on this device, nothing else.
                </p>
              )}
            </section>

            <section aria-labelledby="map-heading">
              <h2 id="map-heading" className="sr-only">
                Live map
              </h2>
              <LiveTrackMap points={track.points} current={track.current} shared={sharedList} />
            </section>

            {currentAccuracy !== null && currentAccuracy > 50 && (
              <Notice tone="warning" title="Wide accuracy radius">
                The last fix is accurate to about ±{formatNumber(currentAccuracy)} m. Valleys, forest and
                buildings degrade GPS; the blue circle shows the uncertainty. Do not use it to decide whether a river
                crossing or exposed section is safe.
              </Notice>
            )}
          </div>

          <aside className="space-y-6">
            <section className="card p-6" aria-labelledby="share-heading">
              <h2 id="share-heading" className="text-lg">
                Share with companions
              </h2>

              {!SHARING_AVAILABLE && (
                <div className="mt-3">
                  <Notice tone="info" title="Recording works offline; sharing does not">
                    Local tracking, the map and GPX export all work in this build. Live sharing needs a configured
                    Supabase project (Realtime broadcast), so it stays off until credentials are added.
                  </Notice>
                </div>
              )}

              {SHARING_AVAILABLE && !user && (
                <div className="mt-3">
                  <p className="text-sm leading-relaxed text-ink-muted">
                    Sign in to open a share channel or follow someone else’s code. Recording your own track does not
                    need an account.
                  </p>
                  <Link to="/login?next=/live" className="btn-secondary btn-sm mt-4">
                    Sign in to share
                  </Link>
                </div>
              )}

              {SHARING_AVAILABLE && user && (
                <div className="mt-4 space-y-5">
                  {shareCode ? (
                    <div>
                      <p className="label">Your share code</p>
                      <div className="flex items-center gap-2">
                        <p className="flex-1 rounded-xl border border-stone-line bg-stone-paper px-4 py-3 font-mono text-2xl tracking-[0.3em]">
                          {shareCode}
                        </p>
                        <button type="button" className="btn-secondary btn-sm" onClick={() => void copyCode()}>
                          Copy
                        </button>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-ink-faint">
                        {shareStatus === 'connected'
                          ? 'Channel live. Anyone with this code can see your position while this page stays open.'
                          : shareStatus === 'error'
                            ? 'The realtime channel reported an error. Stop and try again.'
                            : 'Connecting to the realtime channel…'}
                      </p>
                      <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => void stopSharing()}>
                        Stop sharing
                      </button>
                      {!trackingRef.current && (
                        <p className="mt-2 text-xs font-medium text-[#7a5207]">
                          Start tracking so there is a position to share.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm leading-relaxed text-ink-muted">
                        Create a short code, read it to the group, and your live position is broadcast every few
                        seconds. Nothing is stored in the database.
                      </p>
                      <button type="button" className="btn-primary btn-sm mt-3" onClick={startSharing} disabled={!track.current}>
                        <Icon name="share" className="h-4 w-4" /> Start sharing
                      </button>
                      {!track.current && <p className="mt-2 text-xs text-ink-faint">Available once the first GPS fix arrives.</p>}
                    </div>
                  )}

                  <div className="border-t border-stone-line pt-5">
                    <p className="label">Follow a companion</p>
                    {joinedCode ? (
                      <div>
                        <p className="text-sm">
                          Following <span className="font-mono font-semibold">{joinedCode}</span>{' '}
                          <span className="text-ink-faint">
                            ({watchStatus === 'connected' ? 'connected' : watchStatus === 'error' ? 'connection error' : 'connecting'})
                          </span>
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => {
                              void stopWatching();
                              setTrackers({});
                            }}
                          >
                            Leave
                          </button>
                        </div>
                        {sharedList.length === 0 ? (
                          <p className="mt-3 text-xs text-ink-muted">Waiting for positions. They appear as soon as the tracker sends one.</p>
                        ) : (
                          <ul className="mt-3 divide-y divide-stone-line">
                            {sharedList.map((position) => (
                              <li key={position.userId} className="flex items-center justify-between gap-3 py-2">
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium">{position.name}</span>
                                  <span className="block text-[0.7rem] text-ink-faint">
                                    {position.altitudeM !== null ? `${formatNumber(position.altitudeM)} m · ` : ''}
                                    {position.accuracyM !== null ? `±${formatNumber(position.accuracyM)} m · ` : ''}
                                    {describeAge(position.timestamp)}
                                  </span>
                                </span>
                                <Icon name="compass" className="h-4 w-4 shrink-0 text-forest" />
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="mt-2 text-[0.7rem] text-ink-faint">
                          Positions are ephemeral and disappear when either side closes the page.
                        </p>
                      </div>
                    ) : (
                      <form
                        className="mt-2 flex flex-wrap gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void startWatching();
                        }}
                      >
                        <input
                          className="input flex-1 uppercase tracking-[0.2em]"
                          value={joinCode}
                          onChange={(event) => setJoinCode(normaliseShareCode(event.target.value))}
                          placeholder="ABC123"
                          aria-label="Share code to follow"
                          maxLength={8}
                        />
                        <button type="submit" className="btn-secondary btn-sm">
                          Follow
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="card p-6" aria-labelledby="limits-heading">
              <h2 id="limits-heading" className="text-lg">
                What this can and cannot do
              </h2>
              <ul className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-muted">
                <li className="flex gap-2">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                  Records only while this tab is open and the screen is on. Browsers throttle background pages.
                </li>
                <li className="flex gap-2">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                  Exports GPX you can import into a GPS app or keep as a record.
                </li>
                <li className="flex gap-2">
                  <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-[#9a3412]" />
                  No offline map tiles, no SOS, no rescue dispatch. Signal does not exist on many high routes.
                </li>
                <li className="flex gap-2">
                  <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0 text-[#9a3412]" />
                  Not a substitute for a guide, a paper map or a satellite messenger.
                </li>
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-ink-faint">
                {track.points.length > 0
                  ? `${formatElapsed(elapsedMs(track.points))} of fixes recorded, starting ${firstFix ? new Date(firstFix).toLocaleString() : '—'}.`
                  : 'No fixes recorded yet.'}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
