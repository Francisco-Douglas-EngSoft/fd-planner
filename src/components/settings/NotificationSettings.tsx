import { Bell, BellOff, BellRing, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useState } from 'react';

export function NotificationSettings() {
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    requestPermission,
    showNotification 
  } = usePushNotifications();

  const [studyReminders, setStudyReminders] = useState(true);
  const [pomodoroAlerts, setPomodoroAlerts] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [impulseAlerts, setImpulseAlerts] = useState(true);

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  const handleTestNotification = () => {
    showNotification(
      '🔔 Teste de Notificação',
      'As notificações estão funcionando corretamente!'
    );
  };

  if (!isSupported) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <BellOff className="h-5 w-5" />
            Notificações não suportadas
          </CardTitle>
          <CardDescription>
            Seu navegador não suporta notificações push. Tente usar um navegador mais recente.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Notificações Push
        </CardTitle>
        <CardDescription>
          Receba lembretes e alertas para manter sua rotina de estudos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Permission status */}
        {permission === 'default' && (
          <div className="flex flex-col gap-4 p-4 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-3">
              <BellRing className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Ativar notificações</p>
                <p className="text-sm text-muted-foreground">
                  Permita notificações para receber lembretes de estudo, alertas de pomodoro e mais.
                </p>
              </div>
            </div>
            <Button onClick={handleEnableNotifications} className="w-full sm:w-auto">
              <Bell className="h-4 w-4 mr-2" />
              Permitir Notificações
            </Button>
          </div>
        )}

        {permission === 'denied' && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <BellOff className="h-5 w-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Notificações bloqueadas</p>
              <p className="text-sm text-muted-foreground">
                Você bloqueou as notificações. Para ativar, acesse as configurações do seu navegador.
              </p>
            </div>
          </div>
        )}

        {isSubscribed && (
          <>
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Notificações ativas</p>
                  <p className="text-sm text-muted-foreground">
                    Você receberá alertas e lembretes
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleTestNotification}>
                Testar
              </Button>
            </div>

            {/* Notification preferences */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Tipos de notificação
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor="study-reminders" className="cursor-pointer">
                        Lembretes de estudo
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Receba lembretes para iniciar sessões de estudo
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="study-reminders"
                    checked={studyReminders}
                    onCheckedChange={setStudyReminders}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor="pomodoro-alerts" className="cursor-pointer">
                        Alertas de Pomodoro
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Notificações de início/fim de sessões de foco
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="pomodoro-alerts"
                    checked={pomodoroAlerts}
                    onCheckedChange={setPomodoroAlerts}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor="task-reminders" className="cursor-pointer">
                        Lembretes de tarefas
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Alertas antes do prazo de tarefas
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="task-reminders"
                    checked={taskReminders}
                    onCheckedChange={setTaskReminders}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <BellRing className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label htmlFor="impulse-alerts" className="cursor-pointer">
                        Alertas Anti-Vício
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Notificações durante horários críticos
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="impulse-alerts"
                    checked={impulseAlerts}
                    onCheckedChange={setImpulseAlerts}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
