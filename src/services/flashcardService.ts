import { supabase } from "@/integrations/supabase/client";

export type FlashcardRow = {
  id: string;
  user_id: string;
  deck: string | null;
  front: string;
  back: string;
  interval_days: number | null;
  ease_factor: number | null;
  repetitions: number | null;
  due_at: string | null;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const flashcardService = {
  async list(userId: string): Promise<FlashcardRow[]> {
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as FlashcardRow[];
  },
  async dueToday(userId: string): Promise<FlashcardRow[]> {
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", userId)
      .lte("due_at", new Date().toISOString())
      .order("due_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as FlashcardRow[];
  },
  async create(payload: { user_id: string; front: string; back: string; deck?: string | null }): Promise<FlashcardRow> {
    const { data, error } = await supabase.from("flashcards").insert(payload).select("*").single();
    if (error) throw error;
    return data as FlashcardRow;
  },
  async update(id: string, patch: Partial<FlashcardRow>): Promise<void> {
    const { error } = await supabase.from("flashcards").update(patch).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (error) throw error;
  },
  async logReview(payload: { flashcard_id: string; user_id: string; quality: number; interval_days: number; ease_factor: number }): Promise<void> {
    const { error } = await supabase.from("review_history").insert(payload);
    if (error) throw error;
  },
};

/** SM-2 lite: quality 0..5. Returns next scheduling. */
export function scheduleSm2(card: Pick<FlashcardRow, "interval_days" | "ease_factor" | "repetitions">, quality: number) {
  const q = Math.max(0, Math.min(5, quality));
  let reps = card.repetitions ?? 0;
  let ef = card.ease_factor ?? 2.5;
  let interval = card.interval_days ?? 0;

  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    ef = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 6;
    else interval = Math.round(interval * ef);
  }

  const due = new Date();
  due.setDate(due.getDate() + interval);
  return { interval_days: interval, ease_factor: ef, repetitions: reps, due_at: due.toISOString() };
}
