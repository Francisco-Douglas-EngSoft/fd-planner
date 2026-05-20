import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  Target, 
  CheckCircle2, 
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Plus,
  Flame,
  Award
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, subDays, isToday, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailyProgress {
  id: string;
  course_id: string;
  study_date: string;
  hours_studied: number;
  notes: string | null;
}

interface CourseWithProgress {
  id: string;
  name: string;
  total_hours: number;
  completed_hours: number;
  weekly_goal_hours: number;
  custom_daily_hours: number | null;
  dailyProgress: DailyProgress[];
}

interface DailyProgressReportProps {
  planId: string;
  planName: string;
  dailyHours: number;
  studyDays: string[];
}

const CHART_COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(262, 83%, 58%)',
  'hsl(25, 95%, 53%)',
  'hsl(330, 81%, 60%)',
  'hsl(47, 96%, 53%)',
  'hsl(173, 80%, 40%)',
  'hsl(350, 89%, 60%)',
];

const formatHoursToTime = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const parseTimeToHours = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    return hours + (minutes / 60);
  }
  return 0;
};

export function DailyProgressReport({ planId, planName, dailyHours, studyDays }: DailyProgressReportProps) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [editingProgress, setEditingProgress] = useState<Record<string, string>>({});

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    if (user && planId) {
      fetchCoursesWithProgress();
    }
  }, [user, planId, selectedDate]);

  const fetchCoursesWithProgress = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch courses in this plan
      const { data: planCourses, error: planError } = await supabase
        .from('study_plan_courses')
        .select(`
          course_id,
          weekly_goal_hours,
          custom_daily_hours,
          courses (
            id,
            name,
            total_hours,
            completed_hours
          )
        `)
        .eq('study_plan_id', planId);

      if (planError) throw planError;

      // Fetch daily progress for this week
      const { data: progressData, error: progressError } = await supabase
        .from('daily_study_progress')
        .select('*')
        .eq('study_plan_id', planId)
        .eq('user_id', user.id)
        .gte('study_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('study_date', format(weekEnd, 'yyyy-MM-dd'));

      if (progressError) throw progressError;

      const coursesWithProgress: CourseWithProgress[] = (planCourses || []).map((pc: any) => {
        const course = Array.isArray(pc.courses) ? pc.courses[0] : pc.courses;
        return {
          id: course?.id || pc.course_id,
          name: course?.name || 'Curso',
          total_hours: course?.total_hours || 0,
          completed_hours: course?.completed_hours || 0,
          weekly_goal_hours: pc.weekly_goal_hours || 0,
          custom_daily_hours: pc.custom_daily_hours,
          dailyProgress: (progressData || []).filter((p: any) => p.course_id === pc.course_id)
        };
      });

      setCourses(coursesWithProgress);
    } catch (error) {
      console.error('Error fetching progress:', error);
      toast.error('Erro ao carregar progresso');
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async (courseId: string, date: Date, hours: number) => {
    if (!user || hours < 0) return;

    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const { data: existing } = await supabase
        .from('daily_study_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('study_plan_id', planId)
        .eq('study_date', dateStr)
        .maybeSingle();

      if (existing) {
        if (hours === 0) {
          await supabase
            .from('daily_study_progress')
            .delete()
            .eq('id', existing.id);
        } else {
          await supabase
            .from('daily_study_progress')
            .update({ hours_studied: hours })
            .eq('id', existing.id);
        }
      } else if (hours > 0) {
        await supabase
          .from('daily_study_progress')
          .insert({
            user_id: user.id,
            course_id: courseId,
            study_plan_id: planId,
            study_date: dateStr,
            hours_studied: hours
          });
      }

      toast.success('Progresso salvo!');
      fetchCoursesWithProgress();
    } catch (error) {
      console.error('Error saving progress:', error);
      toast.error('Erro ao salvar progresso');
    }
  };

  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    let totalStudied = 0;
    let totalGoal = 0;
    let daysWithStudy = 0;
    const daySet = new Set<string>();

    courses.forEach(course => {
      totalGoal += course.weekly_goal_hours;
      course.dailyProgress.forEach(p => {
        totalStudied += p.hours_studied;
        daySet.add(p.study_date);
      });
    });

    daysWithStudy = daySet.size;
    const avgPerDay = daysWithStudy > 0 ? totalStudied / daysWithStudy : 0;
    const goalProgress = totalGoal > 0 ? Math.min(100, (totalStudied / totalGoal) * 100) : 0;

    return { totalStudied, totalGoal, daysWithStudy, avgPerDay, goalProgress };
  }, [courses]);

  // Chart data for weekly overview
  const weeklyChartData = useMemo(() => {
    return weekDays.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayData: Record<string, string | number | boolean> = {
        day: format(day, 'EEE', { locale: ptBR }),
        date: dateStr,
        isToday: isToday(day),
      };

      let total = 0;
      courses.forEach((course, idx) => {
        const progress = course.dailyProgress.find(p => p.study_date === dateStr);
        const hours = progress?.hours_studied || 0;
        dayData[course.name] = hours;
        dayData[`${course.name}_color`] = CHART_COLORS[idx % CHART_COLORS.length];
        total += hours;
      });
      dayData.total = total;
      dayData.goal = dailyHours;

      return dayData;
    });
  }, [weekDays, courses, dailyHours]);

  // Calculate streak
  const currentStreak = useMemo(() => {
    let streak = 0;
    let currentDate = new Date();
    
    while (true) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const hasStudy = courses.some(c => 
        c.dailyProgress.some(p => p.study_date === dateStr && p.hours_studied > 0)
      );
      
      if (hasStudy) {
        streak++;
        currentDate = subDays(currentDate, 1);
      } else if (!isToday(currentDate)) {
        break;
      } else {
        currentDate = subDays(currentDate, 1);
      }
      
      if (streak > 365) break; // Safety limit
    }
    
    return streak;
  }, [courses]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando relatório...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Esta Semana</p>
                <p className="text-xl font-bold">{formatHoursToTime(weeklyStats.totalStudied)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Meta Semanal</p>
                <p className="text-xl font-bold">{Math.round(weeklyStats.goalProgress)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sequência</p>
                <p className="text-xl font-bold">{currentStreak} dias</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Média/Dia</p>
                <p className="text-xl font-bold">{formatHoursToTime(weeklyStats.avgPerDay)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Navigation */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Progresso Semanal
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(subDays(selectedDate, 7))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-2">
                {format(weekStart, 'dd/MM')} - {format(weekEnd, 'dd/MM/yyyy')}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(addDays(selectedDate, 7))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekly Chart */}
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}h`} />
                <Tooltip
                  formatter={(value: number, name: string) => [formatHoursToTime(value), name]}
                  labelFormatter={(label) => `${label}`}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                {courses.map((course, idx) => (
                  <Bar
                    key={course.id}
                    dataKey={course.name}
                    stackId="a"
                    fill={CHART_COLORS[idx % CHART_COLORS.length]}
                    radius={idx === courses.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Input Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Curso</th>
                  {weekDays.map(day => (
                    <th
                      key={day.toISOString()}
                      className={`text-center py-2 px-1 font-medium ${
                        isToday(day) ? 'bg-primary/10 rounded-t-lg' : ''
                      }`}
                    >
                      <div className="text-xs text-muted-foreground">
                        {format(day, 'EEE', { locale: ptBR })}
                      </div>
                      <div className={isToday(day) ? 'text-primary font-bold' : ''}>
                        {format(day, 'dd')}
                      </div>
                    </th>
                  ))}
                  <th className="text-center py-2 px-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course, idx) => {
                  const weekTotal = course.dailyProgress.reduce((sum, p) => sum + p.hours_studied, 0);
                  
                  return (
                    <tr key={course.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                          />
                          <span className="font-medium truncate max-w-[120px]" title={course.name}>
                            {course.name}
                          </span>
                        </div>
                      </td>
                      {weekDays.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const progress = course.dailyProgress.find(p => p.study_date === dateStr);
                        const hours = progress?.hours_studied || 0;
                        const inputKey = `${course.id}-${dateStr}`;
                        
                        return (
                          <td
                            key={dateStr}
                            className={`text-center py-1 px-1 ${
                              isToday(day) ? 'bg-primary/5' : ''
                            }`}
                          >
                            <Input
                              type="time"
                              value={editingProgress[inputKey] ?? formatHoursToTime(hours)}
                              onChange={(e) => setEditingProgress(prev => ({
                                ...prev,
                                [inputKey]: e.target.value
                              }))}
                              onBlur={() => {
                                const newHours = parseTimeToHours(editingProgress[inputKey] || formatHoursToTime(hours));
                                if (newHours !== hours) {
                                  saveProgress(course.id, day, newHours);
                                }
                                setEditingProgress(prev => {
                                  const next = { ...prev };
                                  delete next[inputKey];
                                  return next;
                                });
                              }}
                              className="w-20 h-7 text-xs text-center mx-auto"
                            />
                          </td>
                        );
                      })}
                      <td className="text-center py-2 px-2">
                        <Badge variant="secondary" className="font-mono">
                          {formatHoursToTime(weekTotal)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-medium">
                  <td className="py-2 px-2">Total</td>
                  {weekDays.map(day => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayTotal = courses.reduce((sum, c) => {
                      const p = c.dailyProgress.find(p => p.study_date === dateStr);
                      return sum + (p?.hours_studied || 0);
                    }, 0);
                    
                    return (
                      <td
                        key={dateStr}
                        className={`text-center py-2 px-1 ${
                          isToday(day) ? 'bg-primary/10' : ''
                        }`}
                      >
                        <span className={`font-mono text-xs ${
                          dayTotal >= dailyHours ? 'text-green-600' : dayTotal > 0 ? 'text-orange-500' : 'text-muted-foreground'
                        }`}>
                          {formatHoursToTime(dayTotal)}
                        </span>
                      </td>
                    );
                  })}
                  <td className="text-center py-2 px-2">
                    <Badge className="font-mono">
                      {formatHoursToTime(weeklyStats.totalStudied)}
                    </Badge>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Course Progress Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((course, idx) => {
          const weekTotal = course.dailyProgress.reduce((sum, p) => sum + p.hours_studied, 0);
          const goalProgress = course.weekly_goal_hours > 0 
            ? Math.min(100, (weekTotal / course.weekly_goal_hours) * 100)
            : 0;
          const overallProgress = course.total_hours > 0
            ? Math.min(100, (course.completed_hours / course.total_hours) * 100)
            : 0;

          return (
            <Card key={course.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-10 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                  />
                  <div className="flex-1">
                    <CardTitle className="text-base">{course.name}</CardTitle>
                    <CardDescription>
                      {formatHoursToTime(course.completed_hours)} de {formatHoursToTime(course.total_hours)}
                    </CardDescription>
                  </div>
                  <Badge variant={overallProgress >= 100 ? 'default' : 'secondary'}>
                    {Math.round(overallProgress)}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progresso Geral</span>
                    <span>{Math.round(overallProgress)}%</span>
                  </div>
                  <Progress value={overallProgress} className="h-2" />
                </div>
                
                {course.weekly_goal_hours > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Meta Semanal ({formatHoursToTime(course.weekly_goal_hours)})</span>
                      <span>{Math.round(goalProgress)}%</span>
                    </div>
                    <Progress 
                      value={goalProgress} 
                      className={`h-2 ${goalProgress >= 100 ? '[&>div]:bg-green-500' : ''}`} 
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-2 border-t">
                  <span className="text-muted-foreground">Esta semana:</span>
                  <span className="font-medium">{formatHoursToTime(weekTotal)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
