import { useState, useEffect } from 'react';
import { Shield, Heart, Brain, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AntiVicioStatsData {
  currentStreak: number;
  longestStreak: number;
  totalResisted: number;
  totalRelapses: number;
  avgSelfControl: number;
  resistanceRate: number;
}

export function AntiVicioStats() {
  const [stats, setStats] = useState<AntiVicioStatsData>({
    currentStreak: 0,
    longestStreak: 0,
    totalResisted: 0,
    totalRelapses: 0,
    avgSelfControl: 0,
    resistanceRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    try {
      const [streaksResult, checkinsResult, impulsesResult, relapsesResult] = await Promise.all([
        supabase
          .from('clean_streaks')
          .select('current_streak, longest_streak')
          .eq('user_id', user.id),
        supabase
          .from('addiction_checkins')
          .select('self_control_score, resistances_count, impulses_count')
          .eq('user_id', user.id),
        supabase
          .from('impulse_logs')
          .select('resisted')
          .eq('user_id', user.id),
        supabase
          .from('relapses')
          .select('id', { count: 'exact' })
          .eq('user_id', user.id),
      ]);

      const streaks = streaksResult.data || [];
      const checkins = checkinsResult.data || [];
      const impulses = impulsesResult.data || [];
      const relapsesCount = relapsesResult.count || 0;

      // Calculate max current streak and longest streak
      const maxCurrentStreak = Math.max(0, ...streaks.map(s => s.current_streak || 0));
      const maxLongestStreak = Math.max(0, ...streaks.map(s => s.longest_streak || 0));

      // Calculate average self control from checkins
      const avgSelfControl = checkins.length > 0
        ? checkins.reduce((sum, c) => sum + (c.self_control_score || 5), 0) / checkins.length
        : 5;

      // Calculate total resisted from impulse logs
      const totalResisted = impulses.filter(i => i.resisted).length;
      const totalImpulses = impulses.length;
      const resistanceRate = totalImpulses > 0 ? (totalResisted / totalImpulses) * 100 : 0;

      setStats({
        currentStreak: maxCurrentStreak,
        longestStreak: maxLongestStreak,
        totalResisted,
        totalRelapses: relapsesCount,
        avgSelfControl: Math.round(avgSelfControl * 10) / 10,
        resistanceRate: Math.round(resistanceRate),
      });
    } catch (error) {
      console.error('Error fetching AntiVício stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            AntiVício
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-muted rounded-lg" />
            <div className="h-16 bg-muted rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const statItems = [
    {
      label: 'Sequência Atual',
      value: `${stats.currentStreak} dias`,
      sublabel: `Recorde: ${stats.longestStreak} dias`,
      icon: Shield,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: 'Impulsos Resistidos',
      value: stats.totalResisted,
      sublabel: `Taxa: ${stats.resistanceRate}%`,
      icon: Heart,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      label: 'Autocontrole Médio',
      value: `${stats.avgSelfControl}/10`,
      sublabel: 'Baseado nos check-ins',
      icon: Brain,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Recaídas Totais',
      value: stats.totalRelapses,
      sublabel: 'Continue forte!',
      icon: TrendingUp,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <Link to="/antivicio" className="hover:opacity-80 transition-opacity">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            AntiVício
            <span className="text-xs text-muted-foreground font-normal ml-auto">Ver mais →</span>
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg",
                  item.bgColor
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn("h-4 w-4", item.color)} />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
                <p className="text-lg font-bold">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.sublabel}</p>
              </div>
            );
          })}
        </div>

        {/* Self Control Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Nível de Autocontrole</span>
            <span className="font-medium">{stats.avgSelfControl}/10</span>
          </div>
          <Progress 
            value={stats.avgSelfControl * 10} 
            className="h-2"
          />
        </div>
      </CardContent>
    </Card>
  );
}
