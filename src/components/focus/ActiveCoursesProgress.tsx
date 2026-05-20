import { useState, useEffect, useMemo } from 'react';
import { BookOpen, Clock, CheckCircle2, TrendingUp, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatHoursToHMS } from '@/lib/timeUtils';
import { cn } from '@/lib/utils';

interface CourseProgress {
  id: string;
  name: string;
  total_hours: number;
  completed_hours: number;
  status: string;
  category: string | null;
}

type SortOption = 'progress-asc' | 'progress-desc' | 'remaining-asc' | 'remaining-desc' | 'name';

interface ActiveCoursesProgressProps {
  onCourseSelect?: (courseId: string) => void;
  selectedCourseId?: string;
}

export function ActiveCoursesProgress({ onCourseSelect, selectedCourseId }: ActiveCoursesProgressProps) {
  const [courses, setCourses] = useState<CourseProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('remaining-desc');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchActiveCourses();
    }
  }, [user]);

  const fetchActiveCourses = async () => {
    if (!user) return;

    setIsLoading(true);

    const { data: coursesData } = await supabase
      .from('courses')
      .select('id, name, total_hours, completed_hours, status, category')
      .eq('user_id', user.id)
      .in('status', ['em_andamento', 'pendente'])
      .order('name');

    if (coursesData) {
      setCourses(coursesData);
    }

    setIsLoading(false);
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('courses-progress-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'courses',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchActiveCourses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Sort courses based on selected option
  const sortedCourses = useMemo(() => {
    return [...courses].sort((a, b) => {
      const aCompleted = a.completed_hours || 0;
      const bCompleted = b.completed_hours || 0;
      const aTotal = a.total_hours || 0;
      const bTotal = b.total_hours || 0;
      const aRemaining = Math.max(0, aTotal - aCompleted);
      const bRemaining = Math.max(0, bTotal - bCompleted);
      const aProgress = aTotal > 0 ? (aCompleted / aTotal) * 100 : 0;
      const bProgress = bTotal > 0 ? (bCompleted / bTotal) * 100 : 0;

      switch (sortBy) {
        case 'progress-asc':
          return aProgress - bProgress;
        case 'progress-desc':
          return bProgress - aProgress;
        case 'remaining-asc':
          return aRemaining - bRemaining;
        case 'remaining-desc':
          return bRemaining - aRemaining;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
  }, [courses, sortBy]);

  const sortLabels: Record<SortOption, string> = {
    'progress-asc': 'Menor progresso',
    'progress-desc': 'Maior progresso',
    'remaining-asc': 'Menos tempo restante',
    'remaining-desc': 'Mais tempo restante',
    'name': 'Nome A-Z',
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (courses.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum curso em andamento</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Meus Cursos Ativos
          </CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs px-2">
                  <ArrowUpDown className="h-3 w-3" />
                  <span className="hidden sm:inline">Ordenar</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem 
                  onClick={() => setSortBy('remaining-desc')}
                  className={cn(sortBy === 'remaining-desc' && "bg-primary/10")}
                >
                  <ArrowDown className="h-3 w-3 mr-2" />
                  Mais tempo restante
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy('remaining-asc')}
                  className={cn(sortBy === 'remaining-asc' && "bg-primary/10")}
                >
                  <ArrowUp className="h-3 w-3 mr-2" />
                  Menos tempo restante
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy('progress-desc')}
                  className={cn(sortBy === 'progress-desc' && "bg-primary/10")}
                >
                  <ArrowDown className="h-3 w-3 mr-2" />
                  Maior progresso
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy('progress-asc')}
                  className={cn(sortBy === 'progress-asc' && "bg-primary/10")}
                >
                  <ArrowUp className="h-3 w-3 mr-2" />
                  Menor progresso
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy('name')}
                  className={cn(sortBy === 'name' && "bg-primary/10")}
                >
                  Nome A-Z
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Badge variant="outline" className="text-xs">
              {courses.length}
            </Badge>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {sortLabels[sortBy]} • Clique para selecionar
        </p>
      </CardHeader>
      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4">
        <ScrollArea className="max-h-[280px]">
          <div className="space-y-2">
            {sortedCourses.map((course) => {
              const completedHours = course.completed_hours || 0;
              const totalHours = course.total_hours || 0;
              const remainingHours = Math.max(0, totalHours - completedHours);
              const progressPercent = totalHours > 0 
                ? Math.min(100, Math.round((completedHours / totalHours) * 100)) 
                : 0;
              const isCompleted = progressPercent >= 100;
              const isSelected = selectedCourseId === course.id;

              return (
                <button
                  key={course.id}
                  onClick={() => onCourseSelect?.(course.id)}
                  className={cn(
                    "w-full p-3 rounded-lg border transition-all text-left",
                    isSelected
                      ? "bg-primary/10 border-primary ring-1 ring-primary/30"
                      : isCompleted 
                        ? "bg-success/5 border-success/20 hover:border-success/40" 
                        : "bg-muted/30 border-border/50 hover:border-primary/40 hover:bg-muted/50",
                    onCourseSelect && "cursor-pointer"
                  )}
                >
                  {/* Course Name & Category */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                        )}
                        <p className={cn(
                          "font-medium text-sm truncate",
                          isSelected && "text-primary"
                        )}>
                          {course.name}
                        </p>
                      </div>
                      {course.category && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {course.category}
                        </p>
                      )}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "shrink-0 text-[10px]",
                        isCompleted && "bg-success/10 text-success border-success/30",
                        isSelected && !isCompleted && "bg-primary/10 text-primary border-primary/30"
                      )}
                    >
                      {progressPercent}%
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <Progress 
                    value={progressPercent} 
                    className={cn(
                      "h-1.5 mb-2",
                      isCompleted && "[&>div]:bg-success",
                      isSelected && !isCompleted && "[&>div]:bg-primary"
                    )} 
                  />

                  {/* Time Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className={cn(
                        "h-3 w-3 shrink-0",
                        isCompleted ? "text-success" : isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Estudado</p>
                        <p className={cn(
                          "text-xs font-mono font-medium",
                          isCompleted ? "text-success" : isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {formatHoursToHMS(completedHours)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className={cn(
                        "h-3 w-3 shrink-0",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                      <div className="min-w-0">
                        <p className="text-[10px] text-muted-foreground">Restante</p>
                        <p className="text-xs font-mono font-medium">
                          {isCompleted ? (
                            <span className="text-success">Concluído!</span>
                          ) : (
                            formatHoursToHMS(remainingHours)
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
