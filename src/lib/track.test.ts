import { describe, expect, it } from 'vitest';
import { currentSpeedMps, elapsedMs, elevationGainM, formatElapsed, formatPace, haversineM, toGpx, trackDistanceM } from './track';

const point = (lat: number, lng: number, timestamp = 0, altitudeM: number | null = null) => ({
  lat,
  lng,
  altitudeM,
  accuracyM: 8,
  timestamp,
});

describe('haversineM', () => {
  it('measures one degree of latitude as roughly 111 km', () => {
    const distance = haversineM({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    expect(distance).toBeGreaterThan(111_000);
    expect(distance).toBeLessThan(111_400);
  });

  it('is zero for the same point', () => {
    expect(haversineM({ lat: 27.7, lng: 86.7 }, { lat: 27.7, lng: 86.7 })).toBe(0);
  });
});

describe('trackDistanceM', () => {
  it('sums each leg', () => {
    const points = [point(0, 0), point(0, 1), point(0, 2)];
    expect(trackDistanceM(points)).toBeCloseTo(222_390, -2);
    expect(trackDistanceM([point(0, 0)])).toBe(0);
  });
});

describe('elevationGainM', () => {
  it('counts climbs and ignores small noise', () => {
    const points = [
      point(0, 0, 0, 1000),
      point(0, 0, 1, 1005), // +5
      point(0, 0, 2, 1004), // −1, ignored
      point(0, 0, 3, 1010), // +5 (reference still 1005)
    ];
    expect(elevationGainM(points)).toBe(10);
  });

  it('ignores points without altitude', () => {
    expect(elevationGainM([point(0, 0, 0, null), point(0, 0, 1, 1200)])).toBe(0);
  });
});

describe('currentSpeedMps and elapsed time', () => {
  it('derives speed from the last two fixes', () => {
    const points = [point(0, 0, 0), point(0, 0.001, 60_000)];
    const speed = currentSpeedMps(points);
    expect(speed).not.toBeNull();
    expect(speed as number).toBeGreaterThan(1.8);
    expect(speed as number).toBeLessThan(1.9);
  });

  it('refuses a zero-length interval', () => {
    expect(currentSpeedMps([point(0, 0, 1000), point(0, 0, 1000)])).toBeNull();
    expect(currentSpeedMps([point(0, 0, 0)])).toBeNull();
  });

  it('elapsed time spans the first and last fix', () => {
    expect(elapsedMs([point(0, 0, 5000), point(0, 0.001, 65_000)])).toBe(60_000);
    expect(formatElapsed(0)).toBe('00:00');
    expect(formatElapsed(65_000)).toBe('01:05');
    expect(formatElapsed(3_725_000)).toBe('1:02:05');
  });
});

describe('formatPace', () => {
  it('renders minutes and seconds per kilometre', () => {
    expect(formatPace(12.5)).toBe('12:30 /km');
    expect(formatPace(0)).toBe('—');
    expect(formatPace(null)).toBe('—');
  });
});

describe('toGpx', () => {
  it('writes a valid GPX document with escaped names', () => {
    const gpx = toGpx([point(27.7172, 85.324, 1_700_000_000_000, 1400)], 'Kathmandu & back');
    expect(gpx.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(gpx).toContain('<gpx version="1.1"');
    expect(gpx).toContain('lat="27.717200" lon="85.324000"');
    expect(gpx).toContain('<ele>1400.0</ele>');
    expect(gpx).toContain('Kathmandu &amp; back');
    expect(gpx).toContain('<trkpt');
  });
});
