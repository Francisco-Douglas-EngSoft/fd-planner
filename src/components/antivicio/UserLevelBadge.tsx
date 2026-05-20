import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Shield,
  Target,
  Flame,
  Brain,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserLevel {
  level: 'beginner' | 'intermediate' | 'critical';
  score: number;
  streakDays: number;
  resistanceRate: number;
  relapsesThisMonth: number;
}

interface UserLevelBadgeProps {
  profile: {
    dependency_level: number;
    study_impact_level: number;
  } | null;
  streaks: { current_streak: number; longest_streak: number }[];
  todayCheckin: { 
    impulses_count: number;
    resistances_count: number;
    relapses_count: number;
  } | null;
  totalRelapses?: number;
}

export function UserLevelBadge({ profile, streaks, todayCheckin, totalRelapses = 0 }: UserLevelBadgeProps) {
  const calculateLevel = (): UserLevel => {
    // Get minimum streak (most challenging addiction)
    const minStreak = streaks.length > 0 
      ? Math.min(...streaks.map(s => s.current_streak)) 
      : 0;

    // Calculate resistance rate
    const resistanceRate = todayCheckin?.impulses_count 
      ? Math.round((todayCheckin.resistances_count / todayCheckin.impulses_count) * 100)
      : 100;

    // Calculate score (0-100)
    let score = 0;
    
    // Streak contribution (40 points max)
    score += Math.min(minStreak * 2, 40);
    
    // Resistance rate contribution (30 points max)
    score += (resistanceRate / 100) * 30;
    
    // Dependency level inverse contribution (15 points max)
    const dependencyScore = profile?.dependency_level || 5;
    score += (10 - dependencyScore) * 1.5;
    
    // Low relapses contribution (15 points max)
    const relapseScore = Math.max(0, 15 - (totalRelapses * 3));
    score += relapseScore;

    // Determine level based on score
    let level: 'beginner' | 'intermediate' | 'critical';
    if (score >= 60) {
      level = 'intermediate';
    } else if (score >= 30) {
      level = 'beginner';
    } else {
      level = 'critical';
    }

    // Override to critical if dependency is very high
    if ((profile?.dependency_level || 0) >= 8 && minStreak < 7) {
      level = 'critical';
    }

    return {
      level,
      score: Math.round(score),
      streakDays: minStreak,
      resistanceRate,
      relapsesThisMonth: totalRelapses,
    };
  };

  const userLevel = calculateLevel();

  const levelConfig = {
    beginner: {
      label: 'Iniciante',
      description: 'Construindo disciplina básica',
      color: 'primary',
      bgColor: 'bg-primary/10',
      textColor: 'text-primary',
      borderColor: 'border-primary/20',
      icon: Target,
      tips: [
        'Foque em manter sequências curtas (3-7 dias)',
        'Use o protocolo de emergência sempre que precisar',
        'Celebre cada pequena vitória',
      ],
    },
    intermediate: {
      label: 'Intermediário',
      description: 'Desenvolvendo consistência',
      color: 'success',
      bgColor: 'bg-success/10',
      textColor: 'text-success',
      borderColor: 'border-success/20',
      icon: Award,
      tips: [
        'Expanda suas sequências para 14-30 dias',
        'Identifique e elimine gatilhos ambientais',
        'Pratique técnicas de prevenção proativa',
      ],
    },
    critical: {
      label: 'Atenção Especial',
      description: 'Fase de recuperação intensiva',
      color: 'destructive',
      bgColor: 'bg-destructive/10',
      textColor: 'text-destructive',
      borderColor: 'border-destructive/20',
      icon: AlertTriangle,
      tips: [
        'Não se julgue - recaídas são parte do processo',
        'Use o protocolo de emergência ANTES do impulso crescer',
        'Busque apoio profissional se necessário',
        'Foque em um dia de cada vez',
      ],
    },
  };

  const config = levelConfig[userLevel.level];
  const LevelIcon = config.icon;

  return (
    <Card className={cn("overflow-hidden", config.borderColor, "border-2")}>
      <CardHeader className={cn("pb-3", config.bgColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2.5 rounded-xl", config.bgColor)}>
              <LevelIcon className={cn("h-5 w-5", config.textColor)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{config.label}</CardTitle>
                <Badge variant="outline" className={cn("text-xs", config.textColor, config.borderColor)}>
                  {userLevel.score}/100
                </Badge>
              </div>
              <CardDescription className="text-xs">{config.description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className="flex items-center justify-center gap-1">
              <Flame className="h-3.5 w-3.5 text-primary" />
              <span className="font-bold text-lg">{userLevel.streakDays}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Dias</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className="flex items-center justify-center gap-1">
              <Shield className="h-3.5 w-3.5 text-success" />
              <span className="font-bold text-lg">{userLevel.resistanceRate}%</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Resistência</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <div className="flex items-center justify-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              <span className="font-bold text-lg">{userLevel.relapsesThisMonth}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Recaídas</p>
          </div>
        </div>

        {/* Progress to next level */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progresso geral</span>
            <span className={config.textColor}>{userLevel.score}%</span>
          </div>
          <Progress value={userLevel.score} className="h-2" />
        </div>

        {/* Tips */}
        <div className="space-y-2">
          <p className="text-xs font-medium flex items-center gap-1">
            <Brain className="h-3.5 w-3.5 text-primary" />
            Dicas para seu nível:
          </p>
          <ul className="space-y-1.5">
            {config.tips.map((tip, index) => (
              <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className={cn("shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold", config.bgColor, config.textColor)}>
                  {index + 1}
                </span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
