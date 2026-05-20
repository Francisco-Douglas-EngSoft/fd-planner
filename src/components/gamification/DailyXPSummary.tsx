import { motion } from 'framer-motion';
import { Flame, TrendingUp, Zap, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyXPSummaryProps {
  todayXP: number;
  dailyGoal: number;
  streakDays: number;
  className?: string;
}

export function DailyXPSummary({ todayXP, dailyGoal, streakDays, className }: DailyXPSummaryProps) {
  const progress = dailyGoal > 0 ? Math.min((todayXP / dailyGoal) * 100, 100) : 0;
  const goalReached = todayXP >= dailyGoal;

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {/* Today's XP */}
      <div className="flex items-center gap-2">
        <motion.div
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center",
            goalReached ? "bg-success/10" : "bg-primary/10"
          )}
          animate={goalReached ? { scale: [1, 1.1, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <Zap className={cn("h-4 w-4", goalReached ? "text-success" : "text-primary")} />
        </motion.div>
        <div>
          <p className="text-sm font-bold">{todayXP} XP</p>
          <p className="text-[10px] text-muted-foreground">hoje</p>
        </div>
      </div>

      {/* Mini progress bar */}
      <div className="flex-1 max-w-[120px]">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", goalReached ? "bg-success" : "bg-primary")}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>
        <p className="text-[9px] text-muted-foreground mt-0.5 text-center">{Math.round(progress)}% da meta</p>
      </div>

      {/* Streak */}
      {streakDays > 0 && (
        <div className="flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-warning" />
          <span className="text-sm font-bold">{streakDays}</span>
          <span className="text-[10px] text-muted-foreground">dias</span>
        </div>
      )}
    </div>
  );
}
