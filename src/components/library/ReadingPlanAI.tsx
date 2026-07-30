import { useState } from "react";
import { Sparkles, Loader2, GraduationCap, ListOrdered } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { BookRow } from "@/services/libraryService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState } from "@/components/ui/QueryState";

interface PlanBook {
  titulo: string;
  nivel?: string;
  ordem?: number;
  porque?: string;
  paginas?: number;
}

interface PlanTrack {
  categoria: string;
  objetivo?: string;
  livros: PlanBook[];
}

interface ReadingPlan {
  resumo?: string;
  trilhas?: PlanTrack[];
  recomendacoes?: string[];
}

const LEVEL_LABEL: Record<string, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

export function ReadingPlanAI({ books }: { books: BookRow[] }) {
  const [focus, setFocus] = useState("");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    if (books.length === 0) {
      toast.error("Adicione livros à biblioteca antes de gerar o plano.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Faça login para gerar o plano de leitura.");

      const res = await fetch("/api/analyze-library", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          focus: focus.trim() || undefined,
          books: books.map((b) => ({
            title: b.title,
            author: (b as { author?: string | null }).author ?? null,
            category: (b as { category?: string | null }).category ?? null,
            total_pages: (b as { total_pages?: number | null }).total_pages ?? null,
            current_page: (b as { current_page?: number | null }).current_page ?? null,
            status: (b as { status?: string | null }).status ?? null,
          })),
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        throw new Error(
          "A rota /api/analyze-library só existe no deploy da Cloudflare (Worker). No preview local ela não responde.",
        );
      }

      const body = (await res.json()) as { plan?: ReadingPlan; error?: string };
      if (!res.ok) throw new Error(body.error || `Falha na análise (${res.status})`);
      setPlan(body.plan ?? null);
      toast.success("Plano de leitura gerado!");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Plano de leitura com IA (Gemini)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            A IA analisa os {books.length} livros da sua biblioteca e monta trilhas por categoria,
            do nível básico ao mais avançado.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Foco opcional (ex.: Direito Constitucional, programação backend...)"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
            />
            <Button onClick={generate} disabled={loading} className="shrink-0">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" /> Gerar plano
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <ErrorState title={error} onRetry={generate} />}

      {!plan && !error && !loading && (
        <EmptyState
          title="Nenhum plano gerado ainda"
          description="Clique em “Gerar plano” para a IA organizar sua biblioteca em trilhas de estudo."
        />
      )}

      {plan?.resumo && (
        <Card>
          <CardContent className="p-4 text-sm leading-relaxed whitespace-pre-wrap">
            {plan.resumo}
          </CardContent>
        </Card>
      )}

      {plan?.trilhas?.map((track) => (
        <Card key={track.categoria}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="h-4 w-4 text-primary" />
              {track.categoria}
            </CardTitle>
            {track.objetivo && (
              <p className="text-xs text-muted-foreground">{track.objetivo}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {track.livros?.map((book, i) => (
              <div
                key={`${track.categoria}-${book.titulo}-${i}`}
                className="flex gap-3 border border-border p-3"
              >
                <span className="text-sm font-semibold text-muted-foreground w-6 shrink-0">
                  {book.ordem ?? i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium break-words">{book.titulo}</p>
                    {book.nivel && (
                      <Badge variant="secondary" className="text-[10px]">
                        {LEVEL_LABEL[book.nivel] ?? book.nivel}
                      </Badge>
                    )}
                    {book.paginas ? (
                      <span className="text-[11px] text-muted-foreground">{book.paginas} pág.</span>
                    ) : null}
                  </div>
                  {book.porque && (
                    <p className="text-xs text-muted-foreground mt-1">{book.porque}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {plan?.recomendacoes && plan.recomendacoes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListOrdered className="h-4 w-4 text-primary" />
              Recomendações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-5">
              {plan.recomendacoes.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}