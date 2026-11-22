import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, clientIpFrom, rateLimitResponse } from "../_shared/rate-limit.ts";

/**
 * Cria uma conta nova — somente para quem tem perfil Desenvolvedor (role "admin").
 * A conta recebe app_metadata.created_by = "developer", que libera o cadastro no
 * servidor mesmo com o cadastro público fechado (ver public.handle_new_user).
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw) || !/[^A-Za-z0-9]/.test(pw)) {
    return "A senha precisa ter maiúscula, minúscula, número e caractere especial.";
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (userErr || !user) return json({ error: "Não autenticado." }, 401);

    const rl = checkRateLimit({ key: `developer-create-user:${user.id ?? clientIpFrom(req)}`, limit: 20, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: isDeveloper, error: roleErr } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleErr) return json({ error: roleErr.message }, 500);
    if (!isDeveloper) return json({ error: "Apenas o perfil Desenvolvedor pode criar contas." }, 403);

    const body = await req.json().catch(() => ({}));
    const fullName = String(body.full_name ?? "").trim().slice(0, 120);
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const makeDeveloper = body.role === "developer";

    if (!fullName) return json({ error: "Informe o nome." }, 400);
    if (!EMAIL_RE.test(email) || email.length > 254) return json({ error: "Email inválido." }, 400);
    const pwErr = passwordProblem(password);
    if (pwErr) return json({ error: pwErr }, 400);

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
      app_metadata: { created_by: "developer", created_by_user: user.id },
    });
    if (createErr || !created.user) {
      const msg = createErr?.message ?? "Erro ao criar conta.";
      const already = /already|registered|exists/i.test(msg);
      return json({ error: already ? "Este email já está cadastrado." : msg }, already ? 409 : 400);
    }

    if (makeDeveloper) {
      const { error: insErr } = await admin
        .from("user_roles")
        .insert({ user_id: created.user.id, role: "admin" });
      if (insErr) return json({ error: `Conta criada, mas o perfil Desenvolvedor falhou: ${insErr.message}` }, 500);
    }

    return json({ ok: true, user_id: created.user.id, email, role: makeDeveloper ? "developer" : "student" });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erro inesperado." }, 500);
  }
});
