/**
 * Liga a camada offline ao `fetch` do navegador ANTES de o cliente do
 * Supabase ser criado (por isso é o primeiro import de main.tsx).
 * Não importar o cliente do Supabase de forma estática aqui.
 */
import { createOfflineFetch } from "./offlineFetch";
import { idbQueueStorage, pendingWritesFor, responseCache, notifySyncChanged } from "./idbStore";
import { getOfflineUserId } from "./offlineUser";
import { flushQueue, type FlushResult } from "./syncQueue";

type FetchFn = typeof fetch;

let baseFetch: FetchFn | null = null;

const envHost = (() => {
  try {
    const raw = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    return raw ? new URL(raw).hostname : null;
  } catch {
    return null;
  }
})();

function isSupabaseUrl(url: string): boolean {
  try {
    const host = new URL(url, "http://local").hostname;
    return host.endsWith(".supabase.co") || host.endsWith(".supabase.in") || (!!envHost && host === envHost);
  } catch {
    return false;
  }
}

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

export function installOfflineFetch(): void {
  if (typeof window === "undefined" || baseFetch) return;
  const original = window.fetch.bind(window);
  baseFetch = original;
  const wrapped = createOfflineFetch({
    base: original,
    isSupabaseUrl,
    isOnline,
    fallbackUserId: getOfflineUserId,
    cache: responseCache,
    queue: { enqueue: (item) => idbQueueStorage.put(item), pendingFor: pendingWritesFor },
  });
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => wrapped(input, init)) as FetchFn;
}

/** Envia ao Supabase as alterações guardadas na fila. */
export async function flushWriteQueue(): Promise<FlushResult> {
  const send = baseFetch ?? fetch;
  const result = await flushQueue({
    storage: idbQueueStorage,
    send: async (req) => {
      const res = await send(req.url, {
        method: req.method,
        headers: Object.fromEntries(Object.entries(req.headers).filter(([, v]) => v !== "")),
        body: req.body ?? undefined,
      });
      return { status: res.status, text: await res.text().catch(() => "") };
    },
    getAuth: async () => {
      if (!isOnline()) return null;
      const { supabase } = await import("@/integrations/supabase/client");
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      return session ? { userId: session.user.id, token: session.access_token } : null;
    },
  });
  notifySyncChanged();
  return result;
}

export async function clearOfflineReadCache(): Promise<void> {
  await responseCache.clear();
}
