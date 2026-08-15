/**
 * Armazenamento offline para a meta global e o planejamento ativo.
 *
 * Estratégia:
 *  - Toda leitura vinda do Supabase é espelhada em localStorage (cache),
 *    para que a tela continue funcionando sem conexão.
 *  - Toda escrita da meta global é gravada localmente primeiro e, se não
 *    houver conexão (ou a requisição falhar), fica pendente numa fila.
 *  - A fila é liberada automaticamente quando o navegador volta a ficar
 *    online (evento `online`) ou quando o app é reaberto com conexão.
 *  - A escrita pendente é sempre um `upsert` do estado mais recente
 *    (last-write-wins por usuário), então basta guardar UM item por usuário.
 */

import { supabase } from '@/integrations/supabase/client';

const GOAL_CACHE_KEY = 'fdplanner_global_goal_cache_v1';
const GOAL_PENDING_KEY = 'fdplanner_global_goal_pending_v1';
const PLANS_CACHE_KEY = 'fdplanner_active_plans_cache_v1';

export interface GlobalGoalPayload {
  hoursPerDay: number;
  days: number[];
  startDate: string;
}

interface CachedGoal {
  userId: string;
  payload: GlobalGoalPayload;
  updatedAt: string;
}

interface PendingGoal extends CachedGoal {
  attempts: number;
  lastError?: string;
}

interface CachedPlans<T = unknown> {
  userId: string;
  plans: T[];
  updatedAt: string;
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[offlinePlanningStore] falha ao gravar localmente', e);
  }
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

// ─── Meta global ────────────────────────────────────────────────────────────

export function cacheGlobalGoal(userId: string, payload: GlobalGoalPayload): void {
  write(GOAL_CACHE_KEY, { userId, payload, updatedAt: new Date().toISOString() } satisfies CachedGoal);
}

export function getCachedGlobalGoal(userId: string): GlobalGoalPayload | null {
  const cached = read<CachedGoal>(GOAL_CACHE_KEY);
  return cached && cached.userId === userId ? cached.payload : null;
}

export function getPendingGlobalGoal(userId: string): GlobalGoalPayload | null {
  const pending = read<PendingGoal>(GOAL_PENDING_KEY);
  return pending && pending.userId === userId ? pending.payload : null;
}

export function hasPendingGlobalGoal(userId?: string | null): boolean {
  const pending = read<PendingGoal>(GOAL_PENDING_KEY);
  if (!pending) return false;
  return !userId || pending.userId === userId;
}

function enqueueGlobalGoal(userId: string, payload: GlobalGoalPayload, error?: string): void {
  const previous = read<PendingGoal>(GOAL_PENDING_KEY);
  const attempts = previous && previous.userId === userId ? previous.attempts : 0;
  write(GOAL_PENDING_KEY, {
    userId,
    payload,
    updatedAt: new Date().toISOString(),
    attempts,
    lastError: error,
  } satisfies PendingGoal);
}

function clearPendingGlobalGoal(): void {
  try {
    localStorage.removeItem(GOAL_PENDING_KEY);
  } catch {
    /* noop */
  }
}

async function upsertGlobalGoal(userId: string, payload: GlobalGoalPayload) {
  return supabase.from('planning_global_goals').upsert(
    {
      user_id: userId,
      hours_per_day: payload.hoursPerDay,
      study_days: payload.days,
      start_date: payload.startDate,
    },
    { onConflict: 'user_id' },
  );
}

export type SaveResult = 'synced' | 'queued';

/**
 * Salva a meta global: sempre no cache local e, quando possível, no Supabase.
 * Sem conexão (ou em caso de erro), a escrita fica pendente para sincronizar depois.
 */
export async function saveGlobalGoal(
  userId: string,
  payload: GlobalGoalPayload,
): Promise<SaveResult> {
  cacheGlobalGoal(userId, payload);

  if (!isOnline()) {
    enqueueGlobalGoal(userId, payload, 'offline');
    return 'queued';
  }

  const { error } = await upsertGlobalGoal(userId, payload);
  if (error) {
    enqueueGlobalGoal(userId, payload, error.message);
    return 'queued';
  }

  clearPendingGlobalGoal();
  return 'synced';
}

/**
 * Envia a meta global pendente. Retorna true quando algo foi sincronizado.
 */
export async function flushGlobalGoalQueue(userId?: string | null): Promise<boolean> {
  const pending = read<PendingGoal>(GOAL_PENDING_KEY);
  if (!pending) return false;
  if (userId && pending.userId !== userId) return false;
  if (!isOnline()) return false;

  const { error } = await upsertGlobalGoal(pending.userId, pending.payload);
  if (error) {
    write(GOAL_PENDING_KEY, {
      ...pending,
      attempts: pending.attempts + 1,
      lastError: error.message,
    } satisfies PendingGoal);
    return false;
  }

  cacheGlobalGoal(pending.userId, pending.payload);
  clearPendingGlobalGoal();
  return true;
}

// ─── Planejamentos ──────────────────────────────────────────────────────────

export function cacheActivePlans<T>(userId: string, plans: T[]): void {
  write(PLANS_CACHE_KEY, { userId, plans, updatedAt: new Date().toISOString() } satisfies CachedPlans<T>);
}

export function getCachedActivePlans<T>(userId: string): { plans: T[]; updatedAt: string } | null {
  const cached = read<CachedPlans<T>>(PLANS_CACHE_KEY);
  if (!cached || cached.userId !== userId) return null;
  return { plans: cached.plans ?? [], updatedAt: cached.updatedAt };
}

export function clearOfflinePlanningCache(): void {
  [GOAL_CACHE_KEY, GOAL_PENDING_KEY, PLANS_CACHE_KEY].forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  });
}
