import { describe, expect, it } from 'vitest';
import {
  averageRating,
  currentSeason,
  difficultyTone,
  formatDate,
  formatDateRange,
  formatDistance,
  formatDuration,
  formatElevation,
  formatNpr,
  initials,
  isValidEmail,
  pluralize,
  readableAuthError,
  seasonForMonth,
  slugify,
} from './format';

describe('formatting', () => {
  it('formats distances with a decimal only below 10 km', () => {
    expect(formatDistance(4.25)).toBe('4.3 km');
    expect(formatDistance(130)).toBe('130 km');
  });

  it('formats elevations with thousands separators', () => {
    expect(formatElevation(5545)).toBe('5,545 m');
  });

  it('formats durations', () => {
    expect(formatDuration(1)).toBe('1 day');
    expect(formatDuration(14)).toBe('14 days');
  });

  it('formats NPR amounts and handles missing values', () => {
    expect(formatNpr(165000)).toBe('NPR 165,000');
    expect(formatNpr(0)).toBe('NPR 0');
    expect(formatNpr(null)).toBe('—');
    expect(formatNpr(undefined)).toBe('—');
  });

  it('formats dates in a readable form', () => {
    expect(formatDate('2027-04-12')).toBe('12 Apr 2027');
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });

  it('formats date ranges', () => {
    expect(formatDateRange('2027-04-12', '2027-04-26')).toContain('12 Apr 2027');
    expect(formatDateRange(null, null)).toBe('Dates not set');
    expect(formatDateRange('2027-04-12', null)).toMatch(/^From /);
  });

  it('pluralises correctly', () => {
    expect(pluralize(1, 'trail')).toBe('trail');
    expect(pluralize(2, 'trail')).toBe('trails');
    expect(pluralize(2, 'entry', 'entries')).toBe('entries');
  });
});

describe('seasons', () => {
  it('maps months to seasons', () => {
    expect(seasonForMonth(3)).toBe('spring');
    expect(seasonForMonth(6)).toBe('summer');
    expect(seasonForMonth(9)).toBe('autumn');
    expect(seasonForMonth(11)).toBe('winter');
    expect(currentSeason(new Date('2027-10-02'))).toBe('autumn');
  });
});

describe('text helpers', () => {
  it('builds initials from up to two names', () => {
    expect(initials('Tenzing Sherpa')).toBe('TS');
    expect(initials('Anjali')).toBe('A');
    expect(initials('  ')).toBe('');
  });

  it('slugifies names', () => {
    expect(slugify('Everest Base Camp Trek')).toBe('everest-base-camp-trek');
    expect(slugify('  Annapurna — Base Camp!  ')).toBe('annapurna-base-camp');
    expect(slugify('Kyanjin Gompa (Langtang)')).toBe('kyanjin-gompa-langtang');
  });

  it('averages ratings and ignores the empty case', () => {
    expect(averageRating([5, 4, 4])).toBe(4.3);
    expect(averageRating([])).toBeNull();
  });

  it('returns distinct difficulty tones', () => {
    const tones = new Set([
      difficultyTone('easy'),
      difficultyTone('moderate'),
      difficultyTone('hard'),
      difficultyTone('strenuous'),
    ]);
    expect(tones.size).toBe(4);
  });
});

describe('validation and auth errors', () => {
  it('validates email addresses', () => {
    expect(isValidEmail('walker@example.com')).toBe(true);
    expect(isValidEmail('walker@example')).toBe(false);
    expect(isValidEmail('not an email')).toBe(false);
  });

  it('rewrites Supabase auth errors into helpful copy', () => {
    expect(readableAuthError('Invalid login credentials')).toMatch(/does not match an account/);
    expect(readableAuthError('Email not confirmed')).toMatch(/confirm your email/);
    expect(readableAuthError('Rate limit exceeded')).toMatch(/wait a moment/);
    expect(readableAuthError('Something custom')).toBe('Something custom');
  });
});
