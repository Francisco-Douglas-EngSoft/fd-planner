import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Clock, CheckCircle2, GraduationCap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { formatHoursToHMS } from '@/lib/timeUtils';

interface CourseData {
  name: string;
  fullName: string;
  totalHours: number;
  completedHours: number;
  remainingHours: number;
  percentage: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 71%, 45%)',
  'hsl(262, 83%, 58%)',
  'hsl(38, 92%, 50%)',
  'hsl(340, 82%, 52%)',
];

export function CourseStudyChart() {
  const [data, setData] = useState<CourseData[]>([]);
  const [totals, setTotals] = useState({
    totalHours: 0,
    completedHours: 0,
    coursesCount: 0,
    avgProgress: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCourseData();
    }
  }, [user]);

  const fetchCourseData = async () => {
    if (!user) return;

    try {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('id, name, total_hours, completed_hours, status')
        .eq('user_id', user.id)
        .or('status.eq.pending,status.eq.in_progress')
        .order('completed_hours', { ascending: false })
        .limit(5);

      if (error) throw error;

      let grandTotal = 0;
      let grandCompleted = 0;
      let totalProgress = 0;

      const chartData: CourseData[] = (courses || []).map((course, index) => {
        const total = Number(course.total_hours) || 0;
        const completed = Number(course.completed_hours) || 0;
        const remaining = Math.max(0, total - completed);
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        grandTotal += total;
        grandCompleted += completed;
        totalProgress += percentage;

        return {
          name: course.name.length > 10 ? course.name.substring(0, 10) + '...' : course.name,
          fullName: course.name,
          totalHours: total,
          completedHours: completed,
          remainingHours: remaining,
          percentage,
        };
      });

      setData(chartData);
      setTotals({
        totalHours: grandTotal,
        completedHours: grandCompleted,
        coursesCount: courses?.length || 0,
        avgProgress: courses?.length ? Math.round(totalProgress / courses.length) : 0,
      });
    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Horas Estudadas por Curso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex flex-col items-center justify-center text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum curso ativo</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Adicione cursos e complete módulos
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          Horas Estudadas por Curso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-lg bg-primary/10 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-[10px] text-muted-foreground">Total Cursos</p>
            <p className="font-bold text-primary text-sm">{formatHoursToHMS(totals.totalHours)}</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-[10px] text-muted-foreground">Concluído</p>
            <p className="font-bold text-green-500 text-sm">{formatHoursToHMS(totals.completedHours)}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 text-center">
            <BookOpen className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-[10px] text-muted-foreground">Cursos</p>
            <p className="font-bold text-blue-500 text-sm">{totals.coursesCount}</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 text-center">
            <GraduationCap className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-[10px] text-muted-foreground">Progresso Médio</p>
            <p className="font-bold text-purple-500 text-sm">{totals.avgProgress}%</p>
          </div>
        </div>

        {/* Stacked Bar Chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={70}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as CourseData;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold text-sm">{data.fullName}</p>
                        <div className="space-y-1 mt-2">
                          <div className="flex justify-between gap-4 text-xs">
                            <span className="text-green-500">Concluído:</span>
                            <span className="font-mono">{formatHoursToHMS(data.completedHours)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-xs">
                            <span className="text-muted-foreground">Restante:</span>
                            <span className="font-mono">{formatHoursToHMS(data.remainingHours)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-xs">
                            <span className="text-muted-foreground">Progresso:</span>
                            <span className="font-mono font-bold">{data.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="completedHours" 
                stackId="a" 
                fill="hsl(142, 71%, 45%)" 
                radius={[0, 0, 0, 0]}
                name="Concluído"
              />
              <Bar 
                dataKey="remainingHours" 
                stackId="a" 
                fill="hsl(var(--muted))" 
                radius={[0, 4, 4, 0]}
                name="Restante"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-xs text-muted-foreground">Concluído</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-muted" />
            <span className="text-xs text-muted-foreground">Restante</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
