import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface StudyPlanCourse {
  course_id: string;
  allocated_hours: number | null;
  is_fixed: boolean | null;
  study_days: string[] | null;
  sequence_order: number | null;
  is_completed: boolean | null;
  courses: {
    name: string;
    total_hours: number | null;
  };
}

interface StudyPlan {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  daily_hours: number | null;
  study_days: string[] | null;
  total_hours: number | null;
  created_at: string;
  study_plan_courses?: StudyPlanCourse[];
}

interface TodayStudyCardProps {
  plans: StudyPlan[];
}

const daysOfWeekMap: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

const formatMinutesToHM = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
};

const colors = [
  'bg-primary',
  'bg-accent',
  'bg-success',
  'bg-warning',
  'bg-destructive/80',
  'bg-violet-500',
];

export function TodayStudyCard({ plans }: TodayStudyCardProps) {
  const today = new Date();
  const todayDayId = daysOfWeekMap[today.getDay()];
  const todayStr = today.toISOString().split('T')[0];

  const todayCourses = useMemo(() => {
    const courses: { courseName: string; dailyMinutes: number; color: string; isFixed: boolean }[] = [];

    // Get plans that are active today
    const activePlans = plans.filter(plan => {
      return plan.start_date <= todayStr && plan.end_date >= todayStr;
    });

    activePlans.forEach((plan) => {
      if (!plan.study_plan_courses || plan.study_plan_courses.length === 0) return;
      if (!plan.study_days || !plan.study_days.includes(todayDayId)) return;

      const dailyHours = plan.daily_hours || 1.5;
      const totalDailyMinutes = dailyHours * 60;

      // Sort courses by sequence order
      const sortedCourses = [...plan.study_plan_courses].sort((a, b) => 
        (a.sequence_order || 0) - (b.sequence_order || 0)
      );

      // Find the current course in sequence (first non-completed, non-fixed)
      const currentSequenceCourse = sortedCourses.find(pc => !pc.is_completed && !pc.is_fixed);
      const currentSequenceOrder = currentSequenceCourse?.sequence_order || 1;

      // Get fixed courses and all parallel courses (same sequence_order)
      const fixedCourses = sortedCourses.filter(pc => pc.is_fixed);
      const parallelCourses = sortedCourses.filter(pc => 
        !pc.is_fixed && (pc.sequence_order || 1) === currentSequenceOrder
      );

      const activeCourses = [
        ...fixedCourses,
        ...parallelCourses
      ];

      // Calculate totals for proper distribution
      const totalParallelHours = parallelCourses.reduce(
        (sum, pc) => sum + (pc.courses?.total_hours || 0), 0
      );
      const totalFixedHours = fixedCourses.reduce(
        (sum, pc) => sum + (pc.courses?.total_hours || 0), 0
      );

      if (totalParallelHours === 0 && totalFixedHours === 0) return;

      activeCourses.forEach((pc, idx) => {
        const courseHours = pc.courses?.total_hours || 0;
        
        // Distribute time proportionally within each group
        let dailyMinutes: number;
        if (pc.is_fixed) {
          const fixedProportion = totalFixedHours > 0 ? courseHours / totalFixedHours : 0;
          const fixedDailyMinutes = parallelCourses.length > 0 ? totalDailyMinutes * 0.5 : totalDailyMinutes;
          dailyMinutes = fixedDailyMinutes * fixedProportion;
        } else {
          const parallelProportion = totalParallelHours > 0 ? courseHours / totalParallelHours : 0;
          const parallelDailyMinutes = fixedCourses.length > 0 ? totalDailyMinutes * 0.5 : totalDailyMinutes;
          dailyMinutes = parallelDailyMinutes * parallelProportion;
        }
        
        const courseStudyDays = pc.is_fixed 
          ? plan.study_days 
          : (pc.study_days && pc.study_days.length > 0 ? pc.study_days : plan.study_days);
        
        // Check if this course should be studied today
        if (!courseStudyDays?.includes(todayDayId)) return;
        
        courses.push({
          courseName: pc.courses?.name || '',
          dailyMinutes,
          color: colors[(pc.sequence_order || idx) % colors.length],
          isFixed: pc.is_fixed || false,
        });
      });
    });

    return courses;
  }, [plans, todayDayId, todayStr]);

  const totalMinutesToday = todayCourses.reduce((sum, c) => sum + c.dailyMinutes, 0);

  return (
    <Card className="border-0 shadow-lg overflow-hidden bg-gradient-to-br from-primary/10 via-card to-card">
      <CardHeader className="pb-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-primary shadow-glow">
            <Calendar className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Estudos de Hoje</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
              {format(today, "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          {totalMinutesToday > 0 && (
            <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {formatMinutesToHM(totalMinutesToday)}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {todayCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <BookOpen className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-medium">Dia livre!</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Nenhum estudo programado para hoje
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayCourses.map((course, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl text-white",
                  course.color
                )}
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5" />
                  <div>
                    <p className="font-semibold text-sm">{course.courseName}</p>
                    {course.isFixed && (
                      <span className="text-[10px] opacity-80">📌 Fixo</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-full">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{formatMinutesToHM(course.dailyMinutes)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}