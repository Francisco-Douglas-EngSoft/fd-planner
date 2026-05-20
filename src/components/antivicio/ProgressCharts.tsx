import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, subWeeks, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface CheckinData {
  check_date: string;
  self_control_score: number | null;
  impulses_count: number | null;
  resistances_count: number | null;
  relapses_count: number | null;
}

interface WeeklyData {
  week: string;
  avgSelfControl: number;
  totalImpulses: number;
  totalResistances: number;
  totalRelapses: number;
  resistanceRate: number;
}

interface DailyData {
  date: string;
  day: string;
  selfControl: number;
  impulses: number;
  resistances: number;
  relapses: number;
}

export function ProgressCharts() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);

  useEffect(() => {
    if (user) {
      fetchCheckinData();
    }
  }, [user]);

  const fetchCheckinData = async () => {
    try {
      setLoading(true);
      
      // Fetch last 8 weeks of checkins
      const startDate = format(subWeeks(new Date(), 8), 'yyyy-MM-dd');
      
      const { data, error } = await supabase
        .from('addiction_checkins')
        .select('check_date, self_control_score, impulses_count, resistances_count, relapses_count')
        .eq('user_id', user?.id)
        .gte('check_date', startDate)
        .order('check_date', { ascending: true });

      if (error) throw error;

      if (data) {
        processData(data);
      }
    } catch (error) {
      console.error('Error fetching checkin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processData = (checkins: CheckinData[]) => {
    // Process daily data (last 14 days)
    const last14Days = eachDayOfInterval({
      start: subDays(new Date(), 13),
      end: new Date()
    });

    const daily: DailyData[] = last14Days.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const checkin = checkins.find(c => c.check_date === dateStr);
      
      return {
        date: dateStr,
        day: format(date, 'dd/MM', { locale: ptBR }),
        selfControl: checkin?.self_control_score ?? 0,
        impulses: checkin?.impulses_count ?? 0,
        resistances: checkin?.resistances_count ?? 0,
        relapses: checkin?.relapses_count ?? 0
      };
    });

    setDailyData(daily);

    // Process weekly data (last 8 weeks)
    const weeks: WeeklyData[] = [];
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
      
      const weekCheckins = checkins.filter(c => {
        const checkDate = parseISO(c.check_date);
        return isWithinInterval(checkDate, { start: weekStart, end: weekEnd });
      });

      const totalImpulses = weekCheckins.reduce((sum, c) => sum + (c.impulses_count || 0), 0);
      const totalResistances = weekCheckins.reduce((sum, c) => sum + (c.resistances_count || 0), 0);
      const totalRelapses = weekCheckins.reduce((sum, c) => sum + (c.relapses_count || 0), 0);
      
      const avgSelfControl = weekCheckins.length > 0
        ? weekCheckins.reduce((sum, c) => sum + (c.self_control_score || 0), 0) / weekCheckins.length
        : 0;

      const resistanceRate = totalImpulses > 0 
        ? Math.round((totalResistances / totalImpulses) * 100)
        : 100;

      weeks.push({
        week: format(weekStart, 'dd/MM', { locale: ptBR }),
        avgSelfControl: Math.round(avgSelfControl * 10) / 10,
        totalImpulses,
        totalResistances,
        totalRelapses,
        resistanceRate
      });
    }

    setWeeklyData(weeks);
  };

  type TooltipPayload = { name: string; value: number; color?: string }[];
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TooltipPayload; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="card-elevated">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Carregando gráficos...</p>
        </CardContent>
      </Card>
    );
  }

  const hasData = dailyData.some(d => d.selfControl > 0 || d.impulses > 0);

  if (!hasData) {
    return (
      <Card className="card-elevated">
        <CardContent className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Ainda não há dados suficientes para gerar gráficos.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Continue fazendo check-ins diários para acompanhar sua evolução.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="selfControl" className="space-y-4">
        <TabsList className="w-full grid grid-cols-3 gap-1">
          <TabsTrigger value="selfControl" className="text-xs sm:text-sm">
            Autocontrole
          </TabsTrigger>
          <TabsTrigger value="impulses" className="text-xs sm:text-sm">
            Impulsos
          </TabsTrigger>
          <TabsTrigger value="weekly" className="text-xs sm:text-sm">
            Semanal
          </TabsTrigger>
        </TabsList>

        {/* Self Control Evolution */}
        <TabsContent value="selfControl">
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Evolução do Autocontrole
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Score de autocontrole dos últimos 14 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSelfControl" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false}
                      tickLine={false}
                      className="text-muted-foreground"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      className="text-muted-foreground"
                      tick={{ fontSize: 10 }}
                      domain={[0, 10]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="selfControl"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSelfControl)"
                      name="Autocontrole"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Impulses vs Resistances */}
        <TabsContent value="impulses">
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Impulsos vs Resistências
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Comparação dos últimos 14 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false}
                      tickLine={false}
                      className="text-muted-foreground"
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      className="text-muted-foreground"
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px' }}
                      iconType="circle"
                    />
                    <Bar 
                      dataKey="impulses" 
                      fill="hsl(var(--chart-4))" 
                      name="Impulsos"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="resistances" 
                      fill="hsl(var(--chart-2))" 
                      name="Resistências"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="relapses" 
                      fill="hsl(var(--destructive))" 
                      name="Recaídas"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly Overview */}
        <TabsContent value="weekly">
          <Card className="card-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Evolução Semanal
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Taxa de resistência e autocontrole médio por semana
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="week" 
                      axisLine={false}
                      tickLine={false}
                      className="text-muted-foreground"
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      className="text-muted-foreground"
                      tick={{ fontSize: 10 }}
                      domain={[0, 10]}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      className="text-muted-foreground"
                      tick={{ fontSize: 10 }}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      wrapperStyle={{ fontSize: '12px' }}
                      iconType="line"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="avgSelfControl"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-1))', strokeWidth: 2 }}
                      name="Autocontrole Médio"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="resistanceRate"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2 }}
                      name="Taxa de Resistência (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Weekly Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Semana Atual</p>
                  <p className="text-lg font-bold text-primary">
                    {weeklyData[weeklyData.length - 1]?.avgSelfControl || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">autocontrole</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Taxa Resistência</p>
                  <p className="text-lg font-bold text-success">
                    {weeklyData[weeklyData.length - 1]?.resistanceRate || 0}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">esta semana</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Impulsos</p>
                  <p className="text-lg font-bold text-warning">
                    {weeklyData[weeklyData.length - 1]?.totalImpulses || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">esta semana</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">Recaídas</p>
                  <p className="text-lg font-bold text-destructive">
                    {weeklyData[weeklyData.length - 1]?.totalRelapses || 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">esta semana</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
