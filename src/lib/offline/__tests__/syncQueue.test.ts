import { describe, it, expect } from "vitest";
import { createMemoryQueueStorage, flushQueue, type SendRequest } from "../syncQueue";
import type { QueuedWrite } from "../postgrest";

const BASE = "https://x.supabase.co/rest/v1";

function item(over: Partial<QueuedWrite>): QueuedWrite {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    seq: 1,
    userId: "u1",
    method: "PATCH",
    url: `${BASE}/course_modules?id=eq.m1`,
    table: "course_modules",
    prefer: "return=representation",
    apikey: "key",
    body: JSON.stringify({ is_completed: true }),
    createdAt: Date.parse("2026-11-09T10:00:00Z"),
    attempts: 0,
    ...over,
  };
}

const auth = async () => ({ userId: "u1", token: "tok" });

describe("fila de envio", () => {
  it("envia na ordem em que as alterações foram feitas", async () => {
    const { storage, items } = createMemoryQueueStorage([
      item({ id: "c", seq: 3, method: "POST", url: `${BASE}/notes`, body: '{"id":"n2"}' }),
      item({ id: "a", seq: 1, method: "POST", url: `${BASE}/notes`, body: '{"id":"n1"}' }),
      item({ id: "b", seq: 2, method: "DELETE", url: `${BASE}/notes?id=eq.n0`, body: null }),
    ]);
    const order: string[] = [];
    const send = async (req: SendRequest) => {
      order.push(`${req.method} ${req.body ?? req.url}`);
      return { status: 201, text: "" };
    };
    const res = await flushQueue({ storage, send, getAuth: auth });
    expect(order).toEqual(['POST {"id":"n1"}', `DELETE ${BASE}/notes?id=eq.n0`, 'POST {"id":"n2"}']);
    expect(res.sent).toBe(3);
    expect(items.size).toBe(0);
  });

  it("conflito: versão do servidor mais nova vence e a local é guardada", async () => {
    const { storage, items, conflicts } = createMemoryQueueStorage([item({ id: "p1" })]);
    const sent: string[] = [];
    const send = async (req: SendRequest) => {
      sent.push(req.method);
      if (req.method === "GET") return { status: 200, text: JSON.stringify([{ updated_at: "2026-11-09T11:00:00Z" }]) };
      return { status: 204, text: "" };
    };
    const res = await flushQueue({ storage, send, getAuth: auth });
    expect(sent).toEqual(["GET"]); // não sobrescreveu
    expect(res.conflicts).toBe(1);
    expect(conflicts[0].id).toBe("p1");
    expect(items.size).toBe(0);
  });

  it("conflito: alteração local mais nova é enviada", async () => {
    const { storage, items } = createMemoryQueueStorage([item({ id: "p1" })]);
    const sent: string[] = [];
    const send = async (req: SendRequest) => {
      sent.push(req.method);
      if (req.method === "GET") return { status: 200, text: JSON.stringify([{ updated_at: "2026-11-09T09:00:00Z" }]) };
      return { status: 204, text: "" };
    };
    const res = await flushQueue({ storage, send, getAuth: auth });
    expect(sent).toEqual(["GET", "PATCH"]);
    expect(res.sent).toBe(1);
    expect(items.size).toBe(0);
  });

  it("sem rede: para, mantém a ordem e tenta de novo depois", async () => {
    const { storage, items } = createMemoryQueueStorage([
      item({ id: "a", seq: 1, method: "POST", url: `${BASE}/notes`, body: '{"id":"n1"}' }),
      item({ id: "b", seq: 2, method: "POST", url: `${BASE}/notes`, body: '{"id":"n2"}' }),
    ]);
    let online = false;
    const send = async () => {
      if (!online) throw new TypeError("Failed to fetch");
      return { status: 201, text: "" };
    };
    const first = await flushQueue({ storage, send, getAuth: auth });
    expect(first.stoppedByNetwork).toBe(true);
    expect(first.sent).toBe(0);
    expect(items.size).toBe(2);
    expect(items.get("a")?.attempts).toBe(1);
    expect(items.get("b")?.attempts).toBe(0);

    online = true;
    const second = await flushQueue({ storage, send, getAuth: auth });
    expect(second.sent).toBe(2);
    expect(items.size).toBe(0);
  });

  it("servidor fora do ar (504) também fica para depois", async () => {
    const { storage, items } = createMemoryQueueStorage([
      item({ id: "a", method: "POST", url: `${BASE}/notes`, body: '{"id":"n1"}' }),
    ]);
    const res = await flushQueue({ storage, send: async () => ({ status: 504, text: "" }), getAuth: auth });
    expect(res.stoppedByNetwork).toBe(true);
    expect(items.size).toBe(1);
  });

  it("inserção que já chegou ao servidor (chave duplicada) não é repetida", async () => {
    const { storage, items, conflicts } = createMemoryQueueStorage([
      item({ id: "a", method: "POST", url: `${BASE}/notes`, body: '{"id":"n1"}' }),
    ]);
    const res = await flushQueue({
      storage,
      send: async () => ({ status: 409, text: '{"code":"23505"}' }),
      getAuth: auth,
    });
    expect(res.sent).toBe(1);
    expect(conflicts).toHaveLength(0);
    expect(items.size).toBe(0);
  });

  it("só envia as alterações do usuário logado", async () => {
    const { storage, items } = createMemoryQueueStorage([
      item({ id: "mine", method: "DELETE", body: null }),
      item({ id: "other", userId: "u2", method: "DELETE", body: null }),
    ]);
    const res = await flushQueue({ storage, send: async () => ({ status: 204, text: "" }), getAuth: auth });
    expect(res.sent).toBe(1);
    expect([...items.keys()]).toEqual(["other"]);
  });
});
