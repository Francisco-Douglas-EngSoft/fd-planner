import { useState, useEffect } from 'react';
import { Flame, Trophy, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeFocusSessions } from '@/hooks/useRealtimeFocusSessions';

export function FocusStreak() {
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const refreshKey = useRealtimeFocusSessions(user?.id);

  useEffect(() => {
    if (user) {
      calculateStreak();
    } else {
      setStreak(0);
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshKey]);

  const calculateStreak = async () => {
    if (!user) return;

    try {
      // Get distinct days with focus sessions in the last 60 days
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      const { data } = await supabase
        .from('focus_sessions')
        .select('completed_at')
        .eq('user_id', user.id)
        .eq('session_type', 'work')
        .gte('completed_at', sixtyDaysAgo.toISOString())
        .order('completed_at', { ascending: false });

      if (!data || data.length === 0) {
        setStreak(0);
        setIsLoading(false);
        return;
      }

      // Get unique dates
      const uniqueDates = [...new Set(
        data.map(session => {
          const date = new Date(session.completed_at);
          return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        })
      )].sort((a, b) => {
        const [aY, aM, aD] = a.split('-').map(Number);
        const [bY, bM, bD] = b.split('-').map(Number);
        return new Date(bY, bM, bD).getTime() - new Date(aY, aM, aD).getTime();
      });

      // Calculate streak
      let currentStreak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < uniqueDates.length; i++) {
        const [year, month, day] = uniqueDates[i].split('-').map(Number);
        const sessionDate = new Date(year, month, day);
        
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);
        expectedDate.setHours(0, 0, 0, 0);

        if (sessionDate.getTime() === expectedDate.getTime()) {
          currentStreak++;
        } else if (i === 0) {
          // Check if yesterday counts (user hasn't studied today yet)
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          if (sessionDate.getTime() === yesterday.getTime()) {
            currentStreak++;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      setStreak(currentStreak);
    } catch (error) {
      console.error('Error calculating streak:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStreakLevel = () => {
    if (streak >= 30) return { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Lendário' };
    if (streak >= 14) return { icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Em Chamas' };
    if (streak >= 7) return { icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10', label: 'Consistente' };
    return { icon: Flame, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Iniciante' };
  };

  const level = getStreakLevel();
  const Icon = level.icon;

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all",
      streak >= 7 && "border-orange-500/30"
    )}>
      <div className={cn(
        "absolute inset-0 opacity-30",
        streak >= 7 && "bg-gradient-to-br from-orange-500/20 to-transparent"
      )} />
      <CardContent className="relative p-3 sm:p-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={cn(
            "p-2 sm:p-3 rounded-xl transition-all shrink-0",
            level.bg,
            streak >= 7 && "animate-pulse"
          )}>
            <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", level.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className={cn(
                "text-2xl sm:text-3xl font-bold font-display tabular-nums",
                level.color
              )}>
                {streak}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground">dias</span>
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
              Sequência de estudos
            </p>
          </div>
          <Badge variant="outline" className={cn(
            "text-[10px] sm:text-xs shrink-0 hidden xs:flex",
            streak >= 7 && "border-orange-500/50 text-orange-500"
          )}>
            {level.label}
          </Badge>
        </div>
        
        {/* Flame indicators for high streaks */}
        {streak >= 3 && (
          <div className="flex items-center gap-0.5 sm:gap-1 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/50">
            {Array.from({ length: Math.min(streak, 7) }).map((_, i) => (
              <Flame 
                key={i} 
                className={cn(
                  "h-3 w-3 sm:h-4 sm:w-4 transition-all",
                  i < streak ? "text-orange-500" : "text-muted-foreground/30"
                )} 
              />
            ))}
            {streak > 7 && (
              <span className="text-[10px] sm:text-xs text-orange-500 ml-1">+{streak - 7}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
