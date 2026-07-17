import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { mindMapService } from "@/services/mindMapService";

export function useMindMaps() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["mind-maps", user?.id],
    queryFn: () => (user ? mindMapService.list(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: (payload: { title: string; description?: string | null }) => {
      if (!user) throw new Error("Sem sessão");
      return mindMapService.create({ ...payload, user_id: user.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mind-maps", user?.id] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => mindMapService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mind-maps", user?.id] }),
  });

  return { ...query, create, remove };
}
