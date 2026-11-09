/**
 * Armazenamento no aparelho (IndexedDB) da fila de envio, dos conflitos e
 * das últimas respostas do Supabase (para abrir as telas sem internet).
 */
import { openDB, type IDBPDatabase } from "idb";
import type { ConflictRecord, QueuedWrite } from "./postgrest";
import type { QueueStorage } from "./syncQueue";

export interface CachedResponse {
  key: string;
  userId: string;
  status: number;
  body: string;
  headers: Record<string, string>;
  savedAt: number;
}

const MAX_RESPONSES = 1000;
const PRUNE_TO = 800;

let dbPromise: Promise<IDBPDatabase> | null = null;
function db(): Promise<IDBPDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB indisponível"));
  dbPromise ??= openDB("fd-sync", 1, {
    upgrade(d) {
      d.createObjectStore("queue", { keyPath: "id" });
      d.createObjectStore("conflicts", { keyPath: "id" });
      const responses = d.createObjectStore("responses", { keyPath: "key" });
      responses.createIndex("savedAt", "savedAt");
    },
  });
  return dbPromise;
}

export const SYNC_CHANGED_EVENT = "fd:sync-changed";

export function notifySyncChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SYNC_CHANGED_EVENT));
}

// ─── Fila (com cópia em memória para leituras rápidas) ─────────────────────

let mirror: QueuedWrite[] = [];
let loaded: Promise<void> | null = null;

function ensureLoaded(): Promise<void> {
  loaded ??= db()
    .then((d) => d.getAll("queue"))
    .then((items) => {
      mirror = (items as QueuedWrite[]).sort((a, b) => a.seq - b.seq);
    })
    .catch(() => {
      mirror = [];
    });
  return loaded;
}

export const idbQueueStorage: QueueStorage = {
  async list() {
    await ensureLoaded();
    return [...mirror];
  },
  async put(item) {
    await ensureLoaded();
    mirror = [...mirror.filter((i) => i.id !== item.id), item].sort((a, b) => a.seq - b.seq);
    try {
      await (await db()).put("queue", item);
    } finally {
      notifySyncChanged();
    }
  },
  async remove(id) {
    await ensureLoaded();
    mirror = mirror.filter((i) => i.id !== id);
    try {
      await (await db()).delete("queue", id);
    } finally {
      notifySyncChanged();
    }
  },
  async addConflict(record: ConflictRecord) {
    try {
      await (await db()).put("conflicts", record);
    } catch {
      /* noop */
    }
  },
};

export async function pendingWritesFor(userId: string, table: string): Promise<QueuedWrite[]> {
  await ensureLoaded();
  return mirror.filter((i) => i.userId === userId && i.table === table);
}

export async function pendingWriteCount(userId?: string | null): Promise<number> {
  await ensureLoaded();
  return userId ? mirror.filter((i) => i.userId === userId).length : mirror.length;
}

export async function listConflicts(): Promise<ConflictRecord[]> {
  try {
    return ((await (await db()).getAll("conflicts")) as ConflictRecord[]).sort((a, b) => b.resolvedAt - a.resolvedAt);
  } catch {
    return [];
  }
}

// ─── Respostas guardadas ───────────────────────────────────────────────────

let putsSincePrune = 0;

export const responseCache = {
  async get(key: string): Promise<CachedResponse | undefined> {
    try {
      return (await (await db()).get("responses", key)) as CachedResponse | undefined;
    } catch {
      return undefined;
    }
  },
  async put(entry: CachedResponse): Promise<void> {
    try {
      const d = await db();
      await d.put("responses", entry);
      if (++putsSincePrune >= 50) {
        putsSincePrune = 0;
        const total = await d.count("responses");
        if (total > MAX_RESPONSES) {
          const tx = d.transaction("responses", "readwrite");
          let cursor = await tx.store.index("savedAt").openCursor();
          let toDelete = total - PRUNE_TO;
          while (cursor && toDelete > 0) {
            await cursor.delete();
            toDelete--;
            cursor = await cursor.continue();
          }
          await tx.done;
        }
      }
    } catch {
      /* noop: sem espaço ou sem IndexedDB */
    }
  },
  async clear(): Promise<void> {
    try {
      await (await db()).clear("responses");
    } catch {
      /* noop */
    }
  },
};
