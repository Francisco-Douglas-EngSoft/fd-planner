import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { 
  Bell, 
  Clock, 
  Zap, 
  Brain,
  Calendar,
  Settings2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomReminder {
  id: string;
  title: string;
  time: string;
  days: number[];
  enabled: boolean;
  type: 'motivation' | 'warning' | 'checkin' | 'custom';
}

interface ReminderSettings {
  enabled: boolean;
  frequency: number; // minutes between reminders
  quietHoursStart: string;
  quietHoursEnd: string;
  criticalHourAlerts: boolean;
  dailyCheckinReminder: boolean;
  checkinTime: string;
  weeklyReportReminder: boolean;
  customReminders: CustomReminder[];
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: true,
  frequency: 60,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  criticalHourAlerts: true,
  dailyCheckinReminder: true,
  checkinTime: '21:00',
  weeklyReportReminder: true,
  customReminders: [],
};

const REMINDER_TYPES = [
  { value: 'motivation', label: 'Motivação', icon: Zap, color: 'text-primary' },
  { value: 'warning', label: 'Alerta', icon: AlertCircle, color: 'text-warning' },
  { value: 'checkin', label: 'Check-in', icon: CheckCircle2, color: 'text-success' },
  { value: 'custom', label: 'Personalizado', icon: Brain, color: 'text-accent' },
];

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function SmartRemindersCard() {
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminder, setNewReminder] = useState<Partial<CustomReminder>>({
    title: '',
    time: '12:00',
    days: [1, 2, 3, 4, 5],
    type: 'motivation',
    enabled: true,
  });
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('antivicio-reminders');
    if (saved) {
      setSettings(JSON.parse(saved));
    }

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const saveSettings = useCallback((newSettings: ReminderSettings) => {
    setSettings(newSettings);
    localStorage.setItem('antivicio-reminders', JSON.stringify(newSettings));
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Seu navegador não suporta notificações');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    
    if (permission === 'granted') {
      toast.success('Notificações ativadas!');
    } else {
      toast.error('Permissão de notificação negada');
    }
  };

  const addCustomReminder = () => {
    if (!newReminder.title || !newReminder.time) {
      toast.error('Preencha título e horário');
      return;
    }

    const reminder: CustomReminder = {
      id: `reminder-${Date.now()}`,
      title: newReminder.title || '',
      time: newReminder.time || '12:00',
      days: newReminder.days || [1, 2, 3, 4, 5],
      enabled: true,
      type: (newReminder.type as CustomReminder['type']) || 'custom',
    };

    saveSettings({
      ...settings,
      customReminders: [...settings.customReminders, reminder],
    });

    setNewReminder({
      title: '',
      time: '12:00',
      days: [1, 2, 3, 4, 5],
      type: 'motivation',
      enabled: true,
    });
    setShowAddReminder(false);
    toast.success('Lembrete adicionado!');
  };

  const deleteReminder = (id: string) => {
    saveSettings({
      ...settings,
      customReminders: settings.customReminders.filter(r => r.id !== id),
    });
    toast.success('Lembrete removido');
  };

  const toggleReminderEnabled = (id: string) => {
    saveSettings({
      ...settings,
      customReminders: settings.customReminders.map(r =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      ),
    });
  };

  const toggleDay = (day: number) => {
    const days = newReminder.days || [];
    setNewReminder({
      ...newReminder,
      days: days.includes(day) 
        ? days.filter(d => d !== day)
        : [...days, day].sort(),
    });
  };

  return (
    <Card className="border-0 shadow-xl overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-warning via-primary to-accent" />
      
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5">
              <Bell className="h-5 w-5 text-warning" />
            </div>
            <div>
              <CardTitle className="text-lg">Lembretes Inteligentes</CardTitle>
              <CardDescription className="text-xs">
                Configure alertas personalizados
              </CardDescription>
            </div>
          </div>
          
          {notificationPermission !== 'granted' && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={requestNotificationPermission}
              className="gap-2"
            >
              <Bell className="h-4 w-4" />
              Ativar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Main Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
          <div className="flex items-center gap-3">
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => saveSettings({ ...settings, enabled: checked })}
            />
            <div>
              <Label className="font-medium">Lembretes Ativos</Label>
              <p className="text-xs text-muted-foreground">
                Receba notificações durante o dia
              </p>
            </div>
          </div>
          {settings.enabled && (
            <Badge variant="secondary" className="bg-success/10 text-success">
              Ativo
            </Badge>
          )}
        </div>

        {/* Quick Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Configurações Rápidas
          </h4>

          <div className="grid gap-3">
            {/* Critical Hour Alerts */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-sm">Alertas em Horários Críticos</span>
              </div>
              <Switch
                checked={settings.criticalHourAlerts}
                onCheckedChange={(checked) => 
                  saveSettings({ ...settings, criticalHourAlerts: checked })
                }
              />
            </div>

            {/* Daily Check-in */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm">Lembrete de Check-in Diário</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={settings.checkinTime}
                  onChange={(e) => saveSettings({ ...settings, checkinTime: e.target.value })}
                  className="w-24 h-8 text-xs"
                  disabled={!settings.dailyCheckinReminder}
                />
                <Switch
                  checked={settings.dailyCheckinReminder}
                  onCheckedChange={(checked) => 
                    saveSettings({ ...settings, dailyCheckinReminder: checked })
                  }
                />
              </div>
            </div>

            {/* Weekly Report */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm">Relatório Semanal</span>
              </div>
              <Switch
                checked={settings.weeklyReportReminder}
                onCheckedChange={(checked) => 
                  saveSettings({ ...settings, weeklyReportReminder: checked })
                }
              />
            </div>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Horário Silencioso
          </h4>
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/20">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Das</Label>
              <Input
                type="time"
                value={settings.quietHoursStart}
                onChange={(e) => saveSettings({ ...settings, quietHoursStart: e.target.value })}
                className="w-24 h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">às</Label>
              <Input
                type="time"
                value={settings.quietHoursEnd}
                onChange={(e) => saveSettings({ ...settings, quietHoursEnd: e.target.value })}
                className="w-24 h-8"
              />
            </div>
          </div>
        </div>

        {/* Custom Reminders */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Lembretes Personalizados
            </h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddReminder(!showAddReminder)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          </div>

          <AnimatePresence>
            {showAddReminder && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-4"
              >
                <Input
                  placeholder="Título do lembrete"
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                />
                
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Horário</Label>
                    <Input
                      type="time"
                      value={newReminder.time}
                      onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Tipo</Label>
                    <select
                      value={newReminder.type}
                      onChange={(e) => setNewReminder({ ...newReminder, type: e.target.value as CustomReminder['type'] })}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {REMINDER_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Dias da Semana</Label>
                  <div className="flex gap-1">
                    {DAYS.map((day, index) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(index)}
                        className={`px-2 py-1 text-xs rounded-md transition-colors ${
                          newReminder.days?.includes(index)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={addCustomReminder} className="flex-1">
                    Adicionar
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddReminder(false)}>
                    Cancelar
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reminder List */}
          <div className="space-y-2">
            {settings.customReminders.map((reminder) => {
              const typeInfo = REMINDER_TYPES.find(t => t.value === reminder.type);
              const Icon = typeInfo?.icon || Bell;
              
              return (
                <motion.div
                  key={reminder.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/20 group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${typeInfo?.color || 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-sm font-medium">{reminder.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {reminder.time} • {reminder.days.map(d => DAYS[d]).join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={reminder.enabled}
                      onCheckedChange={() => toggleReminderEnabled(reminder.id)}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteReminder(reminder.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}

            {settings.customReminders.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum lembrete personalizado
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
