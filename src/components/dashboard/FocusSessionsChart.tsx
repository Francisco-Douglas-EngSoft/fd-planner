import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Timer, Target, TrendingUp, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface DayStats {
  day: string;
  shortDay: string;
  minutes: number;
  sessions: number;
  isToday: boolean;
}

export function FocusSessionsChart() {
  const [weekData, setWeekData] = useState<DayStats[]>([]);
  const [totals, setTotals] = useState({
    totalMinutes: 0,
    totalSessions: 0,
    avgPerSession: 0,
    longestSession: 0,
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchFocusStats();
    }
  }, [user]);

  const fetchFocusStats = async () => {
    if (!user) return;

    try {
      const today = new Date();
      const dayOfWeek = today.getDay();
      const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(today.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('duration_minutes, completed_at, session_type')
        .eq('user_id', user.id)
        .eq('session_type', 'work')
        .gte('completed_at', startOfWeek.toISOString())
        .lte('completed_at', endOfWeek.toISOString());

      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const fullDayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);

      const weekStats: DayStats[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dayIndex = date.getDay();
        const isToday = date.getTime() === todayDate.getTime();
        
        weekStats.push({
          day: fullDayNames[dayIndex],
          shortDay: dayNames[dayIndex],
          minutes: 0,
          sessions: 0,
          isToday,
        });
      }

      let totalMins = 0;
      let totalSess = 0;
      let maxSession = 0;

      if (sessions) {
        sessions.forEach(session => {
          const sessionDate = new Date(session.completed_at);
          const startOfWeekTime = new Date(startOfWeek).getTime();
          const dayDiff = Math.floor((sessionDate.getTime() - startOfWeekTime) / (1000 * 60 * 60 * 24));
          if (dayDiff >= 0 && dayDiff < 7) {
            weekStats[dayDiff].minutes += session.duration_minutes;
            weekStats[dayDiff].sessions += 1;
          }
          totalMins += session.duration_minutes;
          totalSess += 1;
          if (session.duration_minutes > maxSession) {
            maxSession = session.duration_minutes;
          }
        });
      }

      setWeekData(weekStats);
      setTotals({
        totalMinutes: totalMins,
        totalSessions: totalSess,
        avgPerSession: totalSess > 0 ? Math.round(totalMins / totalSess) : 0,
        longestSession: maxSession,
      });
    } catch (error) {
      console.error('Error fetching focus stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min`;
  };

  if (loading) {
    return (
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Timer className="h-5 w-5 text-orange-500" />
          Sessões de Foco (Pomodoro)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-lg bg-orange-500/10 text-center">
            <Timer className="h-4 w-4 mx-auto mb-1 text-orange-500" />
            <p className="text-[10px] text-muted-foreground">Total Foco</p>
            <p className="font-bold text-orange-500 text-sm">{formatTime(totals.totalMinutes)}</p>
          </div>
          <div className="p-3 rounded-lg bg-blue-500/10 text-center">
            <Target className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-[10px] text-muted-foreground">Sessões</p>
            <p className="font-bold text-blue-500 text-sm">{totals.totalSessions}</p>
          </div>
          <div className="p-3 rounded-lg bg-green-500/10 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-[10px] text-muted-foreground">Média/Sessão</p>
            <p className="font-bold text-green-500 text-sm">{formatTime(totals.avgPerSession)}</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/10 text-center">
            <Zap className="h-4 w-4 mx-auto mb-1 text-purple-500" />
            <p className="text-[10px] text-muted-foreground">Mais Longa</p>
            <p className="font-bold text-purple-500 text-sm">{formatTime(totals.longestSession)}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} barCategoryGap="15%">
              <XAxis
                dataKey="shortDay"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <YAxis hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as DayStats;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                        <p className="font-medium text-sm">{data.day}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(data.minutes)} • {data.sessions} sessões
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                {weekData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isToday ? 'hsl(24, 95%, 53%)' : 'hsl(24, 95%, 53%, 0.4)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
