import { generateText, Output } from "npm:ai@5.0.60";
import { z } from "npm:zod@3.23.8";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createLovableAiGatewayProvider } from "../_shared/ai-gateway.ts";
import { checkRateLimit, clientIpFrom, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) throw new Error("LOVABLE_API_KEY not configured");

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

    const bucketKey = user?.id ?? clientIpFrom(req);
    const rl = checkRateLimit({ key: `generate-mindmap:${bucketKey}`, limit: 10, windowMs: 60_000 });
    if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

    const body = await req.json();
    const parsed = z.object({
      topic: z.string().min(2).max(200),
      content: z.string().max(15000).optional(),
      title: z.string().max(120).optional(),
    }).safeParse(body);
    if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { topic, content, title } = parsed.data;
    const gateway = createLovableAiGatewayProvider(key);

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({
        schema: z.object({
          root: z.string(),
          branches: z.array(z.object({
            title: z.string(),
            children: z.array(z.string()).default([]),
          })).min(2).max(8),
        }),
      }),
      system: "Você cria mapas mentais estruturados em português do Brasil. Retorne um tópico raiz e 3-6 ramos principais, cada um com 2-5 sub-itens curtos.",
      prompt: `Tópico: ${topic}${content ? `\n\nConteúdo de referência:\n${content}` : ""}`,
    });

    const { data: map, error: mapErr } = await supabase.from("mind_maps").insert({
      user_id: user.id,
      title: title ?? output.root ?? topic,
      description: `Gerado por IA a partir de: ${topic}`,
    }).select().single();
    if (mapErr) throw mapErr;

    const { data: rootNode, error: rootErr } = await supabase.from("mind_map_nodes").insert({
      mind_map_id: map.id,
      user_id: user.id,
      title: output.root,
      x: 0,
      y: 0,
      color: "#f59e0b",
    }).select().single();
    if (rootErr) throw rootErr;

    const radius = 320;
    const nodes: Array<{ mind_map_id: string; user_id: string; parent_id: string; title: string; x: number; y: number; content?: string }> = [];
    output.branches.forEach((b, i) => {
      const angle = (i / output.branches.length) * 2 * Math.PI;
      const bx = Math.cos(angle) * radius;
      const by = Math.sin(angle) * radius;
      nodes.push({ mind_map_id: map.id, user_id: user.id, parent_id: rootNode.id, title: b.title, x: bx, y: by });
    });

    const { data: branchNodes, error: bErr } = await supabase.from("mind_map_nodes").insert(nodes).select();
    if (bErr) throw bErr;

    const childRows: Array<{ mind_map_id: string; user_id: string; parent_id: string; title: string; x: number; y: number }> = [];
    output.branches.forEach((b, i) => {
      const parent = branchNodes[i];
      if (!parent) return;
      b.children.forEach((c, j) => {
        const angle = (j - (b.children.length - 1) / 2) * 0.4;
        childRows.push({
          mind_map_id: map.id,
          user_id: user.id,
          parent_id: parent.id,
          title: c,
          x: parent.x + Math.cos(angle) * 220,
          y: parent.y + Math.sin(angle) * 160,
        });
      });
    });
    if (childRows.length > 0) {
      const { error: cErr } = await supabase.from("mind_map_nodes").insert(childRows);
      if (cErr) throw cErr;
    }

    return new Response(JSON.stringify({ mind_map_id: map.id, root: output.root, branches: output.branches.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});