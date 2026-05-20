import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Target, TrendingUp, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

interface DayStats {
  day: string;
  shortDay: string;
  minutes: number;
  sessions: number;
  isToday: boolean;
}

export function WeeklyStats() {
  const [weekData, setWeekData] = useState<DayStats[]>([]);
  const [totals, setTotals] = useState({
    totalMinutes: 0,
    totalSessions: 0,
    avgPerDay: 0,
    bestDay: '',
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchWeeklyStats();
    }
  }, [user]);

  const fetchWeeklyStats = async () => {
    if (!user) return;

    // Get start of current week (Monday)
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
      .select('duration_minutes, completed_at')
      .eq('user_id', user.id)
      .eq('session_type', 'work')
      .gte('completed_at', startOfWeek.toISOString())
      .lte('completed_at', endOfWeek.toISOString());

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const fullDayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    // Initialize week data starting from Monday
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

    // Aggregate sessions by day
    if (sessions) {
      sessions.forEach(session => {
        const sessionDate = new Date(session.completed_at);
        const dayDiff = Math.floor((sessionDate.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff >= 0 && dayDiff < 7) {
          weekStats[dayDiff].minutes += session.duration_minutes;
          weekStats[dayDiff].sessions += 1;
        }
      });
    }

    // Calculate totals
    let totalMins = 0;
    let totalSess = 0;
    let maxMins = 0;
    let bestDayName = '';

    weekStats.forEach(day => {
      totalMins += day.minutes;
      totalSess += day.sessions;
      if (day.minutes > maxMins) {
        maxMins = day.minutes;
        bestDayName = day.day;
      }
    });

    setWeekData(weekStats);
    setTotals({
      totalMinutes: totalMins,
      totalSessions: totalSess,
      avgPerDay: Math.round(totalMins / 7),
      bestDay: bestDayName || '-',
    });
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min`;
  };

  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Produtividade Semanal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-primary/10 text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-bold text-primary">{formatTime(totals.totalMinutes)}</p>
          </div>
          <div className="p-3 rounded-lg bg-accent/10 text-center">
            <Target className="h-4 w-4 mx-auto mb-1 text-accent" />
            <p className="text-xs text-muted-foreground">Sessões</p>
            <p className="font-bold text-accent">{totals.totalSessions}</p>
          </div>
          <div className="p-3 rounded-lg bg-success/10 text-center">
            <TrendingUp className="h-4 w-4 mx-auto mb-1 text-success" />
            <p className="text-xs text-muted-foreground">Média/dia</p>
            <p className="font-bold text-success">{formatTime(totals.avgPerDay)}</p>
          </div>
          <div className="p-3 rounded-lg bg-warning/10 text-center">
            <Calendar className="h-4 w-4 mx-auto mb-1 text-warning" />
            <p className="text-xs text-muted-foreground">Melhor dia</p>
            <p className="font-bold text-warning text-sm">{totals.bestDay}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekData} barCategoryGap="20%">
              <XAxis
                dataKey="shortDay"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis hide />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as DayStats;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                        <p className="font-medium">{data.day}</p>
                        <p className="text-sm text-muted-foreground">
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
                    fill={entry.isToday ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.4)'}
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
