import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { summarizeStorage, type BookFiles, type StorageObject } from "@/lib/libraryStorage";

export const STORAGE_USAGE_KEY = "storage-usage";

/** Tudo o que o usuário tem no Storage (livros, capas, cursos, notas) somado. */
export function useStorageUsage(books: BookFiles[]) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: [STORAGE_USAGE_KEY, user?.id],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<StorageObject[]> => {
      const { data, error } = await supabase.rpc("get_my_storage_objects");
      if (error) throw error;
      return (data ?? []) as StorageObject[];
    },
  });

  const summary = useMemo(() => summarizeStorage(query.data ?? [], books), [query.data, books]);
  /** Sem a listagem do Storage (ex.: offline), a soma vem só do tamanho gravado nos livros. */
  const estimated = !query.data;
  const total = estimated
    ? books.reduce((s, b) => s + (summary.perBook.get(b.id)?.total ?? 0), 0)
    : summary.total;

  return { ...summary, total, estimated, isLoading: query.isLoading, refetch: query.refetch };
}
