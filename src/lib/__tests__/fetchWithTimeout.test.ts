import { describe, it, expect, vi } from "vitest";
import { createTimeoutFetch } from "../fetchWithTimeout";

const hanging = vi.fn((_i: RequestInfo | URL, init?: RequestInit) =>
  new Promise<Response>((_res, rej) => {
    init?.signal?.addEventListener("abort", () => rej(new Error("aborted")));
  }),
) as unknown as typeof fetch;

describe("createTimeoutFetch", () => {
  it("aborta leituras que travam", async () => {
    const f = createTimeoutFetch(hanging, 20);
    await expect(f("https://x.supabase.co/rest/v1/books")).rejects.toThrow("aborted");
  });

  it("não aplica limite a escritas", async () => {
    const ok = vi.fn(async (_i: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal).toBeUndefined();
      return new Response("ok");
    }) as unknown as typeof fetch;
    const f = createTimeoutFetch(ok, 20);
    await f("https://x.supabase.co/rest/v1/books", { method: "POST" });
  });

  it("não aplica limite ao Storage (arquivos grandes)", async () => {
    const ok = vi.fn(async (_i: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal).toBeUndefined();
      return new Response("ok");
    }) as unknown as typeof fetch;
    await createTimeoutFetch(ok, 20)("https://x.supabase.co/storage/v1/object/books/a.pdf");
  });
});
