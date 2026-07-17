import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface Props {
  getPageText: () => Promise<string>;
  page: number;
}

export function PageSummarizer({ getPageText, page }: Readonly<Props>) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function summarize() {
    setLoading(true);
    setSummary(null);
    try {
      const text = await getPageText();
      if (!text.trim()) {
        toast.error("Sem texto extraível nesta página");
        return;
      }
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: {
          messages: [
            {
              role: "user",
              parts: [
                {
                  type: "text",
                  text: `Resuma em português, em até 6 bullets objetivos, o conteúdo desta página (${page}):\n\n${text.slice(0, 8000)}`,
                },
              ],
            },
          ],
        },
      });
      if (error) throw error;
      // Response is a UI-stream; we ask user to see chat instead if streaming fails
      const raw = typeof data === "string" ? data : JSON.stringify(data);
      // extract plain text from stream chunks
      const cleaned = raw
        .split("\n")
        .filter((l) => l.startsWith("0:"))
        .map((l) => {
          try { return JSON.parse(l.slice(2)); } catch { return ""; }
        })
        .join("");
      setSummary(cleaned || "Não foi possível gerar o resumo.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao resumir a página");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Resumo por IA
        </h3>
        <Button size="sm" variant="outline" onClick={summarize} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
          Resumir página {page}
        </Button>
      </div>
      {summary && (
        <div className="prose prose-sm dark:prose-invert max-w-none text-xs bg-muted/30 rounded-md p-2 max-h-40 overflow-y-auto">
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      )}
    </Card>
  );
}