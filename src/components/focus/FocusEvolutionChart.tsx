import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface DayPoint {
  label: string;
  hours: number;
  trend: number;
}

const RANGES = [
  { key: 7, label: '7d' },
  { key: 14, label: '14d' },
  { key: 30, label: '30d' },
] as const;

export function FocusEvolutionChart({ refreshKey }: { refreshKey?: number }) {
  const { user } = useAuth();
  const [range, setRange] = useState<number>(14);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DayPoint[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const since = startOfDay(subDays(new Date(), range - 1));
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('duration_minutes, completed_at')
        .eq('user_id', user.id)
        .eq('session_type', 'work')
        .gte('completed_at', since.toISOString());

      const perDay = new Map<string, number>();
      (sessions || []).forEach((s) => {
        const key = (s.completed_at || '').slice(0, 10);
        perDay.set(key, (perDay.get(key) || 0) + (s.duration_minutes || 0));
      });

      const points: DayPoint[] = [];
      for (let i = range - 1; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const key = format(d, 'yyyy-MM-dd');
        const hours = Math.round(((perDay.get(key) || 0) / 60) * 10) / 10;
        points.push({
          label: format(d, range > 14 ? 'dd' : 'dd/MM', { locale: ptBR }),
          hours,
          trend: 0,
        });
      }

      // Média móvel de 3 dias para a linha de evolução
      const withTrend = points.map((p, idx) => {
        const window = points.slice(Math.max(0, idx - 2), idx + 1);
        const avg = window.reduce((sum, w) => sum + w.hours, 0) / window.length;
        return { ...p, trend: Math.round(avg * 10) / 10 };
      });

      if (!cancelled) {
        setData(withTrend);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, range, refreshKey]);

  const totalHours = useMemo(
    () => Math.round(data.reduce((sum, d) => sum + d.hours, 0) * 10) / 10,
    [data]
  );

  return (
    <Card className="rounded-2xl border-border/40">
      <CardHeader className="pb-2 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução de Foco
            <span className="text-xs font-normal text-muted-foreground">· {totalHours}h no período</span>
          </CardTitle>
          <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-1">
            {RANGES.map((r) => (
              <Button
                key={r.key}
                type="button"
                size="sm"
                variant={range === r.key ? 'default' : 'ghost'}
                className="h-7 px-3 text-xs"
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {loading ? (
          <Skeleton className="h-[240px] w-full rounded-xl" />
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={40}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(v) => `${v}h`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-border bg-popover p-3 shadow-lg">
                          <p className="mb-1 text-xs font-semibold">{label}</p>
                          <p className="text-xs text-muted-foreground">
                            Foco: <span className="font-mono font-bold text-foreground">{payload[0]?.payload.hours}h</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Média: <span className="font-mono font-bold text-foreground">{payload[0]?.payload.trend}h</span>
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="hours" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="hsl(var(--chart-2))"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
