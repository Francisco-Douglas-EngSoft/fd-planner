import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cacheActivePlans, getCachedActivePlans, isOnline as checkOnline } from '@/lib/offlinePlanningStore';

/**
 * Mantém uma cópia local dos planejamentos para que o planejamento ativo
 * continue disponível sem conexão. Quando a lista vinda do servidor está
 * vazia (offline), devolve a última versão salva localmente.
 */
export function useOfflinePlans<T>(plans: T[] | undefined | null) {
  const { user } = useAuth();
  const [fallback, setFallback] = useState<{ plans: T[]; updatedAt: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    if (plans && plans.length > 0) {
      cacheActivePlans(user.id, plans);
      setFallback(null);
      return;
    }
    setFallback(getCachedActivePlans<T>(user.id));
  }, [user, plans]);

  const usingCache = (!plans || plans.length === 0) && (fallback?.plans.length ?? 0) > 0;

  return useMemo(
    () => ({
      plans: usingCache ? (fallback?.plans as T[]) : plans ?? [],
      usingCache,
      cachedAt: usingCache && fallback ? new Date(fallback.updatedAt) : null,
      online: checkOnline(),
    }),
    [plans, fallback, usingCache],
  );
}
