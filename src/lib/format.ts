import type { Difficulty, Season, StayType } from './types';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
  strenuous: 'Strenuous',
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'moderate', 'hard', 'strenuous'];

export const ACTIVITY_LABELS = {
  trekking: 'Trekking',
  hiking: 'Day hiking',
  peak_climbing: 'Peak climbing',
  sightseeing: 'Sightseeing',
} as const;

export const SEASON_LABELS: Record<Season, string> = {
  spring: 'Spring (Mar–May)',
  summer: 'Summer / monsoon (Jun–Aug)',
  autumn: 'Autumn (Sep–Nov)',
  winter: 'Winter (Dec–Feb)',
};

export const STAY_TYPE_LABELS: Record<StayType, string> = {
  teahouse: 'Teahouse',
  lodge: 'Mountain lodge',
  hotel: 'Hotel',
  homestay: 'Homestay',
};

/** Season that a given month belongs to, used for seasonal recommendations. */
export function seasonForMonth(month: number): Season {
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export function currentSeason(date = new Date()): Season {
  return seasonForMonth(date.getMonth());
}

export function formatNumber(value: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits }).format(value);
}

export function formatDistance(km: number): string {
  return `${formatNumber(km, km < 10 ? 1 : 0)} km`;
}

export function formatElevation(m: number): string {
  return `${formatNumber(m)} m`;
}

export function formatDuration(days: number): string {
  return days === 1 ? '1 day' : `${formatNumber(days)} days`;
}

export function formatNpr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return `NPR ${formatNumber(Math.round(amount))}`;
}

/**
 * Parse a date value without shifting calendar dates across timezones.
 * `new Date('2027-04-12')` is UTC midnight, which renders as the previous day in
 * any timezone behind UTC. A plain `YYYY-MM-DD` string is a calendar date, not an
 * instant, so build it in local time from its parts. Full timestamps stay instants.
 */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  const match = DATE_ONLY.exec(value.trim());
  if (!match) return new Date(value);
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function formatDate(value: string | Date | null | undefined, withYear = true): string {
  if (!value) return '—';
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(date);
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return 'Dates not set';
  if (start && !end) return `From ${formatDate(start)}`;
  if (!start && end) return `Until ${formatDate(end)}`;
  return `${formatDate(start)} → ${formatDate(end)}`;
}

export function dayCount(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const a = parseDate(start);
  const b = parseDate(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
  return diff > 0 ? diff : null;
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural || `${singular}s`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export function difficultyTone(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-forest-50 text-forest-700 ring-forest-200';
    case 'moderate':
      return 'bg-sky/15 text-[#1d6d87] ring-sky/40';
    case 'hard':
      return 'bg-gold/20 text-[#8a5a05] ring-gold/50';
    case 'strenuous':
      return 'bg-red-50 text-red-700 ring-red-200';
    default:
      return 'bg-stone-paper text-ink-soft ring-stone-line';
  }
}

export function averageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  return Math.round((ratings.reduce((sum, value) => sum + value, 0) / ratings.length) * 10) / 10;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function safeExternalUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : undefined;
}

/** Basic, intentionally permissive email validation for client-side UX. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function readableAuthError(message: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'That email and password combination does not match an account.',
    'Email not confirmed': 'Please confirm your email address before signing in.',
    'User already registered': 'An account with that email already exists. Try signing in instead.',
    'Password should be at least 6 characters': 'Choose a password with at least 8 characters.',
  };
  for (const [key, value] of Object.entries(map)) {
    if (message.toLowerCase().includes(key.toLowerCase())) return value;
  }
  if (/rate limit|too many requests/i.test(message)) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return message;
}
