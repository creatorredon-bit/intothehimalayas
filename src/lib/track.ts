/**
 * GPS track maths and GPX export.
 *
 * The browser's Geolocation API reports whatever the device gives us: sometimes
 * a centimetre, often a few dozen metres in a valley. Nothing here pretends the
 * result is survey-grade, and accuracy is carried alongside every point.
 */

export interface TrackPoint {
  lat: number;
  lng: number;
  altitudeM: number | null;
  accuracyM: number | null;
  /** Milliseconds since the epoch, from `GeolocationPosition.timestamp`. */
  timestamp: number;
}

const EARTH_RADIUS_M = 6_371_000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance in metres between two coordinates. */
export function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Sum of great-circle legs. A fix with an accuracy radius worse than
 * `maxAccuracyM` is still counted if it is the only way to join two good points;
 * the caller decides whether to record fixes at all.
 */
export function trackDistanceM(points: Pick<TrackPoint, 'lat' | 'lng'>[]): number {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) {
    total += haversineM(points[index - 1], points[index]);
  }
  return total;
}

/** Positive altitude change, ignoring noise smaller than `thresholdM`. */
export function elevationGainM(points: Pick<TrackPoint, 'altitudeM'>[], thresholdM = 3): number {
  let gain = 0;
  let reference: number | null = null;

  for (const point of points) {
    if (point.altitudeM === null || !Number.isFinite(point.altitudeM)) continue;
    if (reference === null) {
      reference = point.altitudeM;
      continue;
    }
    const delta = point.altitudeM - reference;
    if (Math.abs(delta) < thresholdM) continue;
    if (delta > 0) gain += delta;
    reference = point.altitudeM;
  }
  return gain;
}

/** Metres per second between the last two fixes, or null if they are not usable. */
export function currentSpeedMps(points: Pick<TrackPoint, 'lat' | 'lng' | 'timestamp'>[]): number | null {
  if (points.length < 2) return null;
  const previous = points[points.length - 2];
  const last = points[points.length - 1];
  const seconds = (last.timestamp - previous.timestamp) / 1000;
  if (!Number.isFinite(seconds) || seconds <= 0.5) return null;
  return haversineM(previous, last) / seconds;
}

/** Elapsed milliseconds between the first and last fix. */
export function elapsedMs(points: Pick<TrackPoint, 'timestamp'>[]): number {
  if (points.length < 2) return 0;
  return Math.max(0, points[points.length - 1].timestamp - points[0].timestamp);
}

export function formatElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export function formatPace(minutesPerKm: number | null): string {
  if (minutesPerKm === null || !Number.isFinite(minutesPerKm) || minutesPerKm <= 0) return '—';
  const minutes = Math.floor(minutesPerKm);
  const seconds = Math.round((minutesPerKm - minutes) * 60);
  if (seconds === 60) return `${minutes + 1}:00 /km`;
  return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
}

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** GPX 1.1 document for the recorded track, importable by most GPS apps. */
export function toGpx(points: TrackPoint[], name = 'IntotheHimalayas track'): string {
  const trackPoints = points
    .map((point) => {
      const elevation =
        point.altitudeM !== null && Number.isFinite(point.altitudeM)
          ? `\n          <ele>${point.altitudeM.toFixed(1)}</ele>`
          : '';
      const time = Number.isFinite(point.timestamp) ? `\n          <time>${new Date(point.timestamp).toISOString()}</time>` : '';
      return `        <trkpt lat="${point.lat.toFixed(6)}" lon="${point.lng.toFixed(6)}">${elevation}${time}\n        </trkpt>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="IntotheHimalayas" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(name)}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;
}

/** A recording only makes sense when it has a start and at least one further fix. */
export function isUsableTrack(points: TrackPoint[]): boolean {
  return points.length >= 2;
}
