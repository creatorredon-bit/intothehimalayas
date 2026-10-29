import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from './env';

/**
 * Single browser Supabase client.
 *
 * `null` when the project is not configured, so the app can degrade to
 * read-only sample data instead of throwing at import time.
 */
export const supabase: SupabaseClient | null = supabaseConfig.isConfigured
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'ith-auth',
      },
      global: { headers: { 'x-application-name': 'intothehimalayas-web' } },
    })
  : null;

export const isSupabaseConfigured = supabase !== null;

/** Throws a friendly, catchable error for data calls that need a backend. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new BackendNotConfiguredError();
  }
  return supabase;
}

export class BackendNotConfiguredError extends Error {
  readonly code = 'backend_not_configured';
  constructor() {
    super(
      'This action needs a Supabase project. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.',
    );
    this.name = 'BackendNotConfiguredError';
  }
}

/** Converts PostgREST/Supabase errors into a message safe to show in the UI. */
export function describeError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error) return fallback;
  if (error instanceof BackendNotConfiguredError) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object') {
    const maybe = error as { message?: string; error_description?: string; code?: string };
    if (maybe.message && maybe.code === '42501') {
      return 'You do not have permission to do that.';
    }
    if (maybe.message) return maybe.message;
    if (maybe.error_description) return maybe.error_description;
  }
  return fallback;
}
