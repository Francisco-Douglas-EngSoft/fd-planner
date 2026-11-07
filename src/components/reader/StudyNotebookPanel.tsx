/**
 * Caderno unificado de estudo no leitor.
 * Agrupa notas manuais, resumos de IA e flashcards de uma só fonte.
 */
import { useState, useCallback } from "react";
import {
  Plus, Loader2, Trash2, Download, ChevronDown, ChevronUp,
  BookOpen, Brain, HelpCircle, FileText, Sparkles, X, Check,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyNotebook } from "@/hooks/useStudyNotebook";
import { studyNotebookService, type NoteKind } from "@/services/studyNotebookService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface Props {
  bookId: string;
  bookTitle: string;
  currentPage?: number | null;
  currentCfi?: string | null;
  currentPct?: number | null;
  bookType?: "pdf" | "epub";
  onGoToPage?: (page: number) => void;
  onGoToCfi?: (cfi: string) => void;
}

const KIND_CONFIG: Record<NoteKind, { label: string; icon: React.ReactNode; color: string }> = {
  note: { label: "Nota", icon: <FileText className="h-3 w-3" />, color: "text-blue-500" },
  summary: { label: "Resumo", icon: <BookOpen className="h-3 w-3" />, color: "text-green-500" },
  flashcard: { label: "Flashcard", icon: <Brain className="h-3 w-3" />, color: "text-purple-500" },
  question: { label: "Pergunta", icon: <HelpCircle className="h-3 w-3" />, color: "text-orange-500" },
};

export function StudyNotebookPanel({
  bookId,
  bookTitle,
  currentPage,
  currentCfi,
  currentPct,
  bookType = "pdf",
  onGoToPage,
  onGoToCfi,
}: Props) {
  const { user } = useAuth();
  const { data: notes = [], create, update, remove, exportMarkdown, isLoading } = useStudyNotebook(bookId);
  const [showForm, setShowForm] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftKind, setDraftKind] = useState<NoteKind>("note");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [filterKind, setFilterKind] = useState<NoteKind | "all">("all");

  const filteredNotes = filterKind === "all"
    ? notes
    : notes.filter((n) => n.kind === filterKind);

  async function handleSave() {
    if (!user || !draftTitle.trim()) return;
    setSaving(true);
    try {
      await create.mutateAsync({
        user_id: user.id,
        book_id: bookId,
        title: draftTitle.trim(),
        content: draftContent.trim() || null,
        source_page: bookType === "pdf" ? (currentPage ?? null) : null,
        source_cfi: bookType === "epub" ? (currentCfi ?? null) : null,
        source_pct: bookType === "epub" ? (currentPct ?? null) : null,
        annotation_ids: [],
        tags: [],
        kind: draftKind,
        ai_generated: false,
      });
      setDraftTitle("");
      setDraftContent("");
      setDraftKind("note");
      setShowForm(false);
      toast.success("Nota adicionada");
    } catch {
      toast.error("Erro ao salvar nota");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await remove.mutateAsync(id);
      toast.success("Nota removida");
    } catch {
      toast.error("Erro ao remover nota");
    }
  }

  async function handleEditSave(id: string) {
    try {
      await update.mutateAsync({ id, patch: { content: editContent } });
      setEditingId(null);
      toast.success("Nota atualizada");
    } catch {
      toast.error("Erro ao atualizar nota");
    }
  }

  function handleExport() {
    const md = exportMarkdown(bookTitle);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `notas-${bookTitle.slice(0, 30).replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Notas exportadas");
  }

  function goToSource(note: (typeof notes)[0]) {
    if (bookType === "pdf" && note.source_page && onGoToPage) {
      onGoToPage(note.source_page);
    } else if (bookType === "epub" && note.source_cfi && onGoToCfi) {
      onGoToCfi(note.source_cfi);
    }
  }

  const hasSource = (note: (typeof notes)[0]) =>
    (bookType === "pdf" && !!note.source_page) ||
    (bookType === "epub" && !!note.source_cfi);

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Cabeçalho */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex-1">
          <p className="text-xs font-semibold">Caderno de Estudo</p>
          <p className="text-[10px] text-muted-foreground">{notes.length} nota(s)</p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport} aria-label="Exportar notas" disabled={!notes.length}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowForm((v) => !v)} aria-label="Nova nota">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Formulário de nova nota */}
      {showForm && (
        <div className="space-y-2 p-3 bg-muted/30 rounded-lg border text-xs shrink-0">
          <Input
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Título da nota"
            className="h-7 text-xs"
            autoFocus
          />
          <Textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            placeholder="Conteúdo..."
            rows={3}
            className="resize-none text-xs"
          />
          <div className="flex gap-2">
            <Select value={draftKind} onValueChange={(v) => setDraftKind(v as NoteKind)}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(KIND_CONFIG) as NoteKind[]).map((k) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {KIND_CONFIG[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 gap-1" onClick={handleSave} disabled={!draftTitle.trim() || saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Salvar
            </Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={() => setShowForm(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          {bookType === "pdf" && currentPage && (
            <p className="text-[10px] text-muted-foreground">
              Vinculando à página {currentPage}
            </p>
          )}
          {bookType === "epub" && currentPct != null && (
            <p className="text-[10px] text-muted-foreground">
              Vinculando à posição {currentPct}%
            </p>
          )}
        </div>
      )}

      {/* Filtro por tipo */}
      <div className="flex gap-1 flex-wrap shrink-0">
        {(["all", "note", "summary", "flashcard", "question"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilterKind(k)}
            className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border transition-colors",
              filterKind === k
                ? "bg-primary/15 border-primary/40 text-primary"
                : "border-border text-muted-foreground hover:bg-muted/50",
            )}
          >
            {k === "all" ? "Todos" : KIND_CONFIG[k].label}
          </button>
        ))}
      </div>

      {/* Lista de notas */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
          </div>
        ) : filteredNotes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Nenhuma nota ainda. Clique em + para adicionar.
          </p>
        ) : (
          filteredNotes.map((n) => {
            const cfg = KIND_CONFIG[n.kind as NoteKind] ?? KIND_CONFIG.note;
            const source = n.source_page
              ? `Pág. ${n.source_page}`
              : n.source_pct != null
              ? `${n.source_pct}%`
              : null;

            return (
              <div key={n.id} className="rounded-md border bg-muted/20 p-2.5 text-xs space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={cfg.color}>{cfg.icon}</span>
                    <span className="font-medium truncate">{n.title}</span>
                    {n.ai_generated && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 gap-0.5">
                        <Sparkles className="h-2.5 w-2.5" /> IA
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {hasSource(n) && (
                      <button
                        type="button"
                        onClick={() => goToSource(n)}
                        className="text-muted-foreground hover:text-primary p-0.5 rounded"
                        title="Ir para a origem no texto"
                        aria-label="Ir para fonte"
                      >
                        <BookOpen className="h-3 w-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(editingId === n.id ? null : n.id);
                        setEditContent(n.content ?? "");
                      }}
                      className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                      aria-label="Editar"
                    >
                      <FileText className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      className="text-muted-foreground hover:text-destructive p-0.5 rounded"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString("pt-BR")}
                  {source && (
                    <button
                      type="button"
                      onClick={() => goToSource(n)}
                      className="ml-2 text-primary hover:underline"
                    >
                      · {source}
                    </button>
                  )}
                </div>

                {editingId === n.id ? (
                  <div className="space-y-1">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="text-xs resize-none"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <Button size="sm" className="h-6 text-[10px]" onClick={() => handleEditSave(n.id)}>Salvar</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  n.content && (
                    <p className="whitespace-pre-wrap leading-relaxed text-foreground/80">{n.content}</p>
                  )
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
