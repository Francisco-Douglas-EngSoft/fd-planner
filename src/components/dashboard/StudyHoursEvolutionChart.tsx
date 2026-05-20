import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DailyProgress {
  date: string;
  hours: number;
  cumulativeHours: number;
}

export function StudyHoursEvolutionChart() {
  const [data, setData] = useState<DailyProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    setIsLoading(true);

    // Get focus sessions from the last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30);
    
    const { data: sessions, error } = await supabase
      .from('focus_sessions')
      .select('completed_at, duration_minutes')
      .eq('user_id', user.id)
      .eq('session_type', 'work')
      .gte('completed_at', thirtyDaysAgo.toISOString())
      .order('completed_at', { ascending: true });

    if (error) {
      console.error('Error fetching sessions:', error);
      setIsLoading(false);
      return;
    }

    // Group by day and calculate cumulative
    const dailyMap = new Map<string, number>();
    
    // Initialize all days in the range
    for (let i = 30; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      dailyMap.set(date, 0);
    }

    // Sum hours per day
    sessions?.forEach(session => {
      const date = format(parseISO(session.completed_at), 'yyyy-MM-dd');
      const hours = (session.duration_minutes || 0) / 60;
      dailyMap.set(date, (dailyMap.get(date) || 0) + hours);
    });

    // Convert to array with cumulative hours
    let cumulative = 0;
    const chartData: DailyProgress[] = [];
    
    const sortedDates = Array.from(dailyMap.keys()).sort();
    sortedDates.forEach(date => {
      const hours = dailyMap.get(date) || 0;
      cumulative += hours;
      chartData.push({
        date,
        hours: Math.round(hours * 100) / 100,
        cumulativeHours: Math.round(cumulative * 100) / 100,
      });
    });

    setData(chartData);
    setIsLoading(false);
  };

  const formatXAxis = (value: string) => {
    try {
      return format(parseISO(value), 'dd/MM', { locale: ptBR });
    } catch {
      return value;
    }
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload?: { hours?: number }; value?: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-1">
            {format(parseISO(label), "dd 'de' MMMM", { locale: ptBR })}
          </p>
          <p className="text-xs text-muted-foreground">
            Horas no dia: <span className="font-medium text-primary">{payload[0]?.payload?.hours?.toFixed(1)}h</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Total acumulado: <span className="font-medium text-green-500">{payload[0]?.value?.toFixed(1)}h</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução de Horas Estudadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalHours = data.length > 0 ? data[data.length - 1].cumulativeHours : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução de Horas Estudadas
          </CardTitle>
          <span className="text-sm text-muted-foreground">
            Últimos 30 dias: <span className="font-bold text-foreground">{totalHours.toFixed(1)}h</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxis}
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                interval="preserveStartEnd"
              />
              <YAxis 
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                tickFormatter={(value) => `${value}h`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulativeHours"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorHours)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}