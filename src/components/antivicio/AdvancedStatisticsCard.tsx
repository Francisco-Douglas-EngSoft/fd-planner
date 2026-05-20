import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Calendar,
  Clock,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface WeeklyStats {
  impulses: number;
  resistances: number;
  relapses: number;
  avgSelfControl: number;
}

interface TrendData {
  current: WeeklyStats;
  previous: WeeklyStats;
  percentChange: {
    impulses: number;
    resistances: number;
    relapses: number;
    selfControl: number;
  };
}

export function AdvancedStatisticsCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<TrendData | null>(null);
  const [bestDay, setBestDay] = useState<string | null>(null);
  const [worstTime, setWorstTime] = useState<string | null>(null);
  const [streakPrediction, setStreakPrediction] = useState<number>(0);

  useEffect(() => {
    if (user) {
      fetchAdvancedStats();
    }
  }, [user]);

  const fetchAdvancedStats = async () => {
    if (!user) return;

    try {
      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const lastWeekStart = subDays(thisWeekStart, 7);
      const lastWeekEnd = subDays(thisWeekStart, 1);

      // Fetch this week's data
      const { data: thisWeekData } = await supabase
        .from('addiction_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_date', format(thisWeekStart, 'yyyy-MM-dd'))
        .lte('check_date', format(now, 'yyyy-MM-dd'));

      // Fetch last week's data
      const { data: lastWeekData } = await supabase
        .from('addiction_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('check_date', format(lastWeekStart, 'yyyy-MM-dd'))
        .lte('check_date', format(lastWeekEnd, 'yyyy-MM-dd'));

      // Fetch impulse logs for time analysis
      const { data: impulseLogs } = await supabase
        .from('impulse_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', format(startOfMonth(now), 'yyyy-MM-dd'));

      // Calculate stats
      const calculateStats = (data: typeof thisWeekData): WeeklyStats => {
        if (!data || data.length === 0) {
          return { impulses: 0, resistances: 0, relapses: 0, avgSelfControl: 5 };
        }
        return {
          impulses: data.reduce((sum, d) => sum + (d.impulses_count || 0), 0),
          resistances: data.reduce((sum, d) => sum + (d.resistances_count || 0), 0),
          relapses: data.reduce((sum, d) => sum + (d.relapses_count || 0), 0),
          avgSelfControl: data.reduce((sum, d) => sum + (d.self_control_score || 5), 0) / data.length,
        };
      };

      const current = calculateStats(thisWeekData);
      const previous = calculateStats(lastWeekData);

      const calculateChange = (curr: number, prev: number) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return Math.round(((curr - prev) / prev) * 100);
      };

      setTrend({
        current,
        previous,
        percentChange: {
          impulses: calculateChange(current.impulses, previous.impulses),
          resistances: calculateChange(current.resistances, previous.resistances),
          relapses: calculateChange(current.relapses, previous.relapses),
          selfControl: calculateChange(current.avgSelfControl, previous.avgSelfControl),
        },
      });

      // Analyze best day (most resistances, least relapses)
      if (thisWeekData && thisWeekData.length > 0) {
        const sortedDays = [...thisWeekData].sort((a, b) => {
          const scoreA = (a.resistances_count || 0) - (a.relapses_count || 0);
          const scoreB = (b.resistances_count || 0) - (b.relapses_count || 0);
          return scoreB - scoreA;
        });
        if (sortedDays[0]) {
          setBestDay(format(new Date(sortedDays[0].check_date), 'EEEE', { locale: ptBR }));
        }
      }

      // Analyze worst time (most impulses by hour)
      if (impulseLogs && impulseLogs.length > 0) {
        const hourCounts: Record<number, number> = {};
        impulseLogs.forEach(log => {
          const hour = new Date(log.created_at).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });
        
        const worstHour = Object.entries(hourCounts)
          .sort(([, a], [, b]) => b - a)[0];
        
        if (worstHour) {
          const hour = parseInt(worstHour[0]);
          setWorstTime(`${hour}h - ${hour + 1}h`);
        }
      }

      // Calculate streak prediction based on current trend
      const { data: streakData } = await supabase
        .from('clean_streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', user.id);

      if (streakData && streakData.length > 0) {
        const avgStreak = streakData.reduce((sum, s) => sum + s.current_streak, 0) / streakData.length;
        const resistanceRate = current.impulses > 0 
          ? (current.resistances / current.impulses) 
          : 1;
        
        // Simple prediction: current streak * resistance rate * trend factor
        const trendFactor = current.avgSelfControl >= previous.avgSelfControl ? 1.2 : 0.8;
        setStreakPrediction(Math.round(avgStreak * resistanceRate * trendFactor));
      }

    } catch (error) {
      console.error('Error fetching advanced stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const StatItem = ({ 
    label, 
    value, 
    change, 
    isPositiveGood = true,
    icon: Icon 
  }: { 
    label: string; 
    value: number | string; 
    change: number;
    isPositiveGood?: boolean;
    icon: React.ElementType;
  }) => {
    const isPositiveChange = change > 0;
    const isGood = isPositiveGood ? !isPositiveChange : isPositiveChange;

    return (
      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">{value}</span>
          {change !== 0 && (
            <Badge 
              variant="secondary"
              className={isGood ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
            >
              {isPositiveChange ? (
                <ArrowUpRight className="h-3 w-3 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-1" />
              )}
              {Math.abs(change)}%
            </Badge>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-xl overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-success" />
      
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          Estatísticas Avançadas
          <Badge variant="outline" className="ml-auto text-xs">
            Esta Semana
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Weekly Comparison Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatItem 
            label="Impulsos" 
            value={trend?.current.impulses || 0}
            change={trend?.percentChange.impulses || 0}
            isPositiveGood={false}
            icon={Zap}
          />
          <StatItem 
            label="Resistências" 
            value={trend?.current.resistances || 0}
            change={trend?.percentChange.resistances || 0}
            isPositiveGood={true}
            icon={Target}
          />
          <StatItem 
            label="Recaídas" 
            value={trend?.current.relapses || 0}
            change={trend?.percentChange.relapses || 0}
            isPositiveGood={false}
            icon={TrendingDown}
          />
          <StatItem 
            label="Autocontrole" 
            value={trend?.current.avgSelfControl.toFixed(1) || '5.0'}
            change={trend?.percentChange.selfControl || 0}
            isPositiveGood={true}
            icon={TrendingUp}
          />
        </div>

        {/* Insights Section */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Insights
          </h4>
          
          <div className="grid gap-3">
            {bestDay && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-success/5 border border-success/20"
              >
                <div className="p-2 rounded-lg bg-success/10">
                  <Calendar className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium">Melhor dia da semana</p>
                  <p className="text-xs text-muted-foreground capitalize">{bestDay}</p>
                </div>
              </motion.div>
            )}

            {worstTime && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-warning/5 border border-warning/20"
              >
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium">Horário mais crítico</p>
                  <p className="text-xs text-muted-foreground">{worstTime}</p>
                </div>
              </motion.div>
            )}

            {streakPrediction > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20"
              >
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Previsão de sequência</p>
                  <p className="text-xs text-muted-foreground">
                    ~{streakPrediction} dias mantendo o ritmo atual
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Resistance Rate Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Taxa de Resistência Semanal</span>
            <span className="text-sm font-bold">
              {trend?.current.impulses ? 
                Math.round((trend.current.resistances / trend.current.impulses) * 100) : 100}%
            </span>
          </div>
          <Progress 
            value={trend?.current.impulses ? 
              (trend.current.resistances / trend.current.impulses) * 100 : 100} 
            className="h-3"
          />
        </div>
      </CardContent>
    </Card>
  );
}
