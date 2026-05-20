import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatHoursToHMS } from '@/lib/timeUtils';
import { BookOpen, GraduationCap, Clock, Target, TrendingUp, CheckCircle } from 'lucide-react';

interface CourseData {
  id: string;
  name: string;
  category: string | null;
  status: string | null;
  total_hours: number;
  completed_hours: number;
}

interface PlanData {
  id: string;
  name: string;
  planning_category: string;
  total_hours: number;
  daily_hours: number;
  study_plan_courses: {
    course_id: string;
    courses: { name: string; total_hours: number; completed_hours: number };
  }[];
}

export function CategoryProgressReport() {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [coursesRes, plansRes] = await Promise.all([
      supabase
        .from('courses')
        .select('id, name, category, status, total_hours, completed_hours')
        .eq('user_id', user.id),
      supabase
        .from('study_plans')
        .select(`
          id, name, planning_category, total_hours, daily_hours,
          study_plan_courses (
            course_id,
            courses (name, total_hours, completed_hours)
          )
        `)
        .eq('user_id', user.id),
    ]);

    setCourses((coursesRes.data || []) as CourseData[]);
    setPlans((plansRes.data || []) as unknown as PlanData[]);
    setIsLoading(false);
  };

  const regularCourses = courses.filter(c => c.category !== 'Faculdades');
  const faculdadeCourses = courses.filter(c => c.category === 'Faculdades');
  const regularPlans = plans.filter(p => (p.planning_category || 'regular') === 'regular');
  const faculdadePlans = plans.filter(p => p.planning_category === 'faculdade');

  const getStats = (courseList: CourseData[], planList: PlanData[]) => {
    const active = courseList.filter(c => c.status !== 'completed');
    const completed = courseList.filter(c => c.status === 'completed');
    const totalHours = courseList.reduce((s, c) => s + (c.total_hours || 0), 0);
    const completedHours = courseList.reduce((s, c) => s + (c.completed_hours || 0), 0);
    const progress = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;

    return { active: active.length, completed: completed.length, totalHours, completedHours, progress, plans: planList.length };
  };

  const regularStats = getStats(regularCourses, regularPlans);
  const faculdadeStats = getStats(faculdadeCourses, faculdadePlans);

  if (isLoading) {
    return (
      <Card><CardContent className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </CardContent></Card>
    );
  }

  const renderReport = (
    stats: typeof regularStats,
    courseList: CourseData[],
    icon: typeof BookOpen,
    title: string,
    accentColor: string
  ) => {
    const Icon = icon;
    const activeCourses = courseList.filter(c => c.status !== 'completed').slice(0, 5);

    return (
      <div className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-muted/50 text-center">
            <p className={`text-2xl font-bold ${accentColor}`}>{stats.active}</p>
            <p className="text-[10px] text-muted-foreground">Ativos</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 text-center">
            <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
            <p className="text-[10px] text-muted-foreground">Concluídos</p>
          </div>
          <div className="p-3 rounded-xl bg-muted/50 text-center">
            <p className="text-2xl font-bold text-muted-foreground">{stats.plans}</p>
            <p className="text-[10px] text-muted-foreground">Planos</p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso Geral</span>
            <span className="font-medium">{stats.progress}%</span>
          </div>
          <Progress value={stats.progress} className="h-2.5" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Estudado: {formatHoursToHMS(stats.completedHours)}</span>
            <span>Total: {formatHoursToHMS(stats.totalHours)}</span>
          </div>
        </div>

        {/* Active Courses List */}
        {activeCourses.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Cursos em andamento</p>
            <div className="space-y-1.5">
              {activeCourses.map(course => {
                const p = course.total_hours > 0 
                  ? Math.round((course.completed_hours / course.total_hours) * 100) 
                  : 0;
                return (
                  <div key={course.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{course.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress value={p} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground font-mono">{p}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {courseList.length === 0 && (
          <div className="text-center p-6 text-muted-foreground text-sm">
            Nenhum curso nesta categoria
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Progresso por Categoria
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="regular">
          <TabsList className="w-full">
            <TabsTrigger value="regular" className="flex-1 gap-1.5 text-xs">
              <BookOpen className="h-3.5 w-3.5" />
              Cursos ({regularCourses.length})
            </TabsTrigger>
            <TabsTrigger value="faculdade" className="flex-1 gap-1.5 text-xs">
              <GraduationCap className="h-3.5 w-3.5" />
              Faculdades ({faculdadeCourses.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="regular" className="mt-4">
            {renderReport(regularStats, regularCourses, BookOpen, 'Cursos Regulares', 'text-primary')}
          </TabsContent>
          <TabsContent value="faculdade" className="mt-4">
            {renderReport(faculdadeStats, faculdadeCourses, GraduationCap, 'Faculdades', 'text-amber-500')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
