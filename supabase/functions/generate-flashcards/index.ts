import { generateText, Output } from "npm:ai@5.0.60";
import { z } from "npm:zod@3.23.8";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createAiGatewayProvider } from "../_shared/ai-gateway.ts";
import { checkRateLimit, clientIpFrom, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const key = Deno.env.get("AI_GATEWAY_API_KEY");
    if (!key) throw new Error("AI_GATEWAY_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Ad-hoc rate limit: 10 generations / minute per user.
    const rl = checkRateLimit({ key: `generate-flashcards:${user.id}`, limit: 10, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

    const body = await req.json();
    const parsed = z.object({
      content: z.string().min(20).max(20000),
      topic: z.string().max(120).optional(),
      count: z.number().int().min(1).max(30).default(10),
      persist: z.boolean().default(true),
    }).safeParse(body);
    if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { content, topic, count, persist } = parsed.data;
    const gateway = createAiGatewayProvider(key);

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({
        schema: z.object({
          cards: z.array(z.object({ front: z.string(), back: z.string() })),
        }),
      }),
      system: "Você é especialista em criar flashcards de estudo em português do Brasil. Gere perguntas claras (front) e respostas concisas e completas (back). Evite duplicatas.",
      prompt: `Gere ${count} flashcards a partir do conteúdo abaixo${topic ? ` sobre o tema "${topic}"` : ""}.\n\nConteúdo:\n${content}`,
    });

    const cards = (output.cards ?? []).slice(0, count);

    if (persist && cards.length > 0) {
      const rows = cards.map((c) => ({
        user_id: user.id,
        front: c.front,
        back: c.back,
        topic: topic ?? null,
      }));
      const { error } = await supabase.from("flashcards").insert(rows);
      if (error) throw error;
    }

    return new Response(JSON.stringify({ cards, persisted: persist }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});