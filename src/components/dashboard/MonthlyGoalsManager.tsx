import { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Clock, Calendar, CheckCircle2, TrendingUp, Loader2, Edit2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyGoal {
  id: string;
  title: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  month_start: string;
  month_end: string;
  is_completed: boolean;
}

const GOAL_TYPES = [
  { value: 'hours', label: 'Horas de Estudo', unit: 'h', icon: Clock },
  { value: 'courses', label: 'Cursos Concluídos', unit: '', icon: Target },
  { value: 'tasks', label: 'Tarefas Concluídas', unit: '', icon: CheckCircle2 },
  { value: 'focus_sessions', label: 'Sessões de Foco', unit: '', icon: TrendingUp },
];

export function MonthlyGoalsManager() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [newGoal, setNewGoal] = useState({
    title: '',
    goal_type: 'hours',
    target_value: 40,
  });

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    if (!user) return;
    
    try {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString().split('T')[0];
      const monthEnd = endOfMonth(now).toISOString().split('T')[0];

      // Get monthly goals for current month
      const { data, error } = await supabase
        .from('monthly_goals')
        .select('*')
        .eq('user_id', user.id)
        .gte('month_start', monthStart)
        .lte('month_end', monthEnd)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Update current values based on actual data
      const updatedGoals = await Promise.all((data || []).map(async (goal) => {
        let currentValue = 0;
        
        switch (goal.goal_type) {
          case 'hours': {
            const { data: courses } = await supabase
              .from('courses')
              .select('completed_hours')
              .eq('user_id', user.id);
            currentValue = courses?.reduce((sum, c) => sum + (Number(c.completed_hours) || 0), 0) || 0;
            break;
          }
          case 'courses': {
            const { count: coursesCount } = await supabase
              .from('courses')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('status', 'completed');
            currentValue = coursesCount || 0;
            break;
          }
          case 'tasks': {
            const { count: tasksCount } = await supabase
              .from('tasks')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('status', 'completed')
              .gte('completed_at', monthStart)
              .lte('completed_at', monthEnd + 'T23:59:59');
            currentValue = tasksCount || 0;
            break;
          }
          case 'focus_sessions': {
            const { count: focusCount } = await supabase
              .from('focus_sessions')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('session_type', 'work')
              .gte('completed_at', monthStart)
              .lte('completed_at', monthEnd + 'T23:59:59');
            currentValue = focusCount || 0;
            break;
          }
        }

        // Update the goal with current value
        if (currentValue !== goal.current_value) {
          await supabase
            .from('monthly_goals')
            .update({ 
              current_value: currentValue,
              is_completed: currentValue >= goal.target_value
            })
            .eq('id', goal.id);
        }

        return {
          ...goal,
          current_value: currentValue,
          is_completed: currentValue >= goal.target_value,
        };
      }));

      setGoals(updatedGoals);
    } catch (error) {
      console.error('Error fetching goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async () => {
    if (!user || !newGoal.title) return;
    setSaving(true);

    try {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString().split('T')[0];
      const monthEnd = endOfMonth(now).toISOString().split('T')[0];

      const { error } = await supabase
        .from('monthly_goals')
        .insert({
          user_id: user.id,
          title: newGoal.title,
          goal_type: newGoal.goal_type,
          target_value: newGoal.target_value,
          current_value: 0,
          month_start: monthStart,
          month_end: monthEnd,
          is_completed: false,
        });

      if (error) throw error;
      
      toast.success('Meta criada!');
      setDialogOpen(false);
      setNewGoal({ title: '', goal_type: 'hours', target_value: 40 });
      fetchGoals();
    } catch (error) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setSaving(false);
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('monthly_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setGoals(prev => prev.filter(g => g.id !== id));
      toast.success('Meta removida');
    } catch (error) {
      toast.error('Erro: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const getGoalType = (type: string) => GOAL_TYPES.find(t => t.value === type);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const currentMonth = format(new Date(), 'MMMM yyyy', { locale: ptBR });

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Metas Mensais
          </CardTitle>
          <CardDescription>
            {currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)}
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Meta Mensal</DialogTitle>
              <DialogDescription>Defina uma meta para este mês</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título da Meta *</Label>
                <Input
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  placeholder="Ex: Estudar 40 horas este mês"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Meta</Label>
                <Select
                  value={newGoal.goal_type}
                  onValueChange={(value) => setNewGoal({ ...newGoal, goal_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Valor Alvo</Label>
                <Input
                  type="number"
                  min="1"
                  value={newGoal.target_value}
                  onChange={(e) => setNewGoal({ ...newGoal, target_value: parseInt(e.target.value) || 1 })}
                />
                <p className="text-xs text-muted-foreground">
                  {getGoalType(newGoal.goal_type)?.label}: {newGoal.target_value}{getGoalType(newGoal.goal_type)?.unit}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddGoal} disabled={saving || !newGoal.title}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Criar Meta
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
            <p className="text-sm text-muted-foreground/70 mt-1">
              Crie metas para acompanhar seu progresso mensal
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const goalType = getGoalType(goal.goal_type);
              const progress = Math.min(100, (goal.current_value / goal.target_value) * 100);
              const Icon = goalType?.icon || Target;

              return (
                <div
                  key={goal.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    goal.is_completed 
                      ? 'bg-green-500/5 border-green-500/20' 
                      : 'bg-muted/30 border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        goal.is_completed ? 'bg-green-500/10' : 'bg-primary/10'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          goal.is_completed ? 'text-green-500' : 'text-primary'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{goal.title}</p>
                          {goal.is_completed && (
                            <Badge className="bg-green-500 text-white">Concluída!</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {goalType?.label}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteGoal(goal.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">
                        {goal.goal_type === 'hours' ? goal.current_value.toFixed(2) : goal.current_value}{goalType?.unit} / {goal.target_value}{goalType?.unit}
                      </span>
                    </div>
                    <Progress 
                      value={progress} 
                      className={`h-2 ${goal.is_completed ? '[&>div]:bg-green-500' : ''}`}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {Math.round(progress)}% completo
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
