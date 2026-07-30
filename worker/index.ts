/**
 * Cloudflare Worker entry-point.
 *
 * Serves the built SPA from the static-assets binding (ASSETS) and gives the
 * Worker real runtime code. Having a script (this file) is what unlocks the
 * "Variables and secrets" panel in the Cloudflare dashboard — a Worker that
 * only has static assets cannot store runtime variables/secrets.
 *
 * Any secret you add in the dashboard is available here via `env.<NAME>`.
 * Sensitive server-only secrets (e.g. FIREBASE_PRIVATE_KEY, SERVICE_ROLE_KEY)
 * are safe here because this code runs on Cloudflare's edge, never in the
 * browser bundle.
 */

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  GEMINI_API_KEY?: string;
}

const GEMINI_MODEL = "gemini-2.5-flash";

/** Rate limit simples em memória do isolate (janela deslizante por usuário). */
const hits = new Map<string, number[]>();
function rateLimited(key: string, limit = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  return false;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface BookInput {
  title?: string;
  author?: string | null;
  category?: string | null;
  total_pages?: number | null;
  current_page?: number | null;
  status?: string | null;
}

async function analyzeLibrary(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  if (!env.GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY não configurada no Worker." }, 500);
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) {
    return json({ error: "SUPABASE_URL/SUPABASE_PUBLISHABLE_KEY não configuradas no Worker." }, 500);
  }

  // Autenticação obrigatória: valida o JWT do usuário contra o Supabase Auth.
  const auth = request.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: env.SUPABASE_PUBLISHABLE_KEY },
  });
  if (!userRes.ok) return json({ error: "Unauthorized" }, 401);
  const user = (await userRes.json()) as { id?: string };
  if (!user?.id) return json({ error: "Unauthorized" }, 401);

  if (rateLimited(`analyze-library:${user.id}`)) {
    return json({ error: "Muitas análises seguidas. Tente novamente em 1 minuto." }, 429);
  }

  let payload: { books?: BookInput[]; focus?: string };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const books = Array.isArray(payload.books) ? payload.books.slice(0, 200) : [];
  if (books.length === 0) return json({ error: "Nenhum livro enviado para análise." }, 400);

  const compact = books.map((b) => ({
    titulo: String(b.title ?? "").slice(0, 160),
    autor: b.author ? String(b.author).slice(0, 120) : null,
    categoria: b.category ? String(b.category).slice(0, 80) : null,
    paginas: Number(b.total_pages ?? 0) || null,
    pagina_atual: Number(b.current_page ?? 0) || 0,
    status: b.status ?? null,
  }));

  const prompt = [
    "Você é um especialista em currículos de estudo. Analise a biblioteca abaixo e monte o MELHOR plano de leitura,",
    "agrupado por categoria, ordenando os livros do nível básico até o mais avançado.",
    payload.focus ? `Foco prioritário do usuário: ${String(payload.focus).slice(0, 300)}.` : "",
    "Regras: use apenas livros da lista; estime o nível pelo título/autor/categoria; escreva em português do Brasil;",
    "no máximo 8 categorias, no máximo 12 livros por categoria; justificativas curtas (até 200 caracteres).",
    "Responda SOMENTE com JSON no formato:",
    '{"resumo":"...","trilhas":[{"categoria":"...","objetivo":"...","livros":[{"titulo":"...","nivel":"iniciante|intermediario|avancado","ordem":1,"porque":"...","paginas":0}]}],"recomendacoes":["..."]}',
    "",
    "Biblioteca (JSON):",
    JSON.stringify(compact),
  ]
    .filter(Boolean)
    .join("\n");

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: "application/json" },
      }),
    },
  );

  const rawText = await geminiRes.text();
  if (!geminiRes.ok) {
    return json({ error: "Falha na API do Gemini", status: geminiRes.status, details: rawText }, geminiRes.status);
  }

  let text = "";
  try {
    const data = JSON.parse(rawText) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  } catch {
    return json({ error: "Resposta inesperada do Gemini", details: rawText.slice(0, 500) }, 502);
  }

  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return json({ ok: true, plan: JSON.parse(cleaned) });
  } catch {
    return json({ ok: true, plan: { resumo: cleaned, trilhas: [], recomendacoes: [] } });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/analyze-library") {
      try {
        return await analyzeLibrary(request, env);
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
      }
    }

    // Delegate everything to the static-assets handler.
    // SPA fallback (index.html for unknown routes) is configured in wrangler.toml
    // via [assets] not_found_handling = "single-page-application".
    return env.ASSETS.fetch(request);
  },
};
