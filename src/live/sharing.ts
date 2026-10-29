import type { RealtimeChannel } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * Companion location sharing.
 *
 * Uses a Supabase Realtime broadcast channel keyed by a short share code. Nothing
 * is written to the database: positions are ephemeral and disappear when the
 * channel is left. Both the tracker and the viewer must be signed in, so every
 * broadcast is attributable to an account. Anyone who knows the code can watch,
 * which is why the code is short-lived and displayed only to the sharer.
 */

export const SHARING_AVAILABLE = isSupabaseConfigured;

export interface SharedPosition {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  altitudeM: number | null;
  accuracyM: number | null;
  timestamp: number;
}

export type ShareStatus = 'connecting' | 'connected' | 'error' | 'closed';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateShareCode(length = 6): string {
  const values = new Uint32Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(values);
  } else {
    for (let index = 0; index < length; index += 1) values[index] = Math.floor(Math.random() * 2 ** 32);
  }
  return Array.from(values, (value) => ALPHABET[value % ALPHABET.length]).join('');
}

export function normaliseShareCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

const channelName = (code: string) => `live-positions-${code}`;

export interface ChannelHandlers {
  onPosition: (position: SharedPosition) => void;
  onStatus?: (status: ShareStatus) => void;
}

/**
 * Join the broadcast channel for a share code. The caller owns the channel and
 * must pass it to `leavePositionChannel` when done.
 */
export function joinPositionChannel(code: string, handlers: ChannelHandlers): RealtimeChannel | null {
  if (!supabase || !code) return null;

  const channel = supabase.channel(channelName(code), {
    config: { broadcast: { self: false } },
  });

  channel.on('broadcast', { event: 'position' }, (message) => {
    const payload = (message as { payload?: unknown }).payload;
    if (!payload || typeof payload !== 'object') return;
    const candidate = payload as Partial<SharedPosition>;
    if (
      typeof candidate.userId !== 'string' ||
      typeof candidate.name !== 'string' ||
      typeof candidate.lat !== 'number' ||
      typeof candidate.lng !== 'number' ||
      typeof candidate.timestamp !== 'number'
    ) {
      return;
    }
    handlers.onPosition({
      userId: candidate.userId,
      name: candidate.name,
      lat: candidate.lat,
      lng: candidate.lng,
      altitudeM: typeof candidate.altitudeM === 'number' ? candidate.altitudeM : null,
      accuracyM: typeof candidate.accuracyM === 'number' ? candidate.accuracyM : null,
      timestamp: candidate.timestamp,
    });
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') handlers.onStatus?.('connected');
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') handlers.onStatus?.('error');
    else if (status === 'CLOSED') handlers.onStatus?.('closed');
    else handlers.onStatus?.('connecting');
  });

  handlers.onStatus?.('connecting');
  return channel;
}

export async function broadcastPosition(channel: RealtimeChannel, position: SharedPosition): Promise<void> {
  try {
    await channel.send({ type: 'broadcast', event: 'position', payload: position });
  } catch {
    // A dropped broadcast is not fatal; the next fix will try again.
  }
}

export async function leavePositionChannel(channel: RealtimeChannel | null): Promise<void> {
  if (!channel || !supabase) return;
  await supabase.removeChannel(channel);
}

/** Human-readable age of the last fix, for the watcher list. */
export function describeAge(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 15) return 'live';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ago`;
}
