import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Flame, 
  Trophy, 
  Star, 
  Zap,
  Crown,
  Medal,
  Gift,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const milestones = [
  { days: 1, label: 'Primeiro Dia', icon: Star, color: 'primary', message: 'Todo grande caminho começa com um passo!' },
  { days: 3, label: '3 Dias', icon: Zap, color: 'accent', message: 'Você está criando um novo hábito!' },
  { days: 7, label: '1 Semana', icon: Medal, color: 'success', message: 'Uma semana inteira! Incrível!' },
  { days: 14, label: '2 Semanas', icon: Trophy, color: 'warning', message: 'Seu cérebro está se reconectando!' },
  { days: 30, label: '1 Mês', icon: Crown, color: 'primary', message: 'Um mês completo! Você é inspiração!' },
  { days: 60, label: '2 Meses', icon: Gift, color: 'accent', message: 'Dois meses de liberdade!' },
  { days: 90, label: '3 Meses', icon: Sparkles, color: 'success', message: 'O reboot está quase completo!' },
  { days: 180, label: '6 Meses', icon: Star, color: 'warning', message: 'Você é um guerreiro!' },
  { days: 365, label: '1 Ano', icon: Crown, color: 'primary', message: 'Lendário! Um ano inteiro!' },
];

interface StreakMilestoneProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

export function StreakMilestone({ currentStreak, longestStreak, className }: StreakMilestoneProps) {
  // Find current milestone and next milestone
  const currentMilestone = [...milestones].reverse().find(m => currentStreak >= m.days);
  const nextMilestone = milestones.find(m => m.days > currentStreak);
  
  const daysToNext = nextMilestone ? nextMilestone.days - currentStreak : 0;
  const progressToNext = nextMilestone 
    ? ((currentStreak - (currentMilestone?.days || 0)) / (nextMilestone.days - (currentMilestone?.days || 0))) * 100
    : 100;

  const CurrentIcon = currentMilestone?.icon || Flame;
  const NextIcon = nextMilestone?.icon || Crown;

  const colorClasses: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
    primary: {
      bg: 'bg-primary/10',
      text: 'text-primary',
      border: 'border-primary/20',
      gradient: 'from-primary to-primary/70',
    },
    accent: {
      bg: 'bg-accent/10',
      text: 'text-accent',
      border: 'border-accent/20',
      gradient: 'from-accent to-accent/70',
    },
    success: {
      bg: 'bg-success/10',
      text: 'text-success',
      border: 'border-success/20',
      gradient: 'from-success to-success/70',
    },
    warning: {
      bg: 'bg-warning/10',
      text: 'text-warning',
      border: 'border-warning/20',
      gradient: 'from-warning to-warning/70',
    },
  };

  const currentColor = colorClasses[currentMilestone?.color || 'primary'];
  const nextColor = colorClasses[nextMilestone?.color || 'primary'];

  return (
    <Card className={cn(
      "overflow-hidden border-2",
      currentColor.border,
      "bg-gradient-to-br from-card to-muted/20",
      className
    )}>
      <CardContent className="p-5 space-y-5">
        {/* Current Streak Display */}
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "relative p-4 rounded-2xl",
              `bg-gradient-to-br ${currentColor.gradient}`,
              "shadow-lg"
            )}
          >
            <CurrentIcon className="h-8 w-8 text-white" />
            {currentStreak > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive flex items-center justify-center"
              >
                <Flame className="h-3.5 w-3.5 text-white" />
              </motion.div>
            )}
          </motion.div>
          
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className={cn("text-4xl font-bold", currentColor.text)}>{currentStreak}</span>
              <span className="text-lg text-muted-foreground">dias</span>
            </div>
            {currentMilestone && (
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={cn(currentColor.bg, currentColor.text, "border-0")}>
                  <CurrentIcon className="h-3 w-3 mr-1" />
                  {currentMilestone.label}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Current Milestone Message */}
        {currentMilestone && (
          <div className={cn(
            "p-3 rounded-xl",
            currentColor.bg,
            "border",
            currentColor.border
          )}>
            <p className={cn("text-sm font-medium text-center", currentColor.text)}>
              🎉 {currentMilestone.message}
            </p>
          </div>
        )}

        {/* Progress to Next Milestone */}
        {nextMilestone && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Próximo marco</span>
              <div className="flex items-center gap-1.5">
                <NextIcon className={cn("h-3.5 w-3.5", nextColor.text)} />
                <span className={cn("font-medium", nextColor.text)}>{nextMilestone.label}</span>
              </div>
            </div>
            <div className="relative">
              <Progress value={progressToNext} className="h-3" />
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">{currentMilestone?.days || 0} dias</span>
                <span className={cn("text-[10px] font-medium", nextColor.text)}>
                  Faltam {daysToNext} dias
                </span>
                <span className="text-[10px] text-muted-foreground">{nextMilestone.days} dias</span>
              </div>
            </div>
          </div>
        )}

        {/* Milestone Road */}
        <div className="pt-3 border-t border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-3">Marcos da Jornada</p>
          <div className="flex gap-1.5 overflow-x-auto pb-2 hide-scrollbar">
            {milestones.slice(0, 7).map((milestone, index) => {
              const MilestoneIcon = milestone.icon;
              const isAchieved = currentStreak >= milestone.days;
              const isCurrent = currentMilestone?.days === milestone.days;
              const color = colorClasses[milestone.color];
              
              return (
                <div
                  key={milestone.days}
                  className={cn(
                    "shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all",
                    isAchieved ? color.bg : "bg-muted/30",
                    isCurrent && "ring-2 ring-offset-2 ring-offset-background",
                    isCurrent && color.border.replace('border', 'ring')
                  )}
                >
                  <MilestoneIcon className={cn(
                    "h-4 w-4",
                    isAchieved ? color.text : "text-muted-foreground/50"
                  )} />
                  <span className={cn(
                    "text-[10px] font-medium",
                    isAchieved ? color.text : "text-muted-foreground/50"
                  )}>
                    {milestone.days}d
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Record Display */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-warning" />
            <span className="text-sm text-muted-foreground">Seu recorde</span>
          </div>
          <span className="text-lg font-bold text-warning">{longestStreak} dias</span>
        </div>
      </CardContent>
    </Card>
  );
}
