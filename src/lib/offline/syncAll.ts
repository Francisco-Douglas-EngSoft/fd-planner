/**
 * Junta todas as filas de envio (alterações gerais, sessões de Foco,
 * sessões de leitura e meta global) num único "Sincronizar agora".
 */
import { flushWriteQueue, isOnline } from "./install";
import { notifySyncChanged, pendingWriteCount } from "./idbStore";
import { getOfflineUserId } from "./offlineUser";
import { flushFocusQueue, getPendingCount as getPendingFocusCount } from "@/lib/offlineFocusQueue";
import { flushOfflineQueue as flushReadingQueue, getPendingReadingCount } from "@/services/readingSessionService";
import { flushGlobalGoalQueue, hasPendingGlobalGoal } from "@/lib/offlinePlanningStore";

export const SYNC_COMPLETE_EVENT = "fd:sync-complete";

export interface SyncCompleteDetail {
  sent: number;
  conflicts: number;
  failed: number;
}

export async function getPendingTotal(userId?: string | null): Promise<number> {
  const uid = userId ?? getOfflineUserId();
  const writes = await pendingWriteCount(uid);
  return writes + getPendingFocusCount() + getPendingReadingCount() + (hasPendingGlobalGoal(uid) ? 1 : 0);
}

let running: Promise<SyncCompleteDetail> | null = null;

export function syncNow(): Promise<SyncCompleteDetail> {
  if (!isOnline()) return Promise.resolve({ sent: 0, conflicts: 0, failed: 0 });
  running ??= (async () => {
    const detail: SyncCompleteDetail = { sent: 0, conflicts: 0, failed: 0 };
    try {
      // Ordem importa: primeiro as alterações gerais (ex.: um curso criado offline).
      const writes = await flushWriteQueue();
      detail.sent += writes.sent;
      detail.conflicts += writes.conflicts;
      detail.failed += writes.failed;
      const focus = await flushFocusQueue();
      detail.sent += focus.sent;
      await flushReadingQueue();
      if (await flushGlobalGoalQueue(getOfflineUserId())) detail.sent += 1;
    } catch {
      /* tenta de novo depois */
    }
    if (detail.sent > 0 || detail.conflicts > 0 || detail.failed > 0) {
      window.dispatchEvent(new CustomEvent<SyncCompleteDetail>(SYNC_COMPLETE_EVENT, { detail }));
    }
    notifySyncChanged();
    return detail;
  })().finally(() => {
    running = null;
  });
  return running;
}

let installed = false;

export function installAutoSync(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const trySync = () => {
    void syncNow();
  };
  setTimeout(trySync, 2500);
  window.addEventListener("online", trySync);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") trySync();
  });
  setInterval(() => {
    void getPendingTotal().then((n) => {
      if (n > 0) trySync();
    });
  }, 30_000);
}
