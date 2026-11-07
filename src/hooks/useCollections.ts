import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { collectionsService, type Collection } from "@/services/collectionsService";

export function useCollections() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["collections", user?.id],
    queryFn: () => (user ? collectionsService.list(user.id) : []),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const create = useMutation({
    mutationFn: ({ name, color, icon }: { name: string; color?: string; icon?: string }) => {
      if (!user) throw new Error("Sem sessão");
      return collectionsService.create(user.id, name, color, icon);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections", user?.id] }),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<Collection, "name" | "color" | "icon">> }) =>
      collectionsService.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections", user?.id] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => collectionsService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections", user?.id] }),
  });

  const addBook = useMutation({
    mutationFn: ({ bookId, collectionId }: { bookId: string; collectionId: string }) =>
      collectionsService.addBook(bookId, collectionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections", user?.id] }),
  });

  const removeBook = useMutation({
    mutationFn: ({ bookId, collectionId }: { bookId: string; collectionId: string }) =>
      collectionsService.removeBook(bookId, collectionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections", user?.id] }),
  });

  return { ...query, create, update, remove, addBook, removeBook };
}
