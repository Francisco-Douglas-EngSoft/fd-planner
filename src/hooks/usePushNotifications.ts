import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
}

export function usePushNotifications() {
  const { toast } = useToast();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
  });

  useEffect(() => {
    const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
    
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'denied',
    }));

    // Check if already subscribed
    if (isSupported && Notification.permission === 'granted') {
      setState(prev => ({ ...prev, isSubscribed: true }));
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast({
        title: "Notificações não suportadas",
        description: "Seu navegador não suporta notificações push.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      
      setState(prev => ({
        ...prev,
        permission,
        isSubscribed: permission === 'granted',
      }));

      if (permission === 'granted') {
        toast({
          title: "Notificações ativadas!",
          description: "Você receberá lembretes de estudo.",
        });
        
        // Show a test notification
        showNotification(
          'FD-Planner',
          'Notificações ativadas com sucesso! Você receberá lembretes de estudo.'
        );
        
        return true;
      } else if (permission === 'denied') {
        toast({
          title: "Notificações bloqueadas",
          description: "Você pode ativar nas configurações do navegador.",
          variant: "destructive",
        });
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast({
        title: "Erro ao solicitar permissão",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      return false;
    }
  }, [state.isSupported, toast]);

  const showNotification = useCallback((title: string, body: string, options?: NotificationOptions) => {
    if (!state.isSupported || Notification.permission !== 'granted') {
      return null;
    }

    try {
      const notification = new Notification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'fdplanner-notification',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }, [state.isSupported]);

  const scheduleStudyReminder = useCallback((minutesFromNow: number, message?: string) => {
    if (!state.isSubscribed) {
      return null;
    }

    const timeoutId = setTimeout(() => {
      showNotification(
        '⏰ Hora de estudar!',
        message || 'Está na hora da sua sessão de estudos. Vamos focar!',
        {
          requireInteraction: true,
        }
      );
    }, minutesFromNow * 60 * 1000);

    return timeoutId;
  }, [state.isSubscribed, showNotification]);

  const schedulePomodoroBreak = useCallback((isBreak: boolean, durationMinutes: number) => {
    if (!state.isSubscribed) {
      return null;
    }

    const timeoutId = setTimeout(() => {
      if (isBreak) {
        showNotification(
          '☕ Hora da pausa!',
          `Você completou uma sessão de foco! Descanse por ${durationMinutes} minutos.`,
        );
      } else {
        showNotification(
          '🎯 Pausa encerrada!',
          'Hora de voltar ao foco. Vamos continuar estudando!',
        );
      }
    }, durationMinutes * 60 * 1000);

    return timeoutId;
  }, [state.isSubscribed, showNotification]);

  const scheduleTaskReminder = useCallback((taskTitle: string, dueDate: Date) => {
    if (!state.isSubscribed) {
      return null;
    }

    const now = new Date();
    const timeDiff = dueDate.getTime() - now.getTime();
    
    // Notify 1 hour before
    if (timeDiff > 60 * 60 * 1000) {
      const timeoutId = setTimeout(() => {
        showNotification(
          '📋 Tarefa próxima do prazo',
          `"${taskTitle}" vence em 1 hora!`,
          { requireInteraction: true }
        );
      }, timeDiff - 60 * 60 * 1000);

      return timeoutId;
    }

    return null;
  }, [state.isSubscribed, showNotification]);

  const showImpulseAlert = useCallback(() => {
    if (!state.isSubscribed) {
      return;
    }

    showNotification(
      '🛡️ Mantenha o foco!',
      'Lembre-se dos seus objetivos. Você consegue resistir!',
      { requireInteraction: true }
    );
  }, [state.isSubscribed, showNotification]);

  return {
    ...state,
    requestPermission,
    showNotification,
    scheduleStudyReminder,
    schedulePomodoroBreak,
    scheduleTaskReminder,
    showImpulseAlert,
  };
}
