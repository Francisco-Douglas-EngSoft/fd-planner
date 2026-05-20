import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, BookOpen, Coffee, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const courseColors = [
  { bg: 'bg-violet-500', dot: 'bg-violet-500' },
  { bg: 'bg-blue-500', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-500', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-500', dot: 'bg-amber-500' },
  { bg: 'bg-rose-500', dot: 'bg-rose-500' },
  { bg: 'bg-indigo-500', dot: 'bg-indigo-500' },
];

const daysOfWeekShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const formatMinutesToCompact = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}:${m.toString().padStart(2, '0')}`;
};

// Using CourseSchedule from WeeklyCalendarSimplified
import type { CourseSchedule } from './WeeklyCalendarSimplified';

interface MonthlyCalendarProps {
  weeklySchedule: Record<string, CourseSchedule[]>;
  currentMonth: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onGoToCurrentMonth: () => void;
}

export function MonthlyCalendar({
  weeklySchedule,
  currentMonth,
  onPreviousMonth,
  onNextMonth,
  onGoToCurrentMonth,
}: MonthlyCalendarProps) {
  const today = new Date();

  const isCurrentMonth = useMemo(() => {
    return isSameMonth(currentMonth, today);
  }, [currentMonth, today]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const getDayId = (date: Date): string => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return dayNames[date.getDay()];
  };

  const getColorConfig = (index: number) => courseColors[index % courseColors.length];

  const totalMonthlyMinutes = useMemo(() => {
    return Object.values(weeklySchedule).reduce((total, courses) => {
      return total + courses.reduce((sum, c) => sum + c.dailyMinutes, 0);
    }, 0) * 4; // Approximate 4 weeks per month
  }, [weeklySchedule]);

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-card via-card to-primary/5">
        <CardHeader className="pb-4 px-4 sm:px-6 border-b border-border/30 bg-gradient-to-r from-primary/5 via-transparent to-accent/5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">
                  Calendário Mensal
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">Sua programação de estudos</p>
                  {totalMonthlyMinutes > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                      <Clock className="h-3 w-3" />
                      ~{formatMinutesToCompact(totalMonthlyMinutes)} no mês
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 bg-muted/40 backdrop-blur-sm rounded-2xl p-1.5 border border-border/30">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onPreviousMonth} 
                    className="rounded-xl h-9 w-9 p-0 hover:bg-background/80 transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mês anterior</TooltipContent>
              </Tooltip>
              
              <span className="text-sm font-semibold min-w-[140px] sm:min-w-[180px] text-center px-2 capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </span>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onNextMonth} 
                    className="rounded-xl h-9 w-9 p-0 hover:bg-background/80 transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Próximo mês</TooltipContent>
              </Tooltip>
              
              {!isCurrentMonth && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={onGoToCurrentMonth} 
                  className="rounded-xl ml-1 bg-gradient-to-r from-primary to-primary/90 text-xs h-9 px-4 font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Hoje
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-2 sm:p-3 md:p-5">
          {/* Days Header - Horizontal scroll on mobile */}
          <div className="overflow-x-auto -mx-2 px-2 sm:overflow-x-visible sm:mx-0 sm:px-0">
            <div className="min-w-[320px] sm:min-w-0">
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
                {daysOfWeekShort.map(day => (
                  <div key={day} className="text-center text-[10px] sm:text-xs font-bold text-muted-foreground py-1.5 sm:py-2 uppercase tracking-wide">
                    {day}
                  </div>
                ))}
              </div>
          
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {calendarDays.map((date, idx) => {
              const isCurrentDay = isSameDay(date, today);
              const isInCurrentMonth = isSameMonth(date, currentMonth);
              const dayId = getDayId(date);
              const dayCourses = weeklySchedule[dayId] || [];
              const dayTotalMinutes = dayCourses.reduce((sum, c) => sum + c.dailyMinutes, 0);
              
              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[60px] sm:min-h-[80px] md:min-h-[100px] rounded-lg sm:rounded-xl p-1 sm:p-1.5 md:p-2 border transition-all duration-200 flex flex-col",
                    isInCurrentMonth 
                      ? isCurrentDay 
                        ? "border-primary bg-gradient-to-b from-primary/15 via-primary/8 to-card shadow-lg ring-1 ring-primary/20" 
                        : "border-border/30 bg-card/50 hover:bg-card hover:border-border/50"
                      : "border-transparent bg-muted/20 opacity-50"
                  )}
                >
                  {/* Day Number */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "text-[10px] sm:text-xs md:text-sm font-bold",
                      isCurrentDay ? "text-primary" : isInCurrentMonth ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {format(date, 'd')}
                    </span>
                    {isInCurrentMonth && dayTotalMinutes > 0 && (
                      <span className="text-[7px] sm:text-[8px] md:text-[9px] font-semibold text-muted-foreground bg-muted/60 px-1 sm:px-1.5 py-0.5 rounded-full">
                        {formatMinutesToCompact(dayTotalMinutes)}
                      </span>
                    )}
                  </div>
                  
                  {/* Courses */}
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {isInCurrentMonth && dayCourses.length === 0 && (
                      <div className="flex items-center justify-center h-full">
                        <Coffee className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground/30" />
                      </div>
                    )}
                    {isInCurrentMonth && dayCourses.slice(0, 2).map((course, courseIdx) => {
                      const colorConfig = getColorConfig(course.sequenceOrder || courseIdx);
                      
                      return (
                        <Tooltip key={courseIdx}>
                          <TooltipTrigger asChild>
                            <div className={cn(
                              "px-1 sm:px-1.5 py-0.5 rounded text-[7px] sm:text-[8px] md:text-[9px] font-semibold text-white truncate cursor-default transition-transform hover:scale-[1.02]",
                              colorConfig.bg
                            )}>
                              {course.courseName}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-bold">{course.courseName}</p>
                            <p className="text-muted-foreground">{formatMinutesToCompact(course.dailyMinutes)}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    {isInCurrentMonth && dayCourses.length > 2 && (
                      <span className="text-[7px] sm:text-[8px] text-muted-foreground font-medium">
                        +{dayCourses.length - 2} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
