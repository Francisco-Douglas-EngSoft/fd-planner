import { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Clock, CheckCircle2, TrendingUp, Loader2, CalendarIcon, Edit2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Goal {
  id: string;
  title: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  month_start: string;
  month_end: string;
  is_completed: boolean;
  period_type: string;
}

const GOAL_TYPES = [
  { value: 'hours', label: 'Horas de Estudo', unit: 'h', icon: Clock },
  { value: 'courses', label: 'Cursos Concluídos', unit: '', icon: Target },
  { value: 'tasks', label: 'Tarefas Concluídas', unit: '', icon: CheckCircle2 },
  { value: 'focus_sessions', label: 'Sessões de Foco', unit: '', icon: TrendingUp },
];

const PERIOD_TYPES = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'bimonthly', label: 'Bimestral' },
  { value: 'semiannual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'custom', label: 'Personalizado' },
];

const periodLabel = (p: string) => PERIOD_TYPES.find((t) => t.value === p)?.label || 'Personalizado';

function computeRange(period: string, base: Date = new Date()): { start: Date; end: Date } {
  switch (period) {
    case 'weekly':
      return { start: startOfWeek(base, { weekStartsOn: 1 }), end: endOfWeek(base, { weekStartsOn: 1 }) };
    case 'monthly':
      return { start: startOfMonth(base), end: endOfMonth(base) };
    case 'bimonthly':
      // 2 meses completos
      return { start: startOfMonth(base), end: endOfMonth(addMonths(base, 1)) };
    case 'semiannual':
      // 6 meses completos
      return { start: startOfMonth(base), end: endOfMonth(addMonths(base, 5)) };
    case 'annual':
      // 12 meses completos
      return { start: startOfMonth(base), end: endOfMonth(addMonths(base, 11)) };
    default:
      return { start: startOfMonth(base), end: endOfMonth(base) };
  }
}

export function UnifiedGoalsManager() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    goal_type: 'hours',
    target_value: 40,
    period_type: 'weekly',
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
  });

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  // Auto-calculate range when period changes (except custom)
  useEffect(() => {
    if (form.period_type !== 'custom') {
      const { start, end } = computeRange(form.period_type);
      setForm((f) => ({ ...f, start_date: start, end_date: end }));
    }
  }, [form.period_type]);

  const fetchGoals = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('monthly_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('month_start', { ascending: false });
      if (fetchErr) throw fetchErr;

      const updated = await Promise.all((data || []).map(async (goal: any) => {
        let currentValue = 0;
        const ms = goal.month_start;
        const me = goal.month_end;
        try {
          switch (goal.goal_type) {
            case 'hours': {
              const { data: focus } = await supabase
                .from('focus_sessions')
                .select('duration_minutes')
                .eq('user_id', user.id)
                .gte('completed_at', ms)
                .lte('completed_at', me + 'T23:59:59');
              currentValue = (focus || []).reduce((s: number, x: any) => s + (Number(x.duration_minutes) || 0) / 60, 0);
              break;
            }
            case 'courses': {
              // Buscar cursos que foram marcados como concluídos no período
              // Verificamos se o curso tem status 'completed' E se foi atualizado no período
              // OU se o completed_hours >= total_hours no período
              const { data: completedCourses } = await supabase
                .from('courses')
                .select('id, status, completed_hours, total_hours, updated_at')
                .eq('user_id', user.id)
                .eq('status', 'completed');
              
              // Filtrar cursos que foram concluídos dentro do período da meta
              const coursesInPeriod = (completedCourses || []).filter((course: any) => {
                const updatedDate = new Date(course.updated_at);
                const startDate = new Date(ms);
                const endDate = new Date(me + 'T23:59:59');
                return updatedDate >= startDate && updatedDate <= endDate;
              });
              
              currentValue = coursesInPeriod.length;
              break;
            }
            case 'tasks': {
              const { count } = await supabase
                .from('tasks')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'completed')
                .gte('updated_at', ms)
                .lte('updated_at', me + 'T23:59:59');
              currentValue = count || 0;
              break;
            }
            case 'focus_sessions': {
              const { count } = await supabase
                .from('focus_sessions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('session_type', 'work')
                .gte('completed_at', ms)
                .lte('completed_at', me + 'T23:59:59');
              currentValue = count || 0;
              break;
            }
          }
          if (currentValue !== goal.current_value) {
            await supabase
              .from('monthly_goals')
              .update({ current_value: currentValue, is_completed: currentValue >= goal.target_value })
              .eq('id', goal.id);
          }
        } catch (innerErr) {
          console.error('Erro ao calcular progresso da meta', goal.id, innerErr);
          currentValue = Number(goal.current_value) || 0;
        }
        return { ...goal, current_value: currentValue, is_completed: currentValue >= goal.target_value } as Goal;
      }));
      setGoals(updated);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Falha ao carregar metas');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      title: '',
      goal_type: 'hours',
      target_value: 40,
      period_type: 'weekly',
      start_date: undefined,
      end_date: undefined,
    });
  };

  const openEdit = (g: Goal) => {
    setEditingId(g.id);
    setForm({
      title: g.title,
      goal_type: g.goal_type,
      target_value: g.target_value,
      period_type: g.period_type || 'monthly',
      start_date: new Date(g.month_start),
      end_date: new Date(g.month_end),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.title || !form.start_date || !form.end_date) {
      toast.error('Preencha título e datas');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        title: form.title,
        goal_type: form.goal_type,
        target_value: form.target_value,
        period_type: form.period_type,
        month_start: format(form.start_date, 'yyyy-MM-dd'),
        month_end: format(form.end_date, 'yyyy-MM-dd'),
      };
      if (editingId) {
        const { error } = await supabase.from('monthly_goals').update(payload).eq('id', editingId);
        if (error) throw error;
        toast.success('Meta atualizada!');
      } else {
        const { error } = await supabase.from('monthly_goals').insert({ ...payload, current_value: 0, is_completed: false });
        if (error) throw error;
        toast.success('Meta criada!');
      }
      setDialogOpen(false);
      resetForm();
      fetchGoals();
    } catch (e) {
      toast.error('Erro: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const id = deletingId;
    setDeletingId(null);
    const { error } = await supabase.from('monthly_goals').delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir: ' + error.message);
    setGoals((p) => p.filter((g) => g.id !== id));
    toast.success('Meta removida');
  };

  const getGoalType = (t: string) => GOAL_TYPES.find((x) => x.value === t);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando metas...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium">Não foi possível carregar as metas</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchGoals}>Tentar novamente</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Metas
          </CardTitle>
          <CardDescription>Defina metas para qualquer período</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nova Meta</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
              <DialogDescription>Configure título, tipo e período</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Estudar 40h" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.goal_type} onValueChange={(v) => setForm({ ...form, goal_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GOAL_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Alvo</Label>
                  <Input type="number" min="1" value={form.target_value} onChange={(e) => setForm({ ...form, target_value: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={form.period_type} onValueChange={(v) => setForm({ ...form, period_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIOD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.start_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.start_date ? format(form.start_date, "dd/MM/yyyy") : "Data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={form.start_date} onSelect={(d) => setForm({ ...form, start_date: d, period_type: 'custom' })} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.end_date && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.end_date ? format(form.end_date, "dd/MM/yyyy") : "Data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={form.end_date} onSelect={(d) => setForm({ ...form, end_date: d, period_type: 'custom' })} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSave} disabled={saving || !form.title}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingId ? 'Salvar' : 'Criar Meta'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed rounded-xl">
            <Target className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma meta definida</p>
            <p className="text-sm text-muted-foreground/70 mt-1">Crie metas para acompanhar seu progresso</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const gt = getGoalType(goal.goal_type);
              const progress = Math.min(100, (goal.current_value / goal.target_value) * 100);
              const Icon = gt?.icon || Target;
              return (
                <div key={goal.id} className={cn(
                  "p-4 rounded-lg border transition-colors",
                  goal.is_completed ? 'bg-success/5 border-success/20' : 'bg-muted/30 border-transparent'
                )}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("p-2 rounded-lg shrink-0", goal.is_completed ? 'bg-success/10' : 'bg-primary/10')}>
                        <Icon className={cn("h-5 w-5", goal.is_completed ? 'text-success' : 'text-primary')} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{goal.title}</p>
                          <Badge variant="outline" className="text-xs">{periodLabel(goal.period_type)}</Badge>
                          {goal.is_completed && <Badge className="bg-success text-white">Concluída!</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(goal.month_start), "dd/MM/yy", { locale: ptBR })} – {format(new Date(goal.month_end), "dd/MM/yy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(goal)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingId(goal.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">
                        {goal.goal_type === 'hours' ? goal.current_value.toFixed(2) : goal.current_value}{gt?.unit} / {goal.target_value}{gt?.unit}
                      </span>
                    </div>
                    <Progress value={progress} className={cn("h-2", goal.is_completed && '[&>div]:bg-success')} />
                    <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}% completo</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A meta será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
