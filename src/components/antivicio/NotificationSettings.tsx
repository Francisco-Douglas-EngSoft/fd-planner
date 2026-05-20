import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useCriticalHourNotifications } from '@/hooks/useCriticalHourNotifications';
import { cn } from '@/lib/utils';

const criticalHourLabels: Record<string, { emoji: string; timeRange: string }> = {
  'Ao acordar': { emoji: '🌅', timeRange: '6h - 8h' },
  'Antes do estudo': { emoji: '📚', timeRange: '8h - 10h, 14h - 16h' },
  'Durante pausas': { emoji: '⏸️', timeRange: 'Durante sessões' },
  'Após tarefas difíceis': { emoji: '💪', timeRange: 'Após completar tarefas' },
  'À noite': { emoji: '🌙', timeRange: '19h - 22h' },
  'Antes de dormir': { emoji: '😴', timeRange: '22h - 00h' },
  'Fins de semana': { emoji: '📅', timeRange: 'Sábados e Domingos' },
  'Quando entediado': { emoji: '🎯', timeRange: 'Detectado por comportamento' },
};

export function NotificationSettings() {
  const { 
    notificationsEnabled, 
    requestPermission, 
    triggerNotification,
    criticalHours 
  } = useCriticalHourNotifications();
  
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
    }
  }, [notificationsEnabled]);

  const handleEnableNotifications = async () => {
    const success = await requestPermission();
    if (success) {
      setPermissionState('granted');
    }
  };

  const handleTestNotification = (hour: string) => {
    triggerNotification(hour);
  };

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Notificações de Horários Críticos
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Receba alertas nos momentos em que você é mais vulnerável a impulsos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg",
          notificationsEnabled ? "bg-success/10" : "bg-muted"
        )}>
          <div className="flex items-center gap-3">
            {notificationsEnabled ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {notificationsEnabled ? 'Notificações Ativas' : 'Notificações Desativadas'}
              </p>
              <p className="text-xs text-muted-foreground">
                {notificationsEnabled 
                  ? 'Você receberá alertas nos horários críticos'
                  : 'Ative para receber lembretes importantes'}
              </p>
            </div>
          </div>
          {!notificationsEnabled && (
            <Button size="sm" onClick={handleEnableNotifications}>
              <Bell className="h-4 w-4 mr-2" />
              Ativar
            </Button>
          )}
        </div>

        {/* Critical Hours List */}
        {criticalHours.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Seus Horários Críticos
            </p>
            <div className="grid gap-2">
              {criticalHours.map((hour) => {
                const label = criticalHourLabels[hour];
                return (
                  <div
                    key={hour}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{label?.emoji || '⏰'}</span>
                      <div>
                        <p className="text-sm font-medium">{hour}</p>
                        <p className="text-xs text-muted-foreground">
                          {label?.timeRange || 'Horário variável'}
                        </p>
                      </div>
                    </div>
                    {notificationsEnabled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTestNotification(hour)}
                      >
                        Testar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum horário crítico configurado.
            </p>
            <p className="text-xs text-muted-foreground">
              Complete o diagnóstico AntiVício para configurar seus horários.
            </p>
          </div>
        )}

        {/* Info */}
        {notificationsEnabled && criticalHours.length > 0 && (
          <div className="bg-primary/5 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">
              <strong>💡 Como funciona:</strong> Você receberá notificações quando entrar em um horário crítico, 
              com mensagens motivacionais e técnicas para ajudá-lo a manter o foco.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
