/**
 * Guarda o cache de dados (React Query) no aparelho para abrir instantâneo
 * e funcionar sem internet.
 */
import { openDB } from "idb";
import type { Persister, PersistedClient } from "@tanstack/react-query-persist-client";

const store = () =>
  openDB("fd-query-cache", 1, {
    upgrade(d) {
      d.createObjectStore("kv");
    },
  });

export function createIdbPersister(key = "client"): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try { await (await store()).put("kv", client, key); } catch { /* noop */ }
    },
    restoreClient: async () => {
      try { return (await (await store()).get("kv", key)) as PersistedClient | undefined; } catch { return undefined; }
    },
    removeClient: async () => {
      try { await (await store()).delete("kv", key); } catch { /* noop */ }
    },
  };
}
