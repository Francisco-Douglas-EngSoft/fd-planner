import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("sem login, ninguém cria conta", async () => {
  const res = await fetch(`${URL}/functions/v1/developer-create-user`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ full_name: "X", email: "x@example.com", password: "Aa1!aaaaaa" }),
  });
  await res.text();
  assertEquals(res.status, 401);
});

Deno.test("com o cadastro público fechado, a página de login não cria conta", async () => {
  const res = await fetch(`${URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: `gate-test-${Date.now()}@example.com`, password: "Aa1!aaaaaa" }),
  });
  const body = await res.json();
  assertEquals(res.status, 500);
  assertEquals(body.message, "Cadastro público desativado");
});
