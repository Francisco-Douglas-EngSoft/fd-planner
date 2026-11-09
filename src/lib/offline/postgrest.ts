/**
 * Funções puras para entender e simular respostas da API REST do Supabase
 * (PostgREST) quando o aparelho está sem internet.
 */

export type QueueMethod = "POST" | "PATCH" | "DELETE";

export interface QueuedWrite {
  id: string;
  seq: number;
  userId: string;
  method: QueueMethod;
  url: string;
  table: string;
  prefer: string;
  apikey: string | null;
  body: string | null;
  /** Momento (ms) em que a alteração foi feita no aparelho — usado no "vale a mais recente". */
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface ConflictRecord extends QueuedWrite {
  reason: string;
  detail?: string;
  resolvedAt: number;
}

type Row = Record<string, unknown>;

const RESERVED_PARAMS = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

export function restTable(url: string): string | null {
  try {
    const m = new URL(url).pathname.match(/\/rest\/v1\/([^/]+)$/);
    if (!m || m[1] === "rpc") return null;
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}

/** Lê os filtros `coluna=eq.valor`. `complex` indica filtros que não sabemos avaliar. */
export function parseFilters(url: string): { eq: Record<string, string>; complex: boolean } {
  const eq: Record<string, string> = {};
  let complex = false;
  try {
    new URL(url).searchParams.forEach((value, key) => {
      if (RESERVED_PARAMS.has(key)) return;
      if (value.startsWith("eq.")) eq[key] = value.slice(3);
      else complex = true;
    });
  } catch {
    complex = true;
  }
  return { eq, complex };
}

function matches(row: Row, eq: Record<string, string>): boolean {
  return Object.entries(eq).every(([k, v]) => row[k] !== undefined && row[k] !== null && String(row[k]) === v);
}

function toRows(value: unknown): Row[] {
  if (Array.isArray(value)) return value.filter((r): r is Row => !!r && typeof r === "object");
  return value && typeof value === "object" ? [value as Row] : [];
}

function safeParse(text: string | null): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Garante um `id` gerado no aparelho em cada linha inserida, para que a tela
 * possa usar o registro antes de ele chegar ao servidor (e o reenvio não duplique).
 */
export function withClientIds(url: string, body: string): { url: string; body: string } {
  const parsed = safeParse(body);
  if (!parsed || typeof parsed !== "object") return { url, body };
  const rows = toRows(parsed).map((r) => (r.id === undefined || r.id === null ? { ...r, id: genId() } : r));
  let nextUrl = url;
  try {
    const u = new URL(url);
    const cols = u.searchParams.get("columns");
    if (cols && !cols.split(",").some((c) => c.replace(/"/g, "") === "id")) {
      u.searchParams.set("columns", `${cols},"id"`);
      nextUrl = u.toString();
    }
  } catch {
    /* noop */
  }
  return { url: nextUrl, body: JSON.stringify(Array.isArray(parsed) ? rows : rows[0]) };
}

/** Remove o `id` gerado no aparelho (para tabelas que não têm essa coluna). */
export function withoutClientIds(url: string, body: string): { url: string; body: string } {
  const parsed = safeParse(body);
  const rows = toRows(parsed).map(({ id: _id, ...rest }) => rest);
  let nextUrl = url;
  try {
    const u = new URL(url);
    const cols = u.searchParams.get("columns");
    if (cols) {
      u.searchParams.set("columns", cols.split(",").filter((c) => c.replace(/"/g, "") !== "id").join(","));
      nextUrl = u.toString();
    }
  } catch {
    /* noop */
  }
  return { url: nextUrl, body: JSON.stringify(Array.isArray(parsed) ? rows : rows[0]) };
}

export function isUpsert(prefer: string): boolean {
  return /resolution=merge-duplicates/.test(prefer);
}

/** Pode ser reenviado sem risco de criar duplicatas? */
export function isIdempotentWrite(method: string, prefer: string, body: string | null): boolean {
  if (method === "PATCH" || method === "DELETE") return true;
  if (isUpsert(prefer)) return true;
  const rows = toRows(safeParse(body));
  return rows.length > 0 && rows.every((r) => r.id !== undefined && r.id !== null);
}

/**
 * Aplica as alterações ainda não enviadas sobre uma resposta de leitura,
 * para que a tela mostre o que o usuário já mudou no aparelho.
 */
export function applyPendingWrites(bodyText: string, readUrl: string, single: boolean, pending: QueuedWrite[]): string {
  const data = safeParse(bodyText);
  if (data === null && bodyText) return bodyText;
  let rows: Row[];
  if (single) rows = data ? toRows(data) : [];
  else if (Array.isArray(data)) rows = toRows(data);
  else return bodyText;

  const readFilters = parseFilters(readUrl);
  let select: string | null = null;
  try {
    select = new URL(readUrl).searchParams.get("select");
  } catch {
    /* noop */
  }
  const simpleSelect = !select || select === "*";

  const ordered = [...pending].sort((a, b) => a.seq - b.seq);
  for (const item of ordered) {
    const wf = parseFilters(item.url);
    if (item.method === "PATCH") {
      if (wf.complex || Object.keys(wf.eq).length === 0) continue;
      const patch = toRows(safeParse(item.body))[0];
      if (!patch) continue;
      rows = rows.map((r) => (matches(r, wf.eq) ? { ...r, ...patch } : r));
    } else if (item.method === "DELETE") {
      if (wf.complex || Object.keys(wf.eq).length === 0) continue;
      rows = rows.filter((r) => !matches(r, wf.eq));
    } else {
      for (const p of toRows(safeParse(item.body))) {
        const idx = p.id !== undefined ? rows.findIndex((r) => r.id === p.id) : -1;
        if (idx >= 0) rows[idx] = { ...rows[idx], ...p };
        else if (!single && simpleSelect && !readFilters.complex && matches(p, readFilters.eq)) rows.push(p);
      }
    }
  }

  if (single) return rows[0] ? JSON.stringify(rows[0]) : bodyText;
  return JSON.stringify(rows);
}

/** Resposta de "sucesso" devolvida à tela quando a alteração ficou na fila. */
export function syntheticWriteResponse(item: QueuedWrite, accept: string, now = Date.now()): Response {
  const wantsRep = /return=representation/.test(item.prefer);
  const single = accept.includes("vnd.pgrst.object");
  const iso = new Date(now).toISOString();
  let rows: Row[] = [];
  if (item.method === "POST") {
    rows = toRows(safeParse(item.body)).map((r) => ({ created_at: iso, updated_at: iso, ...r }));
  } else if (item.method === "PATCH") {
    rows = [{ ...parseFilters(item.url).eq, ...(toRows(safeParse(item.body))[0] ?? {}), updated_at: iso }];
  }
  const headers = { "content-type": "application/json; charset=utf-8", "x-fd-offline": "queued" };
  const status = item.method === "POST" ? 201 : wantsRep ? 200 : 204;
  if (!wantsRep) return new Response(null, { status: item.method === "POST" ? 201 : 204, headers });
  return new Response(JSON.stringify(single ? (rows[0] ?? null) : rows), { status, headers });
}

/** Identifica o usuário a partir do token enviado (campo `sub` do JWT). */
export function userIdFromAuthHeader(header: string | null): string | null {
  if (!header) return null;
  const token = header.replace(/^Bearer\s+/i, "");
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { sub?: string; role?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export function minimalPrefer(prefer: string): string {
  const parts = prefer
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !p.startsWith("return="));
  parts.push("return=minimal");
  return parts.join(",");
}
