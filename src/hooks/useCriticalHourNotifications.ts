import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CriticalHourNotification {
  hour: string;
  message: string;
  technique: string;
}

const criticalHourMessages: Record<string, CriticalHourNotification> = {
  'Ao acordar': {
    hour: 'Ao acordar',
    message: '🌅 Bom dia! Comece o dia focado. Evite as redes sociais nos primeiros 30 minutos.',
    technique: 'Faça 5 respirações profundas antes de pegar o celular.'
  },
  'Antes do estudo': {
    hour: 'Antes do estudo',
    message: '📚 Hora de estudar! Deixe o celular longe e proteja seu foco.',
    technique: 'Coloque o celular em modo avião ou em outro cômodo.'
  },
  'Durante pausas': {
    hour: 'Durante pausas',
    message: '⏸️ Pausa consciente! Use esse tempo para se alongar, não para redes sociais.',
    technique: 'Levante, beba água e faça 10 polichinelos.'
  },
  'Após tarefas difíceis': {
    hour: 'Após tarefas difíceis',
    message: '💪 Você completou uma tarefa difícil! Celebre sem dopamina rápida.',
    technique: 'Comemore com uma caminhada curta ou música motivacional.'
  },
  'À noite': {
    hour: 'À noite',
    message: '🌙 Atenção! Este é um horário crítico para você. Mantenha o foco!',
    technique: 'Defina um horário limite para uso de telas.'
  },
  'Antes de dormir': {
    hour: 'Antes de dormir',
    message: '😴 Hora de descansar! Evite telas para dormir melhor.',
    technique: 'Troque o celular por um livro físico.'
  },
  'Fins de semana': {
    hour: 'Fins de semana',
    message: '📅 Final de semana! Cuidado com o excesso de tempo livre.',
    technique: 'Planeje atividades offline para ocupar seu tempo.'
  },
  'Quando entediado': {
    hour: 'Quando entediado',
    message: '🎯 Sentindo tédio? Este é um gatilho comum. Redirecione sua energia!',
    technique: 'Liste 3 coisas produtivas que você pode fazer agora.'
  }
};

// Map critical hours to actual time ranges
const getTimeBasedCriticalHours = (hour: number): string[] => {
  const triggered: string[] = [];
  
  // Ao acordar: 6-8h
  if (hour >= 6 && hour <= 8) triggered.push('Ao acordar');
  
  // Antes do estudo: 8-10h e 14-16h (típicos horários de início de estudo)
  if ((hour >= 8 && hour <= 10) || (hour >= 14 && hour <= 16)) triggered.push('Antes do estudo');
  
  // Durante pausas: verificado por outros meios (integração com timer)
  
  // À noite: 19-22h
  if (hour >= 19 && hour <= 22) triggered.push('À noite');
  
  // Antes de dormir: 22-24h
  if (hour >= 22 || hour === 0) triggered.push('Antes de dormir');
  
  // Fins de semana
  const today = new Date().getDay();
  if (today === 0 || today === 6) triggered.push('Fins de semana');
  
  return triggered;
};

// Session-level storage to prevent duplicate notifications across hook instances
const SESSION_NOTIFIED_KEY = 'fdplanner_critical_hour_notified';

function getSessionNotified(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(SESSION_NOTIFIED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markSessionNotified(tag: string) {
  const data = getSessionNotified();
  data[tag] = Date.now();
  sessionStorage.setItem(SESSION_NOTIFIED_KEY, JSON.stringify(data));
}

function wasRecentlyNotified(tag: string, cooldownMs: number = 60 * 60 * 1000): boolean {
  const data = getSessionNotified();
  const lastTime = data[tag];
  if (!lastTime) return false;
  return Date.now() - lastTime < cooldownMs;
}

export function useCriticalHourNotifications() {
  const { user } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [criticalHours, setCriticalHours] = useState<string[]>([]);
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      toast.error('Seu navegador não suporta notificações');
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        toast.success('Notificações ativadas!');
        return true;
      }
    }

    toast.error('Permissão de notificação negada');
    return false;
  }, []);

  // Load user's critical hours from profile
  useEffect(() => {
    const loadCriticalHours = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('addiction_profiles')
        .select('critical_hours')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.critical_hours) {
        setCriticalHours(data.critical_hours);
      }
    };

    loadCriticalHours();
  }, [user]);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  // Send notification — with session-level deduplication (1 hour cooldown)
  const sendNotification = useCallback((title: string, body: string, tag: string) => {
    if (!notificationsEnabled) return;

    // Prevent duplicate notifications within 1 hour (persisted in sessionStorage)
    if (wasRecentlyNotified(tag)) return;
    markSessionNotified(tag);

    // Show browser notification only (no in-app toast to reduce noise)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.png',
        tag,
        requireInteraction: false,
      });
    }
  }, [notificationsEnabled]);

  // Check for critical hours periodically
  useEffect(() => {
    if (!notificationsEnabled || criticalHours.length === 0) return;

    const checkCriticalHours = () => {
      const currentHour = new Date().getHours();
      const triggeredHours = getTimeBasedCriticalHours(currentHour);
      
      // Check which of the user's critical hours are currently active
      const activeHours = triggeredHours.filter(h => criticalHours.includes(h));
      
      if (activeHours.length > 0) {
        // Only notify the first matching critical hour
        const hourToNotify = activeHours[0];
        const notification = criticalHourMessages[hourToNotify];
        
        if (notification) {
          sendNotification(
            '⚡ Horário Crítico - AntiVício',
            notification.message,
            hourToNotify
          );
        }
      }
    };

    // Check immediately on mount
    checkCriticalHours();

    // Check every 30 minutes instead of 15 to reduce noise
    checkIntervalRef.current = setInterval(checkCriticalHours, 30 * 60 * 1000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [notificationsEnabled, criticalHours, sendNotification]);

  // Manual trigger for specific hour type (bypasses cooldown partially)
  const triggerNotification = useCallback((hourType: string) => {
    const notification = criticalHourMessages[hourType];
    if (notification) {
      // Manual triggers use a unique tag so they always show
      const tag = `manual-${hourType}`;
      if (wasRecentlyNotified(tag, 5 * 60 * 1000)) return; // 5 min cooldown for manual
      markSessionNotified(tag);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('⚡ Alerta AntiVício', {
          body: notification.message,
          icon: '/favicon.png',
          tag,
          requireInteraction: false,
        });
      }

      toast.info(notification.technique, { duration: 10000 });
    }
  }, []);

  return {
    notificationsEnabled,
    requestPermission,
    triggerNotification,
    criticalHours,
  };
}
