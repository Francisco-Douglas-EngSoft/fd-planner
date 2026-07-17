import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { flashcardService, scheduleSm2, type FlashcardRow } from "@/services/flashcardService";

export function useFlashcards() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const all = useQuery({
    queryKey: ["flashcards", user?.id],
    queryFn: () => (user ? flashcardService.list(user.id) : Promise.resolve([] as FlashcardRow[])),
    enabled: !!user,
  });

  const due = useQuery({
    queryKey: ["flashcards-due", user?.id],
    queryFn: () => (user ? flashcardService.dueToday(user.id) : Promise.resolve([] as FlashcardRow[])),
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: (payload: { front: string; back: string; deck?: string | null }) => {
      if (!user) throw new Error("Sem sessão");
      return flashcardService.create({ ...payload, user_id: user.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flashcards", user?.id] });
      qc.invalidateQueries({ queryKey: ["flashcards-due", user?.id] });
    },
  });

  const review = useMutation({
    mutationFn: async ({ card, quality }: { card: FlashcardRow; quality: number }) => {
      if (!user) throw new Error("Sem sessão");
      const next = scheduleSm2(card, quality);
      await flashcardService.update(card.id, { ...next, last_reviewed_at: new Date().toISOString() });
      await flashcardService.logReview({
        flashcard_id: card.id,
        user_id: user.id,
        quality,
        interval_days: next.interval_days,
        ease_factor: next.ease_factor,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flashcards", user?.id] });
      qc.invalidateQueries({ queryKey: ["flashcards-due", user?.id] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => flashcardService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["flashcards", user?.id] });
      qc.invalidateQueries({ queryKey: ["flashcards-due", user?.id] });
    },
  });

  return { all, due, create, review, remove };
}
