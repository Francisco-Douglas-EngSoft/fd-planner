/**
 * Camada entre o app e o Supabase:
 *  - Leituras: tempo limite, junta pedidos iguais simultâneos e guarda a
 *    última resposta no aparelho. Sem internet (ou com 504), usa a cópia local.
 *  - Escritas: sem internet, a alteração vai para a fila de envio e a tela
 *    recebe "sucesso" na hora.
 */
import { createTimeoutFetch, READ_TIMEOUT_MS } from "@/lib/fetchWithTimeout";
import {
  applyPendingWrites,
  isIdempotentWrite,
  restTable,
  syntheticWriteResponse,
  userIdFromAuthHeader,
  withClientIds,
  type QueueMethod,
  type QueuedWrite,
} from "./postgrest";
import type { CachedResponse } from "./idbStore";

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface OfflineFetchDeps {
  base: FetchFn;
  isSupabaseUrl: (url: string) => boolean;
  isOnline: () => boolean;
  fallbackUserId: () => string | null;
  cache: {
    get: (key: string) => Promise<CachedResponse | undefined>;
    put: (entry: CachedResponse) => Promise<void>;
  };
  queue: {
    enqueue: (item: QueuedWrite) => Promise<void>;
    pendingFor: (userId: string, table: string) => Promise<QueuedWrite[]>;
  };
  timeoutMs?: number;
  /**
   * Servidor lento: depois deste tempo, abre a cópia guardada enquanto a resposta
   * do servidor continua chegando em segundo plano (e atualiza a cópia).
   * Desligado quando ausente.
   */
  fastCacheMs?: number;
  /** Momento da última alteração por tabela: cópias mais antigas não são usadas como atalho. */
  writeMarks?: {
    get: (table: string) => number;
    mark: (table: string) => void;
  };
}

let seqCounter = 0;
function nextSeq(): number {
  seqCounter = (seqCounter + 1) % 1000;
  return Date.now() * 1000 + seqCounter;
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const SERVER_TIMEOUT_MESSAGE =
  "O servidor demorou demais para responder. Tente novamente em alguns instantes.";

function isAbortError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { name?: string }).name === "AbortError";
}

function serverTimeoutResponse(): Response {
  return new Response(
    JSON.stringify({ message: SERVER_TIMEOUT_MESSAGE, code: "TIMEOUT", details: null, hint: null }),
    { status: 504, headers: { "content-type": "application/json", "x-fd-offline": "timeout" } },
  );
}

function offlineError(): TypeError {
  return new TypeError("Failed to fetch (offline)");
}

export function createOfflineFetch(deps: OfflineFetchDeps): FetchFn {
  const timed = createTimeoutFetch(deps.base, deps.timeoutMs ?? READ_TIMEOUT_MS);
  const inflight = new Map<string, Promise<Response>>();

  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!deps.isSupabaseUrl(url)) return deps.base(input, init);
    if (input instanceof Request && !init) return deps.base(input, init);

    const method = (init?.method ?? "GET").toUpperCase();
    const headers = new Headers(init?.headers);
    const userId = userIdFromAuthHeader(headers.get("authorization")) ?? deps.fallbackUserId();
    let pathname = "";
    try {
      pathname = new URL(url).pathname;
    } catch {
      return deps.base(input, init);
    }
    const table = restTable(url);

    // ─── Leituras ───
    const isRead = method === "GET" || method === "HEAD";
    if (isRead && (pathname.startsWith("/rest/v1/") || pathname === "/auth/v1/user")) {
      const accept = headers.get("accept") ?? "";
      const single = accept.includes("vnd.pgrst.object");
      const key = `${userId ?? "anon"}|${method}|${accept}|${url}`;

      const withPending = async (body: string): Promise<string> => {
        if (method !== "GET" || !table || !userId) return body;
        const pending = await deps.queue.pendingFor(userId, table);
        return pending.length ? applyPendingWrites(body, url, single, pending) : body;
      };

      const fromEntry = async (entry: CachedResponse): Promise<Response> => {
        const body = await withPending(entry.body);
        return new Response(method === "HEAD" ? null : body, {
          status: entry.status,
          headers: { ...entry.headers, "x-fd-offline": "cache" },
        });
      };

      const fromCache = async (): Promise<Response | null> => {
        const entry = await deps.cache.get(key);
        return entry ? fromEntry(entry) : null;
      };

      if (!deps.isOnline()) {
        const cached = await fromCache();
        if (cached) return cached;
        throw offlineError();
      }

      const runNetwork = async (): Promise<Response> => {
        try {
          const res = await timed(input, init);
          if (res.ok) {
            const text = method === "HEAD" ? "" : await res.clone().text();
            const kept: Record<string, string> = {};
            for (const h of ["content-type", "content-range"]) {
              const v = res.headers.get(h);
              if (v) kept[h] = v;
            }
            void deps.cache.put({ key, userId: userId ?? "anon", status: res.status, body: text, headers: kept, savedAt: Date.now() });
            if (method === "GET" && table && userId) {
              const merged = await withPending(text);
              if (merged !== text) return new Response(merged, { status: res.status, headers: res.headers });
            }
            return res;
          }
          if (res.status >= 500) {
            const cached = await fromCache();
            if (cached) return cached;
          }
          return res;
        } catch (err) {
          if (init?.signal?.aborted) throw err;
          const cached = await fromCache();
          if (cached) return cached;
          // Tempo limite esgotado e nada guardado: devolve um erro legível em vez de
          // "AbortError: signal is aborted without reason".
          if (isAbortError(err) && pathname.startsWith("/rest/v1/")) return serverTimeoutResponse();
          throw err;
        }
      };

      const run = async (): Promise<Response> => {
        const network = runNetwork();
        const fastMs = deps.fastCacheMs;
        if (!fastMs || method !== "GET" || !pathname.startsWith("/rest/v1/")) return network;
        network.catch(() => {});
        let timer: ReturnType<typeof setTimeout> | undefined;
        const quick = new Promise<Response | null>((resolve) => {
          timer = setTimeout(async () => {
            try {
              const entry = await deps.cache.get(key);
              const changedSince = table && deps.writeMarks ? deps.writeMarks.get(table) : 0;
              resolve(entry && entry.savedAt >= changedSince ? await fromEntry(entry) : null);
            } catch {
              resolve(null);
            }
          }, fastMs);
        });
        try {
          return await Promise.race([network, quick.then((cached) => cached ?? network)]);
        } finally {
          clearTimeout(timer);
        }
      };

      if (init?.signal) return run();
      let shared = inflight.get(key);
      if (!shared) {
        shared = run();
        inflight.set(key, shared);
        const cleanup = () => inflight.delete(key);
        shared.then(cleanup, cleanup);
      }
      return shared.then((r) => r.clone());
    }

    // ─── Escritas ───
    const isWrite = method === "POST" || method === "PATCH" || method === "DELETE";
    const body = init?.body;
    if (!isWrite || !table || !userId || (body != null && typeof body !== "string")) {
      return deps.base(input, init);
    }
    const prefer = headers.get("prefer") ?? "";
    deps.writeMarks?.mark(table);

    const queueIt = async (): Promise<Response> => {
      let itemUrl = url;
      let itemBody = (body as string | undefined) ?? null;
      if (method === "POST" && itemBody) {
        const prepared = withClientIds(itemUrl, itemBody);
        itemUrl = prepared.url;
        itemBody = prepared.body;
      }
      const item: QueuedWrite = {
        id: genId(),
        seq: nextSeq(),
        userId,
        method: method as QueueMethod,
        url: itemUrl,
        table,
        prefer,
        apikey: headers.get("apikey"),
        body: itemBody,
        createdAt: Date.now(),
        attempts: 0,
      };
      await deps.queue.enqueue(item);
      return syntheticWriteResponse(item, headers.get("accept") ?? "");
    };

    if (!deps.isOnline()) return queueIt();
    try {
      const res = await deps.base(input, init);
      if (res.status >= 502 && res.status <= 504 && isIdempotentWrite(method, prefer, (body as string) ?? null)) {
        return queueIt();
      }
      return res;
    } catch (err) {
      if (init?.signal?.aborted) throw err;
      return queueIt();
    }
  };
}
