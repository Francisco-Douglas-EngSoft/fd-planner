import { z } from "npm:zod@3.23.8";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";
import { generateText } from "npm:ai@5.0.60";
import { createAiGatewayProvider } from "../_shared/ai-gateway.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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

    // Heavy operation — 5 parses / 5 minutes per user is generous enough for
    // real usage while blocking abuse.
    const rl = checkRateLimit({ key: `parse-pdf:${user.id}`, limit: 5, windowMs: 5 * 60_000 });
    if (!rl.ok) return rateLimitResponse(rl, corsHeaders);

    const parsed = z.object({
      book_id: z.string().uuid(),
      summarize: z.boolean().default(false),
      max_pages: z.number().int().min(1).max(200).default(50),
    }).safeParse(await req.json());
    if (!parsed.success) return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { book_id, summarize, max_pages } = parsed.data;

    const { data: book, error: bErr } = await supabase.from("books").select("id,file_path,user_id").eq("id", book_id).single();
    if (bErr || !book) throw new Error("Livro não encontrado");
    if (book.user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: file, error: dlErr } = await supabase.storage.from("books").download(book.file_path);
    if (dlErr || !file) throw new Error("Falha ao baixar PDF");

    const buf = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buf);
    const totalPages = Math.min(pdf.numPages, max_pages);

    const key = Deno.env.get("AI_GATEWAY_API_KEY");
    const gateway = key ? createAiGatewayProvider(key) : null;

    const rows: Array<{ user_id: string; pdf_id: string; page_number: number; content: string; summary?: string | null }> = [];
    for (let i = 1; i <= totalPages; i++) {
      const { text } = await extractText(pdf, { mergePages: false, page: i });
      const pageText = Array.isArray(text) ? text[0] ?? "" : String(text ?? "");
      let summary: string | null = null;
      if (summarize && gateway && pageText.trim().length > 80) {
        try {
          const { text: s } = await generateText({
            model: gateway("google/gemini-3-flash-preview"),
            system: "Resuma em português do Brasil em 1-2 frases objetivas.",
            prompt: pageText.slice(0, 6000),
          });
          summary = s;
        } catch (_) { /* ignore per-page summary errors */ }
      }
      rows.push({ user_id: user.id, pdf_id: book.id, page_number: i, content: pageText, summary });
    }

    await supabase.from("pdf_pages").delete().eq("pdf_id", book.id).eq("user_id", user.id);
    const CHUNK = 40;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabase.from("pdf_pages").insert(rows.slice(i, i + CHUNK));
      if (error) throw error;
    }

    await supabase.from("books").update({ total_pages: pdf.numPages }).eq("id", book.id);

    return new Response(JSON.stringify({ book_id: book.id, pages_indexed: rows.length, total_pages: pdf.numPages }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});