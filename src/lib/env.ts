/**
 * Runtime configuration.
 *
 * Only the Supabase *anon* key is read here. It is a public key by design and
 * every table is guarded by Row Level Security. Service-role keys must never be
 * exposed to the browser.
 */

function read(key: string, fallback = ''): string {
  const value = (import.meta.env as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

const supabaseUrl = read('VITE_SUPABASE_URL');
const supabaseAnonKey = read('VITE_SUPABASE_ANON_KEY');

const looksLikePlaceholder = (value: string) =>
  value.includes('your-project-ref') || value.includes('your-anon-key');

const isLocalSupabase = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl);

const looksLikeSupabaseUrl =
  /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(supabaseUrl) || isLocalSupabase;

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  /** True when a usable project URL + anon key are present (hosted or local Supabase). */
  isConfigured:
    looksLikeSupabaseUrl &&
    supabaseAnonKey.length > 30 &&
    !looksLikePlaceholder(supabaseUrl) &&
    !looksLikePlaceholder(supabaseAnonKey),
};

export const siteOrigin = (): string => {
  const configured = read('VITE_SITE_URL');
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
};

export const mapConfig = {
  tileUrl: read('VITE_MAP_TILE_URL', 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'),
  attribution: read(
    'VITE_MAP_ATTRIBUTION',
    'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
  ),
  maxZoom: Number(read('VITE_MAP_MAX_ZOOM', '17')) || 17,
};

/** Human-readable summary shown in the UI when Supabase is missing. */
export const setupHint =
  'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file, then restart the dev server.';
