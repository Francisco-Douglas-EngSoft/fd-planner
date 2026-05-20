/**
 * useRealtimeFocusSessions
 * Escuta mudanças (INSERT/UPDATE/DELETE) na tabela `focus_sessions` do usuário
 * e expõe um `refreshKey` que incrementa a cada evento. Componentes podem usar
 * esse valor como dependência de useEffect para refazer fetches em tempo real.
 *
 * Também adiciona um listener para o evento custom `fdplanner:focus-session-saved`
 * disparado localmente pelo timer logo após gravar uma sessão — assim a UI
 * atualiza instantaneamente sem esperar o round-trip do Realtime do Supabase.
 */

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const FOCUS_SESSION_SAVED_EVENT = 'fdplanner:focus-session-saved';

export function useRealtimeFocusSessions(userId: string | undefined): number {
  const [refreshKey, setRefreshKey] = useState(0);
  const channelIdRef = useRef<string>(`focus-sessions-global-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!userId) return;

    const bump = () => setRefreshKey((k) => k + 1);

    const channel = supabase
      .channel(channelIdRef.current)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'focus_sessions',
          filter: `user_id=eq.${userId}`,
        },
        bump,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses',
          filter: `user_id=eq.${userId}`,
        },
        bump,
      )
      .subscribe();

    const onLocalEvent = () => bump();
    window.addEventListener(FOCUS_SESSION_SAVED_EVENT, onLocalEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(FOCUS_SESSION_SAVED_EVENT, onLocalEvent);
    };
  }, [userId]);

  return refreshKey;
}

/** Dispara o evento local — chame logo após inserir/atualizar uma focus_session. */
export function emitFocusSessionSaved() {
  try {
    window.dispatchEvent(new CustomEvent(FOCUS_SESSION_SAVED_EVENT));
  } catch {
    // ignore
  }
}
