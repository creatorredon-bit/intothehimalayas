import { useCallback, useEffect, useRef, useState } from 'react';
import { haversineM, trackDistanceM, type TrackPoint } from '@/lib/track';

export type TrackerState = 'unsupported' | 'idle' | 'requesting' | 'tracking' | 'paused' | 'denied' | 'error';

interface UseLiveTrackResult {
  state: TrackerState;
  points: TrackPoint[];
  current: TrackPoint | null;
  error: string | null;
  elapsed: number;
  distanceM: number;
  gainM: number;
  speedMps: number | null;
  secureContext: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Browser GPS recording.
 *
 * `watchPosition` is used rather than polling so the device can decide the fix
 * cadence. A fix is only appended when it has moved a few metres or several
 * seconds have passed, which keeps a stationary phone from producing a scribble
 * of identical points. Nothing is uploaded by this hook.
 */
export function useLiveTrack(): UseLiveTrackResult {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const secureContext =
    typeof window === 'undefined' ? true : window.isSecureContext !== false || window.location.hostname === 'localhost';

  const [state, setState] = useState<TrackerState>(supported ? 'idle' : 'unsupported');
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [current, setCurrent] = useState<TrackPoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const watchIdRef = useRef<number | null>(null);
  const elapsedBaseRef = useRef(0);
  const resumedAtRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => clearWatch, [clearWatch]);

  useEffect(() => {
    if (state !== 'tracking') return;
    const tick = () => {
      if (resumedAtRef.current === null) return;
      setElapsed(elapsedBaseRef.current + (Date.now() - resumedAtRef.current));
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [state]);

  const handleFix = useCallback((position: GeolocationPosition) => {
    const timestamp = Number.isFinite(position.timestamp) ? position.timestamp : Date.now();
    const fix: TrackPoint = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      altitudeM: Number.isFinite(position.coords.altitude) ? (position.coords.altitude as number) : null,
      accuracyM: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
      timestamp,
    };

    setCurrent(fix);
    setError(null);
    if (!pausedRef.current) setState('tracking');
    // Derive elapsed from the fix itself as well as the timer: background tabs
    // throttle intervals, but GPS fixes keep arriving.
    if (resumedAtRef.current !== null) {
      setElapsed(elapsedBaseRef.current + Math.max(0, timestamp - resumedAtRef.current));
    }

    setPoints((previous) => {
      const last = previous[previous.length - 1];
      if (last) {
        const seconds = (timestamp - last.timestamp) / 1000;
        if (seconds < 4 && haversineM(last, fix) < 3) return previous;
      }
      return [...previous, fix];
    });
  }, []);

  const handleError = useCallback(
    (geoError: GeolocationPositionError) => {
      clearWatch();
      if (resumedAtRef.current !== null) {
        elapsedBaseRef.current += Date.now() - resumedAtRef.current;
        resumedAtRef.current = null;
      }
      setElapsed(elapsedBaseRef.current);

      if (geoError.code === geoError.PERMISSION_DENIED) {
        setState('denied');
        setError(
          'Location permission was denied. Allow location access for this site in your browser settings, then start again.',
        );
      } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
        setState('error');
        setError('Your device could not get a GPS fix. Move away from cover, check that location services are on, and try again.');
      } else {
        setState('error');
        setError('The GPS request timed out before a fix arrived. Outdoors with a clear view of the sky usually helps.');
      }
    },
    [clearWatch],
  );

  const beginWatch = useCallback(() => {
    if (!supported) {
      setState('unsupported');
      return;
    }
    clearWatch();
    setError(null);
    pausedRef.current = false;
    setState('requesting');
    resumedAtRef.current = Date.now();

    try {
      watchIdRef.current = navigator.geolocation.watchPosition(handleFix, handleError, {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20_000,
      });
    } catch {
      setState('error');
      setError('This browser refused the GPS request.');
    }
  }, [clearWatch, handleError, handleFix, supported]);

  const start = useCallback(() => {
    setPoints([]);
    setCurrent(null);
    setElapsed(0);
    elapsedBaseRef.current = 0;
    beginWatch();
  }, [beginWatch]);

  const pause = useCallback(() => {
    clearWatch();
    pausedRef.current = true;
    if (resumedAtRef.current !== null) {
      elapsedBaseRef.current += Date.now() - resumedAtRef.current;
      resumedAtRef.current = null;
    }
    setElapsed(elapsedBaseRef.current);
    setState('paused');
  }, [clearWatch]);

  const resume = useCallback(() => {
    if (state !== 'paused' && state !== 'error' && state !== 'denied') return;
    beginWatch();
  }, [beginWatch, state]);

  const stop = useCallback(() => {
    clearWatch();
    pausedRef.current = false;
    if (resumedAtRef.current !== null) {
      elapsedBaseRef.current += Date.now() - resumedAtRef.current;
      resumedAtRef.current = null;
    }
    setElapsed(elapsedBaseRef.current);
    setState('idle');
  }, [clearWatch]);

  const reset = useCallback(() => {
    stop();
    setPoints([]);
    setCurrent(null);
    setElapsed(0);
    setError(null);
    elapsedBaseRef.current = 0;
  }, [stop]);

  const gainM = points.reduce((gain, point, index) => {
    if (index === 0 || point.altitudeM === null) return gain;
    const previous = points[index - 1];
    if (previous.altitudeM === null) return gain;
    const delta = point.altitudeM - previous.altitudeM;
    return delta > 2 ? gain + delta : gain;
  }, 0);

  let speedMps: number | null = null;
  if (points.length >= 2) {
    const previous = points[points.length - 2];
    const last = points[points.length - 1];
    const seconds = (last.timestamp - previous.timestamp) / 1000;
    if (seconds > 0.5) {
      const candidate = haversineM(previous, last) / seconds;
      // A single bad fix can imply walking at 900 km/h; treat that as noise.
      if (Number.isFinite(candidate) && candidate <= 15) speedMps = candidate;
    }
  }

  return {
    state,
    points,
    current,
    error,
    elapsed,
    distanceM: trackDistanceM(points),
    gainM,
    speedMps,
    secureContext,
    start,
    pause,
    resume,
    stop,
    reset,
  };
}
