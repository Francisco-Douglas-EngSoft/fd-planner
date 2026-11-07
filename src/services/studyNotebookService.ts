/**
 * Serviço do caderno unificado de estudo (notas de leitura + IA).
 */
import { supabase } from "@/integrations/supabase/client";

export type NoteKind = "note" | "summary" | "flashcard" | "question";

export interface StudyNote {
  id: string;
  user_id: string;
  book_id: string | null;
  title: string;
  content: string | null;
  source_page: number | null;
  source_cfi: string | null;
  source_pct: number | null;
  annotation_ids: string[];
  tags: string[];
  kind: NoteKind;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export const studyNotebookService = {
  async list(userId: string, bookId?: string): Promise<StudyNote[]> {
    let q = supabase
      .from("study_notebook")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (bookId) q = q.eq("book_id", bookId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as StudyNote[];
  },

  async create(payload: Omit<StudyNote, "id" | "created_at" | "updated_at">): Promise<StudyNote> {
    const { data, error } = await supabase
      .from("study_notebook")
      .insert(payload as never)
      .select("*")
      .single();
    if (error) throw error;
    return data as StudyNote;
  },

  async update(id: string, patch: Partial<Pick<StudyNote, "title" | "content" | "tags" | "kind">>): Promise<void> {
    const { error } = await supabase
      .from("study_notebook")
      .update(patch as never)
      .eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("study_notebook").delete().eq("id", id);
    if (error) throw error;
  },

  /** Exporta todas as notas de um livro como Markdown */
  exportToMarkdown(notes: StudyNote[], bookTitle: string): string {
    const lines: string[] = [`# Caderno de Estudos — ${bookTitle}`, ""];
    for (const n of notes) {
      const source = n.source_page
        ? `Pág. ${n.source_page}`
        : n.source_pct != null
        ? `${n.source_pct}%`
        : "";
      const kindLabel: Record<NoteKind, string> = {
        note: "📝 Nota",
        summary: "📋 Resumo",
        flashcard: "🃏 Flashcard",
        question: "❓ Pergunta",
      };
      lines.push(`## ${n.title}`);
      lines.push(`**Tipo:** ${kindLabel[n.kind as NoteKind] ?? n.kind}${source ? ` · ${source}` : ""}`);
      lines.push(`**Data:** ${new Date(n.created_at).toLocaleDateString("pt-BR")}`);
      if (n.tags.length) lines.push(`**Tags:** ${n.tags.join(", ")}`);
      lines.push("");
      lines.push(n.content ?? "");
      lines.push("");
      lines.push("---");
      lines.push("");
    }
    return lines.join("\n");
  },
};
