import { describe, it, expect, vi } from "vitest";
import { createOfflineFetch, SERVER_TIMEOUT_MESSAGE } from "../offlineFetch";
import type { CachedResponse } from "../idbStore";
import type { QueuedWrite } from "../postgrest";

const BASE = "https://x.supabase.co/rest/v1";

function jwt(sub: string) {
  const payload = btoa(JSON.stringify({ sub })).replace(/=+$/, "");
  return `Bearer h.${payload}.s`;
}

function setup(
  opts: {
    online?: boolean;
    base?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
    fastCacheMs?: number;
    timeoutMs?: number;
  } = {},
) {
  const marks = new Map<string, number>();
  const cache = new Map<string, CachedResponse>();
  const queue: QueuedWrite[] = [];
  let online = opts.online ?? true;
  const base = vi.fn(opts.base ?? (async () => new Response("[]", { status: 200 })));
  const f = createOfflineFetch({
    base,
    isSupabaseUrl: (u) => u.includes("supabase.co"),
    isOnline: () => online,
    fallbackUserId: () => null,
    cache: { get: async (k) => cache.get(k), put: async (e) => void cache.set(e.key, e) },
    queue: {
      enqueue: async (i) => void queue.push(i),
      pendingFor: async (u, t) => queue.filter((i) => i.userId === u && i.table === t),
    },
    timeoutMs: opts.timeoutMs ?? 50,
    fastCacheMs: opts.fastCacheMs,
    writeMarks: { get: (t) => marks.get(t) ?? 0, mark: (t) => void marks.set(t, Date.now()) },
  });
  return { f, base, cache, queue, setOnline: (v: boolean) => (online = v) };
}

const headers = { Authorization: jwt("u1"), apikey: "key", Accept: "application/json" };

describe("leituras sem internet", () => {
  it("abre com os dados guardados e já mostra a alteração feita offline", async () => {
    const url = `${BASE}/course_modules?select=*&course_id=eq.c1`;
    const { f, setOnline } = setup({
      base: async () =>
        new Response(JSON.stringify([{ id: "m1", course_id: "c1", is_completed: false }]), { status: 200 }),
    });
    await (await f(url, { headers })).text(); // online: guarda a resposta
    setOnline(false);

    await f(`${BASE}/course_modules?id=eq.m1`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal", "Content-Type": "application/json" },
      body: JSON.stringify({ is_completed: true }),
    });

    const res = await f(url, { headers });
    expect(await res.json()).toEqual([{ id: "m1", course_id: "c1", is_completed: true }]);
  });

  it("servidor com erro 504: usa a cópia local em vez de falhar", async () => {
    const url = `${BASE}/courses?select=*`;
    let fail = false;
    const { f } = setup({
      base: async () => (fail ? new Response("", { status: 504 }) : new Response('[{"id":"c1"}]', { status: 200 })),
    });
    await (await f(url, { headers })).text();
    fail = true;
    const res = await f(url, { headers });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "c1" }]);
  });

  it("servidor travado e nada guardado: responde 504 com mensagem legível, sem AbortError", async () => {
    const { f } = setup({
      base: (_input, init) =>
        new Promise((_res, rej) =>
          init?.signal?.addEventListener("abort", () => rej(new DOMException("signal is aborted without reason", "AbortError"))),
        ),
    });
    const res = await f(`${BASE}/courses?select=*`, { headers });
    expect(res.status).toBe(504);
    expect((await res.json()).message).toBe(SERVER_TIMEOUT_MESSAGE);
  });

  it("servidor travado com cópia guardada: abre a cópia", async () => {
    const url = `${BASE}/courses?select=*`;
    let hang = false;
    const { f } = setup({
      base: (_input, init) =>
        hang
          ? new Promise((_res, rej) =>
              init?.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError"))),
            )
          : Promise.resolve(new Response('[{"id":"c1"}]', { status: 200 })),
    });
    await (await f(url, { headers })).text();
    hang = true;
    const res = await f(url, { headers });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: "c1" }]);
  });

  it("pedidos iguais ao mesmo tempo chegam ao servidor uma vez só", async () => {
    const { f, base } = setup();
    const url = `${BASE}/courses?select=*`;
    const [a, b] = await Promise.all([f(url, { headers }), f(url, { headers })]);
    expect(base).toHaveBeenCalledTimes(1);
    expect(await a.text()).toBe("[]");
    expect(await b.text()).toBe("[]");
  });
});

describe("escritas sem internet", () => {
  it("vai para a fila com id gerado no aparelho e a tela recebe o registro", async () => {
    const { f, base, queue } = setup({ online: false });
    const res = await f(`${BASE}/study_notes?select=*`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "return=representation",
        Accept: "application/vnd.pgrst.object+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "Nota offline", user_id: "u1" }),
    });
    expect(base).not.toHaveBeenCalled();
    expect(res.status).toBe(201);
    const row = await res.json();
    expect(row.title).toBe("Nota offline");
    expect(typeof row.id).toBe("string");
    expect(queue).toHaveLength(1);
    expect(JSON.parse(queue[0].body ?? "{}").id).toBe(row.id);
  });

  it("falha de rede no envio também guarda na fila", async () => {
    const { f, queue } = setup({
      base: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    const res = await f(`${BASE}/courses?id=eq.c1`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ name: "Novo" }),
    });
    expect(res.status).toBe(204);
    expect(queue.map((q) => q.method)).toEqual(["PATCH"]);
  });
});

describe("servidor lento", () => {
  const slow = (ms: number, body: string) => () =>
    new Promise<Response>((res) => setTimeout(() => res(new Response(body, { status: 200 })), ms));

  it("demora mais que o limite e há cópia guardada: abre a cópia sem esperar o servidor", async () => {
    const url = `${BASE}/courses?select=*`;
    let delay = 0;
    const { f, cache } = setup({
      fastCacheMs: 30,
      timeoutMs: 1000,
      base: () => slow(delay, delay ? '[{"id":"novo"}]' : '[{"id":"c1"}]')(),
    });
    await (await f(url, { headers })).text();
    delay = 200;

    const start = Date.now();
    const res = await f(url, { headers });
    expect(Date.now() - start).toBeLessThan(150);
    expect(await res.json()).toEqual([{ id: "c1" }]);

    // A resposta do servidor continua chegando e atualiza a cópia para a próxima vez.
    await new Promise((r) => setTimeout(r, 250));
    expect([...cache.values()][0].body).toBe('[{"id":"novo"}]');
  });

  it("servidor responde antes do limite: usa a resposta nova", async () => {
    const url = `${BASE}/courses?select=*`;
    let body = '[{"id":"c1"}]';
    const { f } = setup({ fastCacheMs: 100, timeoutMs: 1000, base: () => slow(10, body)() });
    await (await f(url, { headers })).text();
    body = '[{"id":"c2"}]';
    expect(await (await f(url, { headers })).json()).toEqual([{ id: "c2" }]);
  });

  it("depois de alterar a tabela, não abre a cópia antiga: espera o servidor", async () => {
    const url = `${BASE}/courses?select=*`;
    let delay = 0;
    let body = '[{"id":"c1"}]';
    const { f } = setup({ fastCacheMs: 30, timeoutMs: 1000, base: () => slow(delay, body)() });
    await (await f(url, { headers })).text();

    await new Promise((r) => setTimeout(r, 5));
    await f(`${BASE}/courses`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal", "Content-Type": "application/json" },
      body: JSON.stringify({ id: "c2" }),
    });
    delay = 120;
    body = '[{"id":"c1"},{"id":"c2"}]';
    expect(await (await f(url, { headers })).json()).toEqual([{ id: "c1" }, { id: "c2" }]);
  });
});
