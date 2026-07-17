import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FlashcardRow = Database["public"]["Tables"]["flashcards"]["Row"];
export type FlashcardInsert = Database["public"]["Tables"]["flashcards"]["Insert"];
export type FlashcardUpdate = Database["public"]["Tables"]["flashcards"]["Update"];

export const flashcardService = {
  async list(userId: string): Promise<FlashcardRow[]> {
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async dueToday(userId: string): Promise<FlashcardRow[]> {
    const { data, error } = await supabase
      .from("flashcards")
      .select("*")
      .eq("user_id", userId)
      .lte("next_review", new Date().toISOString())
      .order("next_review", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
  async create(payload: FlashcardInsert): Promise<FlashcardRow> {
    const { data, error } = await supabase.from("flashcards").insert(payload).select("*").single();
    if (error) throw error;
    return data;
  },
  async update(id: string, patch: FlashcardUpdate): Promise<void> {
    const { error } = await supabase.from("flashcards").update(patch).eq("id", id);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("flashcards").delete().eq("id", id);
    if (error) throw error;
  },
  async logReview(payload: {
    flashcard_id: string;
    user_id: string;
    quality: number;
    interval_before?: number | null;
    interval_after?: number | null;
    ease_factor_before?: number | null;
    ease_factor_after?: number | null;
  }): Promise<void> {
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
  return { interval_days: interval, ease_factor: ef, repetitions: reps, next_review: due.toISOString() };
}
