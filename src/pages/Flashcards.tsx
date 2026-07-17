import { useState } from "react";
import { useFlashcards } from "@/hooks/useFlashcards";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Sparkles, RotateCcw, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { FlashcardRow } from "@/services/flashcardService";

function ReviewMode({ cards, onReview, onExit }: {
  cards: FlashcardRow[];
  onReview: (card: FlashcardRow, quality: number) => Promise<void>;
  onExit: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const card = cards[idx];

  if (!card) {
    return (
      <Card className="tint-card">
        <CardContent className="p-8 text-center space-y-4">
          <Sparkles className="h-10 w-10 mx-auto text-primary" />
          <p className="text-lg font-semibold">Revisão concluída!</p>
          <p className="text-sm text-muted-foreground">Nenhum card restante para hoje.</p>
          <Button onClick={onExit}>Voltar</Button>
        </CardContent>
      </Card>
    );
  }

  const handleQuality = async (q: number) => {
    await onReview(card, q);
    setShowBack(false);
    setIdx(idx + 1);
  };

  return (
    <Card className="tint-card">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Revisão · {idx + 1} / {cards.length}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onExit}>Sair</Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="min-h-[160px] p-6 rounded-lg bg-muted/40 border">
          <p className="text-xs uppercase text-muted-foreground mb-2">Frente</p>
          <p className="text-lg font-medium whitespace-pre-wrap">{card.front}</p>
          {showBack && (
            <>
              <div className="my-4 border-t" />
              <p className="text-xs uppercase text-muted-foreground mb-2">Verso</p>
              <p className="text-base whitespace-pre-wrap">{card.back}</p>
            </>
          )}
        </div>

        {!showBack ? (
          <Button className="w-full" onClick={() => setShowBack(true)}>
            Mostrar resposta
          </Button>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button variant="destructive" onClick={() => handleQuality(1)}>Errei</Button>
            <Button variant="secondary" onClick={() => handleQuality(3)}>Difícil</Button>
            <Button variant="secondary" onClick={() => handleQuality(4)}>Bom</Button>
            <Button onClick={() => handleQuality(5)}>Fácil</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Flashcards() {
  const { all, due, create, review, remove } = useFlashcards();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiContent, setAiContent] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(10);
  const [aiLoading, setAiLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [topic, setTopic] = useState("");

  const handleCreate = async () => {
    if (!front.trim() || !back.trim()) return;
    try {
      await create.mutateAsync({ front, back, topic: topic || null });
      toast.success("Flashcard criado");
      setFront(""); setBack(""); setTopic(""); setOpen(false);
    } catch (e) {
      toast.error("Erro ao criar flashcard");
    }
  };

  const handleReview = async (card: FlashcardRow, quality: number) => {
    await review.mutateAsync({ card, quality });
  };

  const handleGenerate = async () => {
    if (aiContent.trim().length < 20) {
      toast.error("Conteúdo muito curto (mínimo 20 caracteres)");
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-flashcards", {
        body: { content: aiContent, topic: aiTopic || undefined, count: aiCount, persist: true },
      });
      if (error) throw error;
      toast.success(`${data?.cards?.length ?? 0} flashcards gerados`);
      setAiOpen(false);
      setAiContent(""); setAiTopic("");
      qc.invalidateQueries({ queryKey: ["flashcards"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar flashcards");
    } finally {
      setAiLoading(false);
    }
  };

  if (reviewing) {
    return (
      <div className="container max-w-3xl mx-auto p-4 md:p-6">
        <ReviewMode
          cards={due.data ?? []}
          onReview={handleReview}
          onExit={() => setReviewing(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Flashcards</h1>
          <p className="text-sm text-muted-foreground">
            Repetição espaçada com algoritmo SM-2
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setReviewing(true)}
            disabled={!due.data?.length}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Revisar hoje ({due.data?.length ?? 0})
          </Button>
          <Dialog open={aiOpen} onOpenChange={setAiOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Wand2 className="h-4 w-4 mr-2" />Gerar com IA</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Gerar flashcards com IA</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Tópico (opcional)</label>
                  <Input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} placeholder="Ex.: Direito Constitucional" />
                </div>
                <div>
                  <label className="text-xs font-medium">Quantidade</label>
                  <Input type="number" min={1} max={30} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value) || 10)} />
                </div>
                <div>
                  <label className="text-xs font-medium">Conteúdo base</label>
                  <Textarea value={aiContent} onChange={(e) => setAiContent(e.target.value)} rows={8} placeholder="Cole o texto, resumo ou material de estudo..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setAiOpen(false)}>Cancelar</Button>
                <Button onClick={handleGenerate} disabled={aiLoading}>
                  {aiLoading ? "Gerando..." : "Gerar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Novo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo flashcard</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Tópico (opcional)</label>
                  <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex.: Direito Constitucional" />
                </div>
                <div>
                  <label className="text-xs font-medium">Frente (pergunta)</label>
                  <Textarea value={front} onChange={(e) => setFront(e.target.value)} rows={3} />
                </div>
                <div>
                  <label className="text-xs font-medium">Verso (resposta)</label>
                  <Textarea value={back} onChange={(e) => setBack(e.target.value)} rows={4} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={create.isPending}>Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {all.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : !all.data?.length ? (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <Sparkles className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">Nenhum flashcard ainda</p>
            <p className="text-sm text-muted-foreground">
              Crie seu primeiro card para começar a revisar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {all.data.map((c) => (
            <Card key={c.id} className="tint-card">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  {c.topic && <Badge variant="secondary">{c.topic}</Badge>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => remove.mutate(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm font-medium line-clamp-3">{c.front}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.back}</p>
                <div className="flex gap-3 text-[11px] text-muted-foreground pt-2 border-t">
                  <span>Reps: {c.repetitions ?? 0}</span>
                  <span>Intervalo: {c.interval_days ?? 0}d</span>
                  <span>EF: {(c.ease_factor ?? 2.5).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}