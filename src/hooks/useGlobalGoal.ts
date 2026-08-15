import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  cacheGlobalGoal,
  flushGlobalGoalQueue,
  getCachedGlobalGoal,
  getPendingGlobalGoal,
  hasPendingGlobalGoal,
  isOnline as checkOnline,
  saveGlobalGoal,
} from '@/lib/offlinePlanningStore';

export interface GlobalGoalConfig {
  hoursPerDay: number;
  /** Dias da semana (0 = domingo). */
  days: number[];
  /** yyyy-MM-dd */
  startDate: string;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const defaultGlobalGoal = (): GlobalGoalConfig => ({
  hoursPerDay: 4,
  days: [1, 2, 3, 4, 5, 6],
  startDate: todayISO(),
});

function normalize(row: Partial<GlobalGoalConfig> | null | undefined): GlobalGoalConfig {
  const base = defaultGlobalGoal();
  if (!row) return base;
  return {
    hoursPerDay: Number(row.hoursPerDay) > 0 ? Number(row.hoursPerDay) : base.hoursPerDay,
    days: Array.isArray(row.days) && row.days.length > 0 ? row.days.map(Number) : base.days,
    startDate: row.startDate || base.startDate,
  };
}

/**
 * Meta global do usuário: funciona offline (cache local + fila de escrita) e
 * sincroniza com o Supabase — em tempo real entre dispositivos — assim que a
 * conexão volta.
 */
export function useGlobalGoal() {
  const { user } = useAuth();
  const [config, setConfig] = useState<GlobalGoalConfig>(defaultGlobalGoal);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [online, setOnline] = useState(checkOnline);
  const [pendingSync, setPendingSync] = useState(false);
  const hydrated = useRef(false);
  const lastSaved = useRef<string>('');

  // Estado de conexão
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Carrega: cache local primeiro (offline-first) e depois o servidor.
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);

    const local = getPendingGlobalGoal(user.id) ?? getCachedGlobalGoal(user.id);
    if (local) {
      const next = normalize(local);
      setConfig(next);
      lastSaved.current = JSON.stringify(next);
    }
    setPendingSync(hasPendingGlobalGoal(user.id));

    if (!checkOnline()) {
      setLoading(false);
      hydrated.current = true;
      return () => {
        cancelled = true;
      };
    }

    supabase
      .from('planning_global_goals')
      .select('hours_per_day, study_days, start_date')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        // Uma alteração feita offline é mais recente que o servidor: mantém local.
        if (data && !hasPendingGlobalGoal(user.id)) {
          const next = normalize({
            hoursPerDay: Number(data.hours_per_day),
            days: (data.study_days as unknown as number[]) ?? undefined,
            startDate: data.start_date as string,
          });
          lastSaved.current = JSON.stringify(next);
          cacheGlobalGoal(user.id, next);
          setConfig(next);
        }
        setLoading(false);
        hydrated.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Libera a fila quando a conexão volta (e ao abrir o app online).
  useEffect(() => {
    if (!user || !online) return;
    let cancelled = false;

    flushGlobalGoalQueue(user.id).then((flushed) => {
      if (cancelled) return;
      setPendingSync(hasPendingGlobalGoal(user.id));
      if (flushed) {
        setSyncError(false);
        setSavedAt(new Date());
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, online]);

  // Atualização imediata quando a meta muda em outro dispositivo.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`planning_global_goals:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planning_global_goals',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as
            | { hours_per_day?: number; study_days?: number[]; start_date?: string }
            | undefined;
          if (!row) return;
          // Não sobrescreve alterações locais ainda não sincronizadas.
          if (hasPendingGlobalGoal(user.id)) return;
          const next = normalize({
            hoursPerDay: Number(row.hours_per_day),
            days: row.study_days,
            startDate: row.start_date,
          });
          const serialized = JSON.stringify(next);
          if (serialized === lastSaved.current) return;
          lastSaved.current = serialized;
          cacheGlobalGoal(user.id, next);
          setConfig(next);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Salvamento automático com debounce (local sempre, servidor quando possível).
  useEffect(() => {
    if (!user || !hydrated.current) return;
    const serialized = JSON.stringify(config);
    if (serialized === lastSaved.current) return;

    const timeout = setTimeout(async () => {
      const result = await saveGlobalGoal(user.id, config);
      if (result === 'synced') {
        lastSaved.current = serialized;
        setSyncError(false);
        setPendingSync(false);
        setSavedAt(new Date());
      } else {
        setPendingSync(true);
        setSyncError(!checkOnline() ? false : true);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [config, user]);

  const update = useCallback(
    (patch: Partial<GlobalGoalConfig> | ((prev: GlobalGoalConfig) => GlobalGoalConfig)) =>
      setConfig((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch })),
    [],
  );

  return { config, setConfig: update, loading, savedAt, syncError, online, pendingSync };
}
