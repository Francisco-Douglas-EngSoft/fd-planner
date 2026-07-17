import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { libraryService, type BookRow } from "@/services/libraryService";

export function useBooks() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["books", user?.id],
    queryFn: () => (user ? libraryService.list(user.id) : Promise.resolve([] as BookRow[])),
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: (payload: Partial<BookRow> & { title: string }) => {
      if (!user) throw new Error("Sem sessão");
      return libraryService.create({ ...payload, user_id: user.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books", user?.id] }),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<BookRow> }) => libraryService.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books", user?.id] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => libraryService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["books", user?.id] }),
  });

  return { ...query, create, update, remove };
}
