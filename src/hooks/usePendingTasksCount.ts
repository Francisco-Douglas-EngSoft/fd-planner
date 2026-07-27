import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Conta tarefas pendentes (não concluídas/canceladas) do usuário logado.
 * Atualiza em tempo real via Supabase Realtime.
 */
export function usePendingTasksCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    let active = true;

    const fetchCount = async () => {
      const { count: pending } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['pending', 'in_progress']);

      if (active) setCount(pending || 0);
    };

    fetchCount();

    const channel = supabase
      .channel(`pending-tasks-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
}