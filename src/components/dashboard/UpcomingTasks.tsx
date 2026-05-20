import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestMode } from '@/hooks/useGuestMode';
import { format, isToday, isTomorrow, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  priority: string | null;
  due_date: string | null;
  course_id: string | null;
  courses?: {
    name: string;
  } | null;
}

const priorityConfig: Record<string, { label: string; class: string }> = {
  high: { label: 'Urgente', class: 'bg-destructive/10 text-destructive border-destructive/20' },
  normal: { label: 'Normal', class: 'bg-warning/10 text-warning border-warning/20' },
  low: { label: 'Baixa', class: 'bg-muted text-muted-foreground border-border' },
};

const formatDueDate = (dueDate: string | null): string => {
  if (!dueDate) return 'Sem prazo';
  const date = parseISO(dueDate);
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  const diff = differenceInDays(date, new Date());
  if (diff < 0) return 'Atrasada';
  if (diff <= 7) return `Em ${diff} dias`;
  return format(date, 'dd/MM', { locale: ptBR });
};

export function UpcomingTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { isReadOnly, getDemoData } = useGuestMode();

  useEffect(() => {
    if (isReadOnly) {
      const demoData = getDemoData();
      // Map demo tasks to include course names
      const tasksWithCourses = demoData.tasks
        .filter(t => t.status === 'pending')
        .slice(0, 5)
        .map(task => {
          const course = demoData.courses.find(c => c.id === task.course_id);
          return {
            ...task,
            courses: course ? { name: course.name } : null,
          };
        });
      setTasks(tasksWithCourses);
      setIsLoading(false);
    } else if (user) {
      fetchTasks();
    }
  }, [user, isReadOnly]);

  const fetchTasks = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        priority,
        due_date,
        course_id,
        courses (name)
      `)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5);

    setTasks((data || []).map((t: any) => ({
      ...t,
      courses: Array.isArray(t.courses) ? t.courses[0] || null : t.courses || null,
    })));
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
            <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Tarefas Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 sm:pb-4">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
          <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Tarefas Pendentes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <CheckSquare className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-50" />
            <p className="text-xs sm:text-sm">Nenhuma tarefa pendente</p>
          </div>
        ) : (
          tasks.map((task) => {
            const priority = task.priority || 'normal';
            const dueLabel = formatDueDate(task.due_date);
            const isOverdue = task.due_date && parseISO(task.due_date) < new Date();
            
            return (
              <div
                key={task.id}
                className="flex items-start gap-2 sm:gap-3 rounded-lg border border-border p-2 sm:p-3 transition-colors hover:bg-muted/50"
              >
                <div className={cn(
                  "mt-0.5 rounded-full p-1 shrink-0",
                  priority === 'high' || isOverdue ? 'bg-destructive/10' : 'bg-muted'
                )}>
                  {priority === 'high' || isOverdue ? (
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                  ) : (
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
                  <p className="font-medium text-xs sm:text-sm truncate">{task.title}</p>
                  {task.courses?.name && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{task.courses.name}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className={cn("text-[9px] sm:text-xs px-1.5 sm:px-2", priorityConfig[priority]?.class)}>
                    {priorityConfig[priority]?.label}
                  </Badge>
                  <span className={cn(
                    "text-[10px] sm:text-xs",
                    isOverdue ? "text-destructive font-medium" : "text-muted-foreground"
                  )}>
                    {dueLabel}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
