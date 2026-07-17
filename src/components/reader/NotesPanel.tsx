import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Note {
  id: string;
  text: string | null;
  page: number;
  created_at: string;
}

interface Props {
  bookId: string;
  userId: string;
  currentPage?: number | null;
}

export function NotesPanel({ bookId, userId, currentPage }: Readonly<Props>) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("annotations")
        .select("id, text, page, created_at")
        .eq("book_id", bookId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (!error && data) setNotes(data as Note[]);
      setLoading(false);
    })();
  }, [bookId, userId]);

  async function handleSave() {
    if (!draft.trim()) return;
    setSaving(true);
    const payload = {
      book_id: bookId,
      user_id: userId,
      text: draft.trim(),
      page: currentPage ?? 0,
    };
    const { data, error } = await supabase
      .from("annotations")
      .insert(payload)
      .select("id, text, page, created_at")
      .single();
    setSaving(false);
    if (error) return toast.error("Erro ao salvar nota");
    setNotes((n) => [data as Note, ...n]);
    setDraft("");
    toast.success("Nota salva");
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("annotations").delete().eq("id", id);
    if (error) return toast.error("Erro ao remover");
    setNotes((n) => n.filter((x) => x.id !== id));
  }

  return (
    <Card className="p-4 flex flex-col gap-3 max-h-[75vh]">
      <div>
        <h3 className="text-sm font-semibold mb-2">Notas</h3>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Anotação${currentPage ? ` sobre a página ${currentPage}` : ""}...`}
          rows={3}
          className="resize-none"
        />
        <Button size="sm" className="mt-2 w-full" onClick={handleSave} disabled={saving || !draft.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
          Adicionar nota
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-1" /> Carregando...
          </div>
        ) : notes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Nenhuma nota ainda.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="rounded-md border bg-muted/30 p-2 text-xs space-y-1">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] uppercase text-muted-foreground">
                  {n.page > 0 ? `Pág. ${n.page}` : "Geral"} · {new Date(n.created_at).toLocaleDateString("pt-BR")}
                </span>
                <button onClick={() => handleDelete(n.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{n.text}</p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}