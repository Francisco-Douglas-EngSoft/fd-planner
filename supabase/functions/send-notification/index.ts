import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

// ---------- Google OAuth (service account -> access token) ----------
function base64url(input: ArrayBuffer | string): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`OAuth error: ${JSON.stringify(json)}`);
  return json.access_token as string;
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
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Identifica quem chamou (usa o JWT do usuário).
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await authClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const title = String(body.title ?? "").trim();
    const messageBody = String(body.body ?? "").trim();
    const type = String(body.type ?? "generic");
    const data: Record<string, string> = body.data ?? {};
    let targetUserId: string = user.id;

    // Somente admins podem enviar para outros usuários.
    if (body.target_user_id && body.target_user_id !== user.id) {
      const { data: isAdmin } = await admin.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      targetUserId = String(body.target_user_id);
    }

    if (!title || !messageBody) return json({ error: "title and body are required" }, 400);

    // Tokens do destinatário.
    const { data: tokens, error: tokErr } = await admin
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", targetUserId)
      .eq("enabled", true);
    if (tokErr) return json({ error: tokErr.message }, 500);
    if (!tokens || tokens.length === 0) {
      return json({ ok: true, sent: 0, message: "Nenhum token registrado para este usuário." });
    }

    const saRaw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!saRaw) return json({ error: "FIREBASE_SERVICE_ACCOUNT not configured" }, 500);
    const sa: ServiceAccount = JSON.parse(saRaw);
    const accessToken = await getAccessToken(sa);

    const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
    let sent = 0;
    const staleTokens: string[] = [];

    // Fetch com retry exponencial para erros 5xx/rede (3 tentativas).
    const fetchWithRetry = async (url: string, init: RequestInit, tries = 3): Promise<Response> => {
      let lastErr: unknown;
      for (let i = 0; i < tries; i++) {
        try {
          const r = await fetch(url, init);
          if (r.status < 500 || r.status === 501) return r;
          lastErr = new Error(`HTTP ${r.status}`);
        } catch (e) {
          lastErr = e;
        }
        await new Promise((res) => setTimeout(res, 300 * Math.pow(2, i)));
      }
      throw lastErr instanceof Error ? lastErr : new Error("fetch failed");
    };

    for (const { token } of tokens) {
      const message = {
        message: {
          token,
          notification: { title, body: messageBody },
          data: { type, ...data },
          webpush: {
            notification: { icon: "/icon-192.png", badge: "/icon-192.png" },
            fcm_options: { link: data.url ?? "/" },
          },
        },
      };
      let resp: Response;
      try {
        resp = await fetchWithRetry(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });
      } catch (e) {
        console.error("[send-notification] retry exhausted", e);
        continue;
      }
      if (resp.ok) {
        sent++;
      } else {
        const err = await resp.json().catch(() => ({}));
        const status = err?.error?.status;
        if (status === "NOT_FOUND" || status === "UNREGISTERED" || resp.status === 404) {
          staleTokens.push(token);
        }
        console.error("[send-notification] FCM error", resp.status, JSON.stringify(err));
      }
    }

    // Limpa tokens inválidos.
    if (staleTokens.length) {
      await admin.from("fcm_tokens").delete().in("token", staleTokens);
    }

    // Registra no histórico.
    await admin.from("notification_history").insert({
      user_id: targetUserId,
      title,
      body: messageBody,
      type,
      metadata: data,
    });

    return json({ ok: true, sent, removed: staleTokens.length });
  } catch (e) {
    console.error("[send-notification] error", e);
    return json({ error: (e as Error).message }, 500);
  }
});
