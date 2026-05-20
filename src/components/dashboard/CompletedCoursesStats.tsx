import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatHoursToHMS } from '@/lib/timeUtils';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CompletedCourse {
  id: string;
  name: string;
  total_hours: number;
  completed_hours: number;
  created_at: string;
  updated_at: string;
  start_date: string | null;
  end_date: string | null;
}

export function CompletedCoursesStats() {
  const [courses, setCourses] = useState<CompletedCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCompletedCourses();
    }
  }, [user]);

  const fetchCompletedCourses = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('courses')
      .select('id, name, total_hours, completed_hours, created_at, updated_at, start_date, end_date')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setCourses(data);
    }
    setIsLoading(false);
  };

  // Calcular estatísticas
  const totalCompletedCourses = courses.length;
  const totalHoursStudied = courses.reduce((sum, c) => sum + (c.completed_hours || 0), 0);
  
  // Calcular tempo médio de conclusão
  const coursesWithDates = courses.filter(c => c.start_date && c.end_date);
  const avgCompletionDays = coursesWithDates.length > 0
    ? Math.round(
        coursesWithDates.reduce((sum, c) => {
          const start = parseISO(c.start_date!);
          const end = parseISO(c.end_date!);
          return sum + differenceInDays(end, start);
        }, 0) / coursesWithDates.length
      )
    : 0;

  // Média de horas por curso
  const avgHoursPerCourse = totalCompletedCourses > 0
    ? totalHoursStudied / totalCompletedCourses
    : 0;

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (totalCompletedCourses === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-success" />
            Estatísticas de Cursos Concluídos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-6">
            Você ainda não concluiu nenhum curso. Continue estudando! 💪
          </p>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      label: 'Total Concluídos',
      value: totalCompletedCourses,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Horas Estudadas',
      value: formatHoursToHMS(totalHoursStudied),
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Tempo Médio',
      value: avgCompletionDays > 0 ? `${avgCompletionDays} dias` : 'N/A',
      icon: Calendar,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Média por Curso',
      value: formatHoursToHMS(avgHoursPerCourse),
      icon: TrendingUp,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
  ];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" />
          Estatísticas de Cursos Concluídos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                <div className={`p-2 rounded-full ${stat.bgColor} mb-2`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <span className="text-lg font-bold">{stat.value}</span>
                <span className="text-xs text-muted-foreground text-center">{stat.label}</span>
              </div>
            );
          })}
        </div>

        {/* Lista dos últimos cursos concluídos */}
        {courses.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Últimos Concluídos</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {courses.slice(0, 5).map((course) => (
                <div 
                  key={course.id} 
                  className="flex items-center justify-between p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <CheckCircle className="h-3 w-3 text-success shrink-0" />
                    <span className="text-sm truncate">{course.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="font-mono">{formatHoursToHMS(course.completed_hours)}</span>
                    {course.updated_at && (
                      <span>
                        {format(parseISO(course.updated_at), 'dd/MM/yy', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
