import { convertToModelMessages, streamText, type UIMessage } from "npm:ai@5.0.60";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";
import { checkRateLimit, clientIpFrom, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ad-hoc rate limit: 20 requests / minute per caller (auth id or IP).
    const bucketKey = req.headers.get("Authorization") ?? clientIpFrom(req);
    const rl = checkRateLimit({ key: `ai-assistant:${bucketKey}`, limit: 20, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

    const { messages }: { messages: UIMessage[] } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const result = streamText({
      model,
      system:
        "Você é o Assistente de Estudos do FD-Planner. Ajude o usuário com resumos, explicações, questões, planos de estudo e revisões. Seja claro, direto e use markdown quando útil. Responda em português do Brasil.",
      messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse({ headers: corsHeaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});