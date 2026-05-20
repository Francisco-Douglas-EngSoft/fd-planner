import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestMode } from '@/hooks/useGuestMode';

interface Course {
  id: string;
  name: string;
  total_hours: number;
  completed_hours: number;
  status: string;
}

const formatHoursHMS = (hours: number): string => {
  const totalSeconds = Math.round(hours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export function CourseProgress() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { isReadOnly, getDemoData } = useGuestMode();

  useEffect(() => {
    if (isReadOnly) {
      const demoData = getDemoData();
      setCourses(demoData.courses.filter(c => c.status === 'in_progress').slice(0, 5));
      setIsLoading(false);
    } else if (user) {
      fetchCourses();
    }
  }, [user, isReadOnly]);

  const fetchCourses = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('courses')
      .select('id, name, total_hours, completed_hours, status')
      .eq('user_id', user.id)
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false })
      .limit(5);

    setCourses(data || []);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Cursos em Andamento
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
          <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Cursos em Andamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-5">
        {courses.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 opacity-50" />
            <p className="text-xs sm:text-sm">Nenhum curso em andamento</p>
          </div>
        ) : (
          courses.map((course) => {
            const progress = course.total_hours > 0 
              ? Math.round((course.completed_hours / course.total_hours) * 100) 
              : 0;
            const remainingHours = Math.max(0, course.total_hours - course.completed_hours);
            
            return (
              <div key={course.id} className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-xs sm:text-sm truncate">{course.name}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5 sm:h-2" />
                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span>{formatHoursHMS(remainingHours)} restantes</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
