import { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, Clock, Calendar, CheckCircle2, XCircle, Loader2, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface StudyReminder {
  id: string;
  title: string;
  message: string | null;
  reminder_type: string;
  reminder_time: string;
  days_of_week: string[];
  is_active: boolean;
}

const DAYS = [
  { id: 'monday', label: 'Seg' },
  { id: 'tuesday', label: 'Ter' },
  { id: 'wednesday', label: 'Qua' },
  { id: 'thursday', label: 'Qui' },
  { id: 'friday', label: 'Sex' },
  { id: 'saturday', label: 'Sáb' },
  { id: 'sunday', label: 'Dom' },
];

export function StudyRemindersManager() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [newReminder, setNewReminder] = useState({
    title: '',
    message: '',
    reminder_type: 'daily',
    reminder_time: '09:00',
    days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  });

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

  const fetchReminders = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('study_reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('reminder_time');

      if (error) throw error;
      setReminders(data || []);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async () => {
    if (!user || !newReminder.title) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('study_reminders')
        .insert({
          user_id: user.id,
          title: newReminder.title,
          message: newReminder.message || null,
          reminder_type: newReminder.reminder_type,
          reminder_time: newReminder.reminder_time,
          days_of_week: newReminder.days_of_week,
          is_active: true,
        });

      if (error) throw error;
      
      toast.success('Lembrete criado!');
      setDialogOpen(false);
      setNewReminder({
        title: '',
        message: '',
        reminder_type: 'daily',
        reminder_time: '09:00',
        days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      });
      fetchReminders();
    } catch (error) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
    }
  };

  const toggleReminder = async (id: string, is_active: boolean) => {
    try {
      const { error } = await supabase
        .from('study_reminders')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
      
      setReminders(prev => prev.map(r => r.id === id ? { ...r, is_active } : r));
      toast.success(is_active ? 'Lembrete ativado' : 'Lembrete desativado');
    } catch (error) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      const { error } = await supabase
        .from('study_reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setReminders(prev => prev.filter(r => r.id !== id));
      toast.success('Lembrete removido');
    } catch (error) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const toggleDay = (day: string) => {
    setNewReminder(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day],
    }));
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const getDaysLabel = (days: string[]) => {
    if (days.length === 7) return 'Todos os dias';
    if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) {
      return 'Dias úteis';
    }
    return days.map(d => DAYS.find(day => day.id === d)?.label).filter(Boolean).join(', ');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Lembretes de Estudo
          </CardTitle>
          <CardDescription>
            Configure lembretes para manter sua rotina
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Lembrete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Lembrete</DialogTitle>
              <DialogDescription>Configure um lembrete para seus estudos</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={newReminder.title}
                  onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                  placeholder="Ex: Hora de estudar!"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Mensagem (opcional)</Label>
                <Input
                  value={newReminder.message}
                  onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
                  placeholder="Ex: Foco nos seus objetivos!"
                />
              </div>

              <div className="space-y-2">
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={newReminder.reminder_time}
                  onChange={(e) => setNewReminder({ ...newReminder, reminder_time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={newReminder.reminder_type}
                  onValueChange={(value) => setNewReminder({ ...newReminder, reminder_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((day) => (
                    <Button
                      key={day.id}
                      type="button"
                      variant={newReminder.days_of_week.includes(day.id) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleDay(day.id)}
                    >
                      {day.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddReminder} disabled={saving || !newReminder.title}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Lembrete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed rounded-xl">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum lembrete configurado</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Crie lembretes para manter sua rotina de estudos
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                  reminder.is_active ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${reminder.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                    <Clock className={`h-5 w-5 ${reminder.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{reminder.title}</p>
                      <Badge variant={reminder.is_active ? 'default' : 'secondary'}>
                        {formatTime(reminder.reminder_time)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getDaysLabel(reminder.days_of_week)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={reminder.is_active}
                    onCheckedChange={(checked) => toggleReminder(reminder.id, checked)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteReminder(reminder.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
