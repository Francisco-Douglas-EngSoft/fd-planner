import { supabase } from "@/integrations/supabase/client";

export type RectNorm = { x: number; y: number; w: number; h: number };
export type AnnotationKind = "highlight" | "underline" | "note";

export interface Annotation {
  id: string;
  book_id: string;
  user_id: string;
  page: number;
  text: string | null;
  highlight: string | null; // comentário/nota do usuário
  color: string;
  kind: AnnotationKind;
  rects: RectNorm[] | null;
  created_at: string;
}

export const annotationsService = {
  async listByBook(bookId: string, userId: string): Promise<Annotation[]> {
    const { data, error } = await supabase
      .from("annotations")
      .select("*")
      .eq("book_id", bookId)
      .eq("user_id", userId)
      .order("page", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Annotation[];
  },

  async create(payload: {
    book_id: string;
    user_id: string;
    page: number;
    text?: string | null;
    highlight?: string | null;
    color?: string;
    kind?: AnnotationKind;
    rects?: RectNorm[] | null;
  }): Promise<Annotation> {
    const { data, error } = await supabase
      .from("annotations")
      .insert({
        color: "yellow",
        kind: "highlight",
        ...payload,
      } as never)
      .select("*")
      .single();
    if (error) throw error;
    return data as unknown as Annotation;
  },

  async updateNote(id: string, highlight: string): Promise<void> {
    const { error } = await supabase
      .from("annotations")
      .update({ highlight } as never)
      .eq("id", id);
    if (error) throw error;
  },

  async updateColor(id: string, color: string): Promise<void> {
    const { error } = await supabase
      .from("annotations")
      .update({ color } as never)
      .eq("id", id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("annotations").delete().eq("id", id);
    if (error) throw error;
  },
};

export const HIGHLIGHT_COLORS: Record<string, { bg: string; label: string }> = {
  yellow: { bg: "rgba(250, 204, 21, 0.42)", label: "Amarelo" },
  green: { bg: "rgba(74, 222, 128, 0.42)", label: "Verde" },
  blue: { bg: "rgba(96, 165, 250, 0.42)", label: "Azul" },
  pink: { bg: "rgba(244, 114, 182, 0.42)", label: "Rosa" },
  orange: { bg: "rgba(251, 146, 60, 0.42)", label: "Laranja" },
};
