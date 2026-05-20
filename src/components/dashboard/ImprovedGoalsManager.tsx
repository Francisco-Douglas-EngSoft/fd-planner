import { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Clock, BookOpen, Loader2, CalendarIcon, Edit2, AlertCircle, Zap, Timer } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// Interface para meta composta (Foco com ciclos + horas)
interface CompositeGoal {
  id: string;
  title: string;
  period_type: string;
  month_start: string;
  month_end: string;
  sessions: {
    target: number;
    current: number;
    completed: boolean;
  };
  hours: {
    target: number;
    current: number;
    completed: boolean;
  };
  sessionsGoalId: string;
  hoursGoalId: string;
}

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
      return { start: startOfMonth(base), end: endOfMonth(addMonths(base, 1)) };
    case 'semiannual':
      return { start: startOfMonth(base), end: endOfMonth(addMonths(base, 5)) };
    case 'annual':
      return { start: startOfMonth(base), end: endOfMonth(addMonths(base, 11)) };
    default:
      return { start: startOfMonth(base), end: endOfMonth(base) };
  }
}

export function ImprovedGoalsManager() {
  const { user } = useAuth();
  const [compositeGoals, setCompositeGoals] = useState<CompositeGoal[]>([]);
  const [courseGoals, setCourseGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingComposite, setEditingComposite] = useState<CompositeGoal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [goalCategory, setGoalCategory] = useState<'focus' | 'course'>('focus');

  const [form, setForm] = useState({
    title: '',
    sessions_target: 20,
    hours_target: 10,
    course_target: 40,
    goal_type: 'course_hours',
    period_type: 'weekly',
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
  });

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

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
            case 'focus_hours': {
              const { data: focus } = await supabase
                .from('focus_sessions')
                .select('duration_minutes')
                .eq('user_id', user.id)
                .gte('completed_at', ms)
                .lte('completed_at', me + 'T23:59:59');
              currentValue = (focus || []).reduce((s: number, x: any) => s + (Number(x.duration_minutes) || 0) / 60, 0);
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
            case 'course_hours': {
              const { data: courses } = await supabase
                .from('courses')
                .select('completed_hours')
                .eq('user_id', user.id)
                .gte('updated_at', ms)
                .lte('updated_at', me + 'T23:59:59');
              currentValue = (courses || []).reduce((s: number, c: any) => s + (Number(c.completed_hours) || 0), 0);
              break;
            }
            case 'courses_completed': {
              const { count } = await supabase
                .from('courses')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('status', 'completed')
                .gte('updated_at', ms)
                .lte('updated_at', me + 'T23:59:59');
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

      // Agrupar metas de foco (sessões + horas) em metas compostas
      const focusSessions = updated.filter(g => g.goal_type === 'focus_sessions');
      const focusHours = updated.filter(g => g.goal_type === 'focus_hours');
      
      // Criar metas compostas agrupando por período
      const compositeMap = new Map<string, CompositeGoal>();
      
      focusSessions.forEach(session => {
        const key = `${session.month_start}_${session.month_end}`;
        const hours = focusHours.find(h => h.month_start === session.month_start && h.month_end === session.month_end);
        
        if (hours) {
          compositeMap.set(key, {
            id: key,
            title: session.title,
            period_type: session.period_type,
            month_start: session.month_start,
            month_end: session.month_end,
            sessions: {
              target: session.target_value,
              current: session.current_value,
              completed: session.is_completed,
            },
            hours: {
              target: hours.target_value,
              current: hours.current_value,
              completed: hours.is_completed,
            },
            sessionsGoalId: session.id,
            hoursGoalId: hours.id,
          });
        }
      });
      
      const course = updated.filter(g => g.goal_type === 'course_hours' || g.goal_type === 'courses_completed');
      
      setCompositeGoals(Array.from(compositeMap.values()));
      setCourseGoals(course);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Falha ao carregar metas');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingComposite(null);
    setForm({
      title: '',
      sessions_target: 20,
      hours_target: 10,
      course_target: 40,
      goal_type: 'course_hours',
      period_type: 'weekly',
      start_date: undefined,
      end_date: undefined,
    });
  };

  const openEdit = (composite: CompositeGoal) => {
    setEditingComposite(composite);
    setGoalCategory('focus');
    setForm({
      title: composite.title,
      sessions_target: composite.sessions.target,
      hours_target: composite.hours.target,
      course_target: 40,
      goal_type: 'course_hours',
      period_type: composite.period_type || 'monthly',
      start_date: new Date(composite.month_start),
      end_date: new Date(composite.month_end),
    });
    setDialogOpen(true);
  };

  const openEditCourse = (g: Goal) => {
    setGoalCategory('course');
    setForm({
      title: g.title,
      sessions_target: 20,
      hours_target: 10,
      course_target: g.target_value,
      goal_type: g.goal_type,
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
      const monthStart = format(form.start_date, 'yyyy-MM-dd');
      const monthEnd = format(form.end_date, 'yyyy-MM-dd');

      if (goalCategory === 'focus') {
        // Criar/atualizar meta composta (sessões + horas)
        const basePayload = {
          user_id: user.id,
          title: form.title,
          period_type: form.period_type,
          month_start: monthStart,
          month_end: monthEnd,
        };

        if (editingComposite) {
          // Atualizar metas existentes
          await supabase.from('monthly_goals').update({
            ...basePayload,
            goal_type: 'focus_sessions',
            target_value: form.sessions_target,
          }).eq('id', editingComposite.sessionsGoalId);

          await supabase.from('monthly_goals').update({
            ...basePayload,
            goal_type: 'focus_hours',
            target_value: form.hours_target,
          }).eq('id', editingComposite.hoursGoalId);

          toast.success('Meta atualizada!');
        } else {
          // Criar duas metas (sessões e horas)
          const { error: sessionsError } = await supabase.from('monthly_goals').insert({
            ...basePayload,
            goal_type: 'focus_sessions',
            target_value: form.sessions_target,
            current_value: 0,
            is_completed: false,
          });

          const { error: hoursError } = await supabase.from('monthly_goals').insert({
            ...basePayload,
            goal_type: 'focus_hours',
            target_value: form.hours_target,
            current_value: 0,
            is_completed: false,
          });

          if (sessionsError || hoursError) throw sessionsError || hoursError;
          toast.success('Meta de Foco criada com 2 submetas!');
        }
      } else {
        // Meta de curso (simples)
        const payload = {
          user_id: user.id,
          title: form.title,
          goal_type: form.goal_type,
          target_value: form.course_target,
          period_type: form.period_type,
          month_start: monthStart,
          month_end: monthEnd,
        };

        const { error } = await supabase.from('monthly_goals').insert({ 
          ...payload, 
          current_value: 0, 
          is_completed: false 
        });
        if (error) throw error;
        toast.success('Meta de Curso criada!');
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
    
    // Verificar se é uma meta composta
    const composite = compositeGoals.find(g => g.id === id);
    if (composite) {
      // Deletar ambas as metas (sessões e horas)
      await supabase.from('monthly_goals').delete().eq('id', composite.sessionsGoalId);
      await supabase.from('monthly_goals').delete().eq('id', composite.hoursGoalId);
      setCompositeGoals((p) => p.filter((g) => g.id !== id));
    } else {
      // Deletar meta de curso
      const { error } = await supabase.from('monthly_goals').delete().eq('id', id);
      if (error) return toast.error('Erro ao excluir: ' + error.message);
      setCourseGoals((p) => p.filter((g) => g.id !== id));
    }
    toast.success('Meta removida');
  };

  const openNewGoalDialog = (category: 'focus' | 'course') => {
    setGoalCategory(category);
    setForm({
      title: '',
      sessions_target: 20,
      hours_target: 10,
      course_target: 40,
      goal_type: 'course_hours',
      period_type: 'weekly',
      start_date: undefined,
      end_date: undefined,
    });
    setDialogOpen(true);
  };

  const renderCompositeGoalCard = (composite: CompositeGoal) => {
    const sessionsProgress = Math.min(100, (composite.sessions.current / composite.sessions.target) * 100);
    const hoursProgress = Math.min(100, (composite.hours.current / composite.hours.target) * 100);
    const overallCompleted = composite.sessions.completed && composite.hours.completed;
    
    return (
      <div key={composite.id} className={cn(
        "p-4 rounded-lg border transition-colors",
        overallCompleted ? 'bg-success/5 border-success/20' : 'bg-muted/30 border-transparent'
      )}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("p-2 rounded-lg shrink-0", overallCompleted ? 'bg-success/10' : 'bg-primary/10')}>
              <Zap className={cn("h-5 w-5", overallCompleted ? 'text-success' : 'text-primary')} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium truncate">{composite.title}</p>
                <Badge variant="outline" className="text-xs">{periodLabel(composite.period_type)}</Badge>
                {overallCompleted && <Badge className="bg-success text-white">Concluída!</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(composite.month_start), "dd/MM/yy", { locale: ptBR })} – {format(new Date(composite.month_end), "dd/MM/yy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onClick={() => openEdit(composite)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setDeletingId(composite.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        
        {/* Submeta: Ciclos/Sessões */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm">
            <Timer className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Ciclos de Estudo</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">
              {composite.sessions.current} / {composite.sessions.target} sessões
            </span>
          </div>
          <Progress value={sessionsProgress} className={cn("h-2", composite.sessions.completed && '[&>div]:bg-success')} />
          <p className="text-xs text-muted-foreground text-right">{Math.round(sessionsProgress)}% completo</p>
        </div>

        {/* Submeta: Horas */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Tempo em Horas</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">
              {composite.hours.current.toFixed(2)}h / {composite.hours.target}h
            </span>
          </div>
          <Progress value={hoursProgress} className={cn("h-2", composite.hours.completed && '[&>div]:bg-success')} />
          <p className="text-xs text-muted-foreground text-right">{Math.round(hoursProgress)}% completo</p>
        </div>
      </div>
    );
  };

  const renderGoalCard = (goal: Goal, category: 'focus' | 'course') => {
    const progress = Math.min(100, (goal.current_value / goal.target_value) * 100);
    const Icon = category === 'focus' ? Zap : BookOpen;
    const unit = goal.goal_type.includes('hours') ? 'h' : '';
    
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
            <Button variant="ghost" size="icon" onClick={() => openEditCourse(goal)}>
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
              {goal.goal_type.includes('hours') ? goal.current_value.toFixed(2) : goal.current_value}{unit} / {goal.target_value}{unit}
            </span>
          </div>
          <Progress value={progress} className={cn("h-2", goal.is_completed && '[&>div]:bg-success')} />
          <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}% completo</p>
        </div>
      </div>
    );
  };

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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Metas de Estudo
            </CardTitle>
            <CardDescription>Acompanhe suas metas de foco e cursos lado a lado</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Metas de Foco e Tempo */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Foco e Tempo de Estudos</h3>
              </div>
              <Button size="sm" onClick={() => openNewGoalDialog('focus')} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova
              </Button>
            </div>
            {compositeGoals.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed rounded-xl">
                <Zap className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma meta de foco</p>
                <p className="text-xs text-muted-foreground mt-1">Cada meta terá ciclos + horas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {compositeGoals.map((goal) => renderCompositeGoalCard(goal))}
              </div>
            )}
          </div>

          {/* Metas de Cursos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Horas de Curso Concluídas</h3>
              </div>
              <Button size="sm" onClick={() => openNewGoalDialog('course')} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova
              </Button>
            </div>
            {courseGoals.length === 0 ? (
              <div className="p-6 text-center border-2 border-dashed rounded-xl">
                <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma meta de curso</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseGoals.map((goal) => renderGoalCard(goal, 'course'))}
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {/* Dialog de Criação/Edição */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingComposite ? 'Editar Meta de Foco' : `Nova Meta de ${goalCategory === 'focus' ? 'Foco' : 'Curso'}`}
            </DialogTitle>
            <DialogDescription>
              {goalCategory === 'focus' 
                ? 'Configure título, ciclos, horas e período' 
                : 'Configure título, tipo e período'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input 
                value={form.title} 
                onChange={(e) => setForm({ ...form, title: e.target.value })} 
                placeholder={goalCategory === 'focus' ? "Ex: Meta semanal de estudos" : "Ex: Completar 40h de cursos"} 
              />
            </div>

            {goalCategory === 'focus' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-primary" />
                      Ciclos/Sessões
                    </Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={form.sessions_target} 
                      onChange={(e) => setForm({ ...form, sessions_target: parseInt(e.target.value) || 1 })} 
                    />
                    <p className="text-xs text-muted-foreground">Nº de sessões de foco</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Horas
                    </Label>
                    <Input 
                      type="number" 
                      min="1" 
                      value={form.hours_target} 
                      onChange={(e) => setForm({ ...form, hours_target: parseInt(e.target.value) || 1 })} 
                    />
                    <p className="text-xs text-muted-foreground">Tempo total em horas</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.goal_type} onValueChange={(v) => setForm({ ...form, goal_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="course_hours">Horas de Curso</SelectItem>
                      <SelectItem value="courses_completed">Cursos Concluídos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Alvo</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={form.course_target} 
                    onChange={(e) => setForm({ ...form, course_target: parseInt(e.target.value) || 1 })} 
                  />
                </div>
              </div>
            )}

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
              {editingComposite ? 'Salvar' : 'Criar Meta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
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
