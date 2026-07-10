import { Bell, BellOff, BellRing, Clock, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useEffect, useState } from 'react';
import { enableFcm, sendTestPush, sendAllTestPush, TEST_NOTIFICATIONS, isFirebaseConfigured } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function NotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    showNotification,
  } = usePushNotifications();
  const { toast } = useToast();
  const fcmReady = isFirebaseConfigured();

  const [studyReminders, setStudyReminders] = useState(true);
  const [pomodoroAlerts, setPomodoroAlerts] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [impulseAlerts, setImpulseAlerts] = useState(true);
  const [enabling, setEnabling] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingAll, setTestingAll] = useState(false);

  // Garante que o token deste dispositivo esteja salvo quando a permissão já foi concedida.
  useEffect(() => {
    if (fcmReady && permission === 'granted') {
      void enableFcm();
    }
  }, [fcmReady, permission]);

  const handleEnableNotifications = async () => {
    setEnabling(true);
    try {
      const granted = await requestPermission();
      if (granted && fcmReady) {
        const res = await enableFcm();
        if (res.ok) {
          toast({
            title: 'Push ativado!',
            description: 'Este dispositivo foi registrado para receber notificações.',
          });
        } else if (res.error !== 'permission_denied') {
          toast({
            title: 'Não foi possível registrar o push',
            description: res.error === 'not_authenticated'
              ? 'Faça login para registrar as notificações.'
              : `Detalhe: ${res.error}`,
            variant: 'destructive',
          });
        }
      }
    } finally {
      setEnabling(false);
    }
  };

  const handleTestNotification = async () => {
    if (!fcmReady) {
      showNotification('🔔 Teste de Notificação', 'As notificações locais estão funcionando!');
      return;
    }
    setTesting(true);
    try {
      const res = await sendTestPush();
      if (res.ok && (res.sent ?? 0) > 0) {
        toast({ title: 'Push enviado!', description: 'Verifique a notificação do sistema.' });
      } else if (res.ok) {
        toast({
          title: 'Nenhum dispositivo registrado',
          description: 'Clique em "Permitir Notificações" primeiro.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Falha no envio', description: res.error, variant: 'destructive' });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleTestAll = async () => {
    setTestingAll(true);
    try {
      // Sem Firebase configurado: dispara as notificações locais em sequência.
      if (!fcmReady) {
        TEST_NOTIFICATIONS.forEach((n, i) => {
          setTimeout(() => showNotification(n.title, n.body), i * 1500);
        });
        toast({
          title: 'Enviando testes locais',
          description: `${TEST_NOTIFICATIONS.length} notificações serão exibidas em sequência.`,
        });
        return;
      }

      const res = await sendAllTestPush();
      if (res.delivered > 0) {
        toast({
          title: 'Testes enviados!',
          description: `${res.total} tipos disparados • ${res.delivered} push(es) entregue(s) aos seus dispositivos.`,
        });
      } else if (res.ok) {
        toast({
          title: 'Nenhum dispositivo registrado',
          description: 'Ative e permita as notificações neste dispositivo primeiro.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Falha em alguns envios', description: res.error, variant: 'destructive' });
      }
    } finally {
      setTestingAll(false);
    }
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
        {!fcmReady && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div>
              <p className="font-medium">Push do Firebase não configurado</p>
              <p className="text-sm text-muted-foreground">
                As credenciais públicas do Firebase ainda não foram adicionadas. Por enquanto só
                funcionam notificações locais (com o app aberto).
              </p>
            </div>
          </div>
        )}
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
            <Button onClick={handleEnableNotifications} disabled={enabling} className="w-full sm:w-auto">
              {enabling ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bell className="h-4 w-4 mr-2" />}
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
              <Button variant="outline" size="sm" onClick={handleTestNotification} disabled={testing}>
                {testing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                Testar
              </Button>
            </div>

            {/* Teste completo de todos os tipos */}
            <div className="flex flex-col gap-3 p-4 rounded-lg border border-dashed border-border bg-muted/30">
              <div className="flex items-start gap-3">
                <BellRing className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Testar todo o sistema</p>
                  <p className="text-sm text-muted-foreground">
                    Dispara uma amostra de <strong>todos os {TEST_NOTIFICATIONS.length} tipos</strong> de
                    notificação (estudo, Pomodoro, tarefas, Anti-Vício, conquistas e recompensas), em
                    sequência, apenas para conferência.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleTestAll}
                disabled={testingAll}
                className="w-full sm:w-auto"
              >
                {testingAll ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BellRing className="h-4 w-4 mr-2" />
                )}
                Enviar todas as notificações de teste
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
