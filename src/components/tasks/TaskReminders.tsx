import { useState, useEffect } from 'react';
import { Bell, Clock, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays, differenceInHours, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  due_date: string;
  priority: string;
  status: string;
  course_name?: string;
}

interface TaskRemindersProps {
  onDismiss?: (taskId: string) => void;
}

export function TaskReminders({ onDismiss }: TaskRemindersProps) {
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUpcomingTasks();
    }
  }, [user]);

  const fetchUpcomingTasks = async () => {
    if (!user) return;

    const today = new Date();
    const nextWeek = addDays(today, 7);

    const { data } = await supabase
      .from('tasks')
      .select('id, title, due_date, priority, status, courses(name)')
      .eq('user_id', user.id)
      .neq('status', 'completed')
      .not('due_date', 'is', null)
      .lte('due_date', nextWeek.toISOString().split('T')[0])
      .order('due_date', { ascending: true });

    if (data) {
      const tasksWithCourse = data.map(task => ({
        ...task,
        course_name: (task.courses as { name?: string } | null)?.name || undefined,
      }));
      setUpcomingTasks(tasksWithCourse);
    }
  };

  const handleDismiss = (taskId: string) => {
    setDismissedIds(prev => [...prev, taskId]);
    onDismiss?.(taskId);
  };

  const getUrgencyInfo = (dueDate: string) => {
    const now = new Date();
    const due = parseISO(dueDate);
    const daysLeft = differenceInDays(due, now);
    const hoursLeft = differenceInHours(due, now);

    if (isBefore(due, now)) {
      return {
        label: 'Atrasada',
        color: 'bg-destructive text-destructive-foreground',
        icon: AlertTriangle,
        urgent: true,
      };
    }

    if (daysLeft === 0) {
      if (hoursLeft <= 3) {
        return {
          label: `${hoursLeft}h restantes`,
          color: 'bg-destructive text-destructive-foreground',
          icon: AlertTriangle,
          urgent: true,
        };
      }
      return {
        label: 'Hoje',
        color: 'bg-warning text-warning-foreground',
        icon: Clock,
        urgent: true,
      };
    }

    if (daysLeft === 1) {
      return {
        label: 'Amanhã',
        color: 'bg-warning/80 text-warning-foreground',
        icon: Clock,
        urgent: false,
      };
    }

    if (daysLeft <= 3) {
      return {
        label: `${daysLeft} dias`,
        color: 'bg-accent text-accent-foreground',
        icon: Clock,
        urgent: false,
      };
    }

    return {
      label: `${daysLeft} dias`,
      color: 'bg-muted text-muted-foreground',
      icon: Bell,
      urgent: false,
    };
  };

  const visibleTasks = upcomingTasks.filter(t => !dismissedIds.includes(t.id));
  const urgentTasks = visibleTasks.filter(t => {
    const info = getUrgencyInfo(t.due_date);
    return info.urgent;
  });

  if (visibleTasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Urgent alerts */}
      {urgentTasks.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <span className="font-semibold text-sm">Tarefas Urgentes</span>
              <Badge variant="secondary" className="ml-auto">{urgentTasks.length}</Badge>
            </div>
            <div className="space-y-2">
              {urgentTasks.slice(0, 3).map(task => {
                const urgency = getUrgencyInfo(task.due_date);
                const Icon = urgency.icon;
                
                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-background/50"
                  >
                    <Icon className="h-4 w-4 text-warning shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.course_name && (
                        <p className="text-xs text-muted-foreground truncate">{task.course_name}</p>
                      )}
                    </div>
                    <Badge className={cn("shrink-0 text-[10px]", urgency.color)}>
                      {urgency.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDismiss(task.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming tasks (non-urgent) */}
      {visibleTasks.length > urgentTasks.length && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Próximas Tarefas</span>
              <Badge variant="outline" className="ml-auto">
                {visibleTasks.length - urgentTasks.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {visibleTasks
                .filter(t => !urgentTasks.includes(t))
                .slice(0, 3)
                .map(task => {
                  const urgency = getUrgencyInfo(task.due_date);
                  
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                    >
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(task.due_date), "dd 'de' MMM", { locale: ptBR })}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {urgency.label}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDismiss(task.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
