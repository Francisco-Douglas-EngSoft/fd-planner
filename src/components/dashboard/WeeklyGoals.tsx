import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, Clock, CheckSquare, Zap, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestMode } from '@/hooks/useGuestMode';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WeeklyGoalDialog } from './WeeklyGoalDialog';
import { toast } from 'sonner';

interface WeeklyGoal {
  id: string;
  title: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  is_completed: boolean;
  week_start: string;
  week_end: string;
}

const goalTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  hours: Clock,
  tasks: CheckSquare,
  sessions: Zap,
};

const goalTypeLabels: Record<string, string> = {
  hours: 'horas',
  tasks: 'tarefas',
  sessions: 'sessões',
};

export function WeeklyGoals() {
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<WeeklyGoal | null>(null);
  const { user } = useAuth();
  const { isReadOnly, getDemoData, blockGuestAction } = useGuestMode();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  useEffect(() => {
    if (isReadOnly) {
      const demoData = getDemoData();
      setGoals(demoData.weeklyGoals);
    } else if (user) {
      fetchGoals();
      updateGoalsProgress();
    }
  }, [user, isReadOnly]);

  const fetchGoals = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .gte('week_start', format(weekStart, 'yyyy-MM-dd'))
      .lte('week_end', format(weekEnd, 'yyyy-MM-dd'))
      .order('created_at', { ascending: false });

    if (data) {
      setGoals(data);
    }
  };

  const updateGoalsProgress = async () => {
    if (!user) return;

    // Fetch current week data
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    const [focusResult, tasksResult] = await Promise.all([
      supabase
        .from('focus_sessions')
        .select('duration_minutes')
        .eq('user_id', user.id)
        .gte('completed_at', weekStartStr)
        .lte('completed_at', weekEndStr + 'T23:59:59'),
      supabase
        .from('tasks')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('completed_at', weekStartStr)
        .lte('completed_at', weekEndStr + 'T23:59:59'),
    ]);

    const totalHours = (focusResult.data || []).reduce(
      (sum, s) => sum + (s.duration_minutes || 0) / 60,
      0
    );
    const totalTasks = tasksResult.data?.length || 0;
    const totalSessions = focusResult.data?.length || 0;

    // Update goals with current progress
    const { data: currentGoals } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('user_id', user.id)
      .gte('week_start', weekStartStr)
      .lte('week_end', weekEndStr);

    if (currentGoals) {
      for (const goal of currentGoals) {
        let newValue = 0;
        if (goal.goal_type === 'hours') newValue = totalHours;
        else if (goal.goal_type === 'tasks') newValue = totalTasks;
        else if (goal.goal_type === 'sessions') newValue = totalSessions;

        const isCompleted = newValue >= goal.target_value;

        if (newValue !== goal.current_value || isCompleted !== goal.is_completed) {
          await supabase
            .from('weekly_goals')
            .update({ 
              current_value: newValue, 
              is_completed: isCompleted,
              updated_at: new Date().toISOString()
            })
            .eq('id', goal.id);
        }
      }
      fetchGoals();
    }
  };

  const handleDelete = async (id: string) => {
    if (blockGuestAction('excluir metas')) return;
    
    const { error } = await supabase.from('weekly_goals').delete().eq('id', id);
    if (!error) {
      toast.success('Meta excluída');
      fetchGoals();
    }
  };

  const handleEdit = (goal: WeeklyGoal) => {
    if (blockGuestAction('editar metas')) return;
    setEditingGoal(goal);
    setIsDialogOpen(true);
  };

  const handleOpenDialog = () => {
    if (blockGuestAction('criar metas')) return;
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingGoal(null);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 70) return 'bg-primary';
    if (percentage >= 40) return 'bg-yellow-500';
    return 'bg-muted-foreground';
  };

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Metas da Semana
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {format(weekStart, "dd/MM", { locale: ptBR })} - {format(weekEnd, "dd/MM", { locale: ptBR })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenDialog}
            disabled={isReadOnly}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Meta
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma meta definida para esta semana</p>
            <Button
              variant="link"
              className="mt-2"
              onClick={() => setIsDialogOpen(true)}
            >
              Criar primeira meta
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const Icon = goalTypeIcons[goal.goal_type] || Target;
              const percentage = Math.min((goal.current_value / goal.target_value) * 100, 100);
              const progressColor = getProgressColor(percentage);

              return (
                <div
                  key={goal.id}
                  className={`p-4 rounded-lg border ${
                    goal.is_completed 
                      ? 'bg-green-500/10 border-green-500/30' 
                      : 'bg-card border-border'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${goal.is_completed ? 'bg-green-500/20' : 'bg-primary/10'}`}>
                        <Icon className={`h-4 w-4 ${goal.is_completed ? 'text-green-500' : 'text-primary'}`} />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{goal.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {goal.goal_type === 'hours' ? goal.current_value.toFixed(2) : goal.current_value} / {goal.target_value} {goalTypeLabels[goal.goal_type]}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {goal.is_completed && (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full mr-2">
                          Concluída!
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(goal)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(goal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <Progress value={percentage} className="h-2" />
                    <div
                      className={`absolute top-0 left-0 h-2 rounded-full transition-all ${progressColor}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-right text-xs text-muted-foreground mt-1">
                    {percentage.toFixed(0)}%
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <WeeklyGoalDialog
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          onSuccess={fetchGoals}
          editingGoal={editingGoal}
          weekStart={weekStart}
          weekEnd={weekEnd}
        />
      </CardContent>
    </Card>
  );
}
