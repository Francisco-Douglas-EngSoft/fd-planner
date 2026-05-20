/**
 * Offline-resilient queue for focus sessions with strong idempotency.
 *
 * Anti-duplicate guarantees (defense in depth):
 *
 *  L1 — Unique client_id per session (UUID v4 via crypto.randomUUID).
 *       Generated once at enqueue time and stored in localStorage with
 *       the pending item. Survives reloads / power-off.
 *
 *  L2 — Local "sent" cache (`SENT_KEY`): the set of client_ids already
 *       confirmed as inserted on the server. Checked SYNCHRONOUSLY before
 *       any network call, so a reload mid-flush can never re-send.
 *
 *  L3 — Cross-tab mutex (`LOCK_KEY`): a timestamped lock in localStorage
 *       prevents two tabs (or two reloads of the same tab) from flushing
 *       in parallel. Stale locks (>30s) are auto-released.
 *
 *  L4 — Server-side dedupe check: before INSERT, query `focus_sessions`
 *       for an existing row whose `notes` contains the marker
 *       `__cid:<client_id>`. If found, treat as already-sent.
 *
 *  L5 — Post-insert re-check: immediately after INSERT, query again. If
 *       MORE THAN ONE row exists with the same marker (race between two
 *       tabs that both passed L4), delete every row except the oldest.
 *
 * Result: even with multiple reloads, multiple tabs, intermittent
 * connectivity, and concurrent flushes, each session is persisted to the
 * server exactly once.
 */

import { supabase } from '@/integrations/supabase/client';
import { emitFocusSessionSaved } from '@/hooks/useRealtimeFocusSessions';

const QUEUE_KEY = 'fdplanner_pending_focus_sessions_v1';
const SENT_KEY = 'fdplanner_sent_focus_cids_v1';
const LOCK_KEY = 'fdplanner_focus_flush_lock_v1';
const LOCK_TTL_MS = 30_000;
const SENT_CACHE_MAX = 500; // keep cache bounded

export interface PendingFocusSession {
  client_id: string;
  user_id: string;
  course_id: string;
  module_id?: string | null;
  duration_minutes: number;
  session_type: 'work' | 'break' | 'longBreak';
  completed_at: string; // ISO
  // Local-only metadata
  enqueued_at: string;
  attempts: number;
  last_error?: string;
}

// ────────────────────────────────────────────────────────────────────────────
// L1 — UUID generator
// ────────────────────────────────────────────────────────────────────────────

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random — collision risk negligible at our scale.
  return `cid_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Queue storage
// ────────────────────────────────────────────────────────────────────────────

function readQueue(): PendingFocusSession[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: PendingFocusSession[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('[offlineFocusQueue] Failed to persist queue:', e);
  }
}

export function getPendingCount(): number {
  return readQueue().length;
}

// ────────────────────────────────────────────────────────────────────────────
// L2 — Local "sent" cache (synchronous duplicate check)
// ────────────────────────────────────────────────────────────────────────────

function readSentCache(): string[] {
  try {
    const raw = localStorage.getItem(SENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function isAlreadySent(clientId: string): boolean {
  return readSentCache().includes(clientId);
}

function markAsSent(clientId: string) {
  try {
    const cache = readSentCache();
    if (cache.includes(clientId)) return;
    cache.push(clientId);
    // Trim oldest entries if cache grows too large
    const trimmed = cache.length > SENT_CACHE_MAX ? cache.slice(-SENT_CACHE_MAX) : cache;
    localStorage.setItem(SENT_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('[offlineFocusQueue] Failed to update sent cache:', e);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// L3 — Cross-tab mutex
// ────────────────────────────────────────────────────────────────────────────

const tabToken = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

interface FlushLock { token: string; ts: number }

function tryAcquireLock(): boolean {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FlushLock;
      if (parsed && Date.now() - parsed.ts < LOCK_TTL_MS) {
        // Another tab holds a fresh lock
        return parsed.token === tabToken;
      }
      // Stale lock — fall through and overwrite
    }
    const lock: FlushLock = { token: tabToken, ts: Date.now() };
    localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
    // Re-read to confirm we won the race (last write wins in localStorage,
    // but read-after-write helps catch simultaneous overwrites).
    const confirm = localStorage.getItem(LOCK_KEY);
    if (!confirm) return false;
    const confirmed = JSON.parse(confirm) as FlushLock;
    return confirmed.token === tabToken;
  } catch {
    return false;
  }
}

function releaseLock() {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as FlushLock;
    if (parsed.token === tabToken) {
      localStorage.removeItem(LOCK_KEY);
    }
  } catch {
    // ignore
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Enqueue
// ────────────────────────────────────────────────────────────────────────────

/**
 * Enqueue a session locally. Always succeeds (synchronous localStorage write).
 * Returns the client_id of the enqueued item.
 */
export function enqueueFocusSession(
  data: Omit<PendingFocusSession, 'client_id' | 'enqueued_at' | 'attempts'>
): string {
  const item: PendingFocusSession = {
    ...data,
    client_id: genId(),
    enqueued_at: new Date().toISOString(),
    attempts: 0,
  };

  // Anti-duplicate guard: if (incredibly) this id collides with an
  // already-sent or already-queued one, regenerate.
  const existing = new Set([
    ...readQueue().map((q) => q.client_id),
    ...readSentCache(),
  ]);
  while (existing.has(item.client_id)) {
    item.client_id = genId();
  }

  const queue = readQueue();
  queue.push(item);
  writeQueue(queue);
  return item.client_id;
}

// ────────────────────────────────────────────────────────────────────────────
// Course hours bump
// ────────────────────────────────────────────────────────────────────────────

async function bumpCourseCompletedHours(courseId: string, addedMinutes: number) {
  if (!courseId || addedMinutes <= 0) return;
  try {
    const { data: course } = await supabase
      .from('courses')
      .select('completed_hours')
      .eq('id', courseId)
      .maybeSingle();
    const current = Number(course?.completed_hours) || 0;
    const next = current + addedMinutes / 60;
    await supabase.from('courses').update({ completed_hours: next }).eq('id', courseId);
  } catch (e) {
    console.error('[offlineFocusQueue] bumpCourseCompletedHours failed:', e);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Flush
// ────────────────────────────────────────────────────────────────────────────

let flushingInTab = false;

/**
 * Try to send all pending sessions to Supabase.
 * Safe to call concurrently — protected by an in-tab flag AND a cross-tab lock.
 */
export async function flushFocusQueue(): Promise<{ sent: number; remaining: number; skipped: number }> {
  if (flushingInTab) {
    return { sent: 0, remaining: readQueue().length, skipped: 0 };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { sent: 0, remaining: readQueue().length, skipped: 0 };
  }
  if (!tryAcquireLock()) {
    return { sent: 0, remaining: readQueue().length, skipped: 0 };
  }

  flushingInTab = true;
  let sent = 0;
  let skipped = 0;
  try {
    const queue = readQueue();
    if (queue.length === 0) return { sent: 0, remaining: 0, skipped: 0 };

    const remaining: PendingFocusSession[] = [];

    for (const item of queue) {
      // L2 — synchronous local check first (zero-cost dedupe)
      if (isAlreadySent(item.client_id)) {
        skipped += 1;
        continue;
      }

      try {
        const marker = `__cid:${item.client_id}`;

        // L4 — server-side existence check
        const { data: existingRows } = await supabase
          .from('focus_sessions')
          .select('id, completed_at')
          .eq('user_id', item.user_id)
          .ilike('notes', `%${marker}%`)
          .order('completed_at', { ascending: true });

        if (existingRows && existingRows.length > 0) {
          // Already on server — possibly from a previous reload. Mark
          // locally and drop from queue.
          markAsSent(item.client_id);

          // L5 (defensive): if more than one row somehow exists, prune
          // duplicates keeping only the oldest.
          if (existingRows.length > 1) {
            const idsToDelete = existingRows.slice(1).map((r) => r.id);
            await supabase.from('focus_sessions').delete().in('id', idsToDelete);
            console.warn(
              `[offlineFocusQueue] Pruned ${idsToDelete.length} duplicate(s) for cid=${item.client_id}`
            );
          }

          sent += 1;
          continue;
        }

        // No existing row — insert
        const insertPayload: Record<string, unknown> = {
          user_id: item.user_id,
          course_id: item.course_id,
          duration_minutes: item.duration_minutes,
          session_type: item.session_type,
          completed_at: item.completed_at,
          notes: marker,
        };
        if (item.module_id) insertPayload.module_id = item.module_id;

        const { error } = await supabase
          .from('focus_sessions')
          .insert(insertPayload as never);

        if (error) throw error;

        // L5 — post-insert race check: if another tab inserted the same
        // marker between our SELECT and INSERT, delete the extras.
        const { data: afterRows } = await supabase
          .from('focus_sessions')
          .select('id, completed_at')
          .eq('user_id', item.user_id)
          .ilike('notes', `%${marker}%`)
          .order('completed_at', { ascending: true });

        if (afterRows && afterRows.length > 1) {
          const idsToDelete = afterRows.slice(1).map((r) => r.id);
          await supabase.from('focus_sessions').delete().in('id', idsToDelete);
          console.warn(
            `[offlineFocusQueue] Race detected — pruned ${idsToDelete.length} duplicate(s) for cid=${item.client_id}`
          );
        }

        markAsSent(item.client_id);

        // Bump course hours for work sessions (only on first successful insert)
        if (item.session_type === 'work') {
          await bumpCourseCompletedHours(item.course_id, item.duration_minutes);
        }

        sent += 1;
      } catch (err) {
        item.attempts += 1;
        item.last_error = err instanceof Error ? err.message : String(err);
        remaining.push(item);
      }
    }

    writeQueue(remaining);
    if (sent > 0) {
      try { emitFocusSessionSaved(); } catch { /* noop */ }
    }
    return { sent, remaining: remaining.length, skipped };
  } finally {
    flushingInTab = false;
    releaseLock();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Auto-flush installer
// ────────────────────────────────────────────────────────────────────────────

let installed = false;

/**
 * Install global listeners that periodically flush the queue.
 * Call once at app start.
 */
export function installFocusQueueAutoFlush() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const tryFlush = () => { void flushFocusQueue(); };

  // Initial flush shortly after start
  setTimeout(tryFlush, 1500);

  // Network came back
  window.addEventListener('online', tryFlush);

  // Tab became visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') tryFlush();
  });

  // Periodic retry
  setInterval(tryFlush, 30_000);

  // Best-effort flush on unload (sync localStorage already has the data)
  window.addEventListener('beforeunload', () => {
    void flushFocusQueue();
  });

  // Cross-tab coordination: when another tab finishes flushing, it may
  // have updated the sent cache or the queue — re-check ours.
  window.addEventListener('storage', (e) => {
    if (e.key === SENT_KEY || e.key === QUEUE_KEY) {
      tryFlush();
    }
  });
}
