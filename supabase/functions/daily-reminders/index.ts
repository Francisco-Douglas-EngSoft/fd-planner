import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// Envia notificações diárias por FCM:
//  - "Você tem X flashcards para revisar hoje"
//  - "Continue o livro Y"
// Pode ser acionado manualmente (Authorization Bearer <user JWT>) para o próprio usuário,
// ou via cron (Authorization: Bearer <DISPATCH_SECRET>) para varrer todos os usuários.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const dispatchSecret = Deno.env.get("DISPATCH_SECRET") ?? "";
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const auth = req.headers.get("Authorization") ?? "";
  const isCron = dispatchSecret && auth === `Bearer ${dispatchSecret}`;

  let targetUserIds: string[] = [];

  if (isCron) {
    const { data } = await admin
      .from("fcm_tokens")
      .select("user_id")
      .eq("enabled", true);
    targetUserIds = Array.from(new Set((data ?? []).map((r) => r.user_id as string)));
  } else {
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    targetUserIds = [user.id];
  }

  const results: { user_id: string; flashcards: number; book?: string }[] = [];
  const nowIso = new Date().toISOString();

  for (const uid of targetUserIds) {
    // Flashcards devidos
    const { count: dueCount } = await admin
      .from("flashcards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .lte("next_review", nowIso);

    if (dueCount && dueCount > 0) {
      await admin.functions.invoke("send-notification", {
        body: {
          title: "🧠 Revisão de flashcards",
          body: `Você tem ${dueCount} flashcard${dueCount === 1 ? "" : "s"} para revisar hoje.`,
          type: "flashcard_review",
          target_user_id: uid,
          data: { url: "/flashcards" },
        },
        headers: { Authorization: `Bearer ${serviceRoleKey}` },
      });
    }

    // Último livro em progresso
    const { data: book } = await admin
      .from("books")
      .select("id, title, status")
      .eq("user_id", uid)
      .in("status", ["reading", "wishlist"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (book) {
      await admin.functions.invoke("send-notification", {
        body: {
          title: "📖 Continue sua leitura",
          body: `Continue o livro "${book.title}" e mantenha o ritmo dos estudos!`,
          type: "book_reminder",
          target_user_id: uid,
          data: { url: `/leitor/${book.id}` },
        },
        headers: { Authorization: `Bearer ${serviceRoleKey}` },
      });
    }

    results.push({ user_id: uid, flashcards: dueCount ?? 0, book: book?.title });
  }

  return json({ ok: true, processed: results.length, results });
});