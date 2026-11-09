/**
 * Fila de envio: alterações feitas sem internet ficam guardadas no aparelho
 * e são enviadas ao Supabase, em ordem, quando a conexão volta.
 *
 * Conflitos: vale a alteração mais recente. Se o servidor tiver uma versão
 * mais nova (`updated_at` maior que o momento da alteração local), a versão
 * local NÃO sobrescreve — ela é guardada em "conflitos" para não se perder.
 */
import {
  minimalPrefer,
  parseFilters,
  withoutClientIds,
  type ConflictRecord,
  type QueuedWrite,
} from "./postgrest";

export interface QueueStorage {
  list(): Promise<QueuedWrite[]>;
  put(item: QueuedWrite): Promise<void>;
  remove(id: string): Promise<void>;
  addConflict(record: ConflictRecord): Promise<void>;
}

export interface SendRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

export interface FlushDeps {
  storage: QueueStorage;
  /** Envia direto ao servidor. Deve lançar erro quando não há rede. */
  send: (req: SendRequest) => Promise<{ status: number; text: string }>;
  /** Sessão atual; null quando não há usuário logado. */
  getAuth: () => Promise<{ userId: string; token: string } | null>;
  now?: () => number;
}

export interface FlushResult {
  sent: number;
  conflicts: number;
  failed: number;
  remaining: number;
  stoppedByNetwork: boolean;
}

function headersFor(item: QueuedWrite, token: string): Record<string, string> {
  return {
    apikey: item.apikey ?? "",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    Prefer: minimalPrefer(item.prefer),
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 401 || status === 408 || status === 429 || status >= 500;
}

/** O servidor já tem uma versão mais nova desta linha? */
async function serverIsNewer(
  item: QueuedWrite,
  headers: Record<string, string>,
  send: FlushDeps["send"],
): Promise<string | null> {
  const { eq, complex } = parseFilters(item.url);
  if (complex || Object.keys(eq).length === 0) return null;
  const u = new URL(item.url);
  const check = new URL(`${u.origin}${u.pathname}`);
  Object.entries(eq).forEach(([k, v]) => check.searchParams.set(k, `eq.${v}`));
  check.searchParams.set("select", "updated_at");
  const res = await send({
    url: check.toString(),
    method: "GET",
    headers: { ...headers, Prefer: "" },
    body: null,
  });
  if (res.status < 200 || res.status >= 300) {
    if (isRetryableStatus(res.status)) throw new Error(`HTTP ${res.status}`);
    return null; // tabela sem updated_at: segue com o envio
  }
  try {
    const rows = JSON.parse(res.text) as { updated_at?: string | null }[];
    const newer = rows.find((r) => r.updated_at && Date.parse(r.updated_at) > item.createdAt);
    return newer?.updated_at ?? null;
  } catch {
    return null;
  }
}

let flushing: Promise<FlushResult> | null = null;

export function flushQueue(deps: FlushDeps): Promise<FlushResult> {
  flushing ??= runFlush(deps).finally(() => {
    flushing = null;
  });
  return flushing;
}

async function runFlush({ storage, send, getAuth, now = Date.now }: FlushDeps): Promise<FlushResult> {
  const result: FlushResult = { sent: 0, conflicts: 0, failed: 0, remaining: 0, stoppedByNetwork: false };
  const all = await storage.list();
  const auth = await getAuth().catch(() => null);
  if (!auth) {
    result.remaining = all.length;
    return result;
  }
  const items = all.filter((i) => i.userId === auth.userId).sort((a, b) => a.seq - b.seq);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const headers = headersFor(item, auth.token);
    try {
      if (item.method === "PATCH") {
        const newer = await serverIsNewer(item, headers, send);
        if (newer) {
          await storage.addConflict({
            ...item,
            reason: "server-newer",
            detail: `Servidor atualizado em ${newer}`,
            resolvedAt: now(),
          });
          await storage.remove(item.id);
          result.conflicts++;
          continue;
        }
      }

      let req: SendRequest = { url: item.url, method: item.method, headers, body: item.body };
      let res = await send(req);

      // Tabela sem coluna `id`: reenvia sem o id gerado no aparelho.
      if (item.method === "POST" && res.status === 400 && item.body && /\bid\b/.test(res.text) && /column/i.test(res.text)) {
        const stripped = withoutClientIds(item.url, item.body);
        req = { ...req, url: stripped.url, body: stripped.body };
        res = await send(req);
      }

      const ok = res.status >= 200 && res.status < 300;
      const alreadyThere = item.method === "POST" && res.status === 409 && res.text.includes("23505");
      if (ok || alreadyThere) {
        await storage.remove(item.id);
        result.sent++;
        continue;
      }

      if (isRetryableStatus(res.status)) {
        await storage.put({ ...item, attempts: item.attempts + 1, lastError: `HTTP ${res.status}` });
        result.remaining = items.length - i;
        result.stoppedByNetwork = true;
        return result;
      }

      // Erro definitivo (ex.: dado inválido): guarda para não perder e segue.
      await storage.addConflict({ ...item, reason: `HTTP ${res.status}`, detail: res.text.slice(0, 500), resolvedAt: now() });
      await storage.remove(item.id);
      result.failed++;
    } catch (err) {
      await storage.put({
        ...item,
        attempts: item.attempts + 1,
        lastError: err instanceof Error ? err.message : String(err),
      });
      result.remaining = items.length - i;
      result.stoppedByNetwork = true;
      return result;
    }
  }
  return result;
}

/** Fila em memória (testes). */
export function createMemoryQueueStorage(initial: QueuedWrite[] = []) {
  const items = new Map(initial.map((i) => [i.id, i]));
  const conflicts: ConflictRecord[] = [];
  const storage: QueueStorage = {
    list: async () => [...items.values()],
    put: async (item) => {
      items.set(item.id, item);
    },
    remove: async (id) => {
      items.delete(id);
    },
    addConflict: async (c) => {
      conflicts.push(c);
    },
  };
  return { storage, items, conflicts };
}
