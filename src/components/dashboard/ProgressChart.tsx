import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const data = [
  { day: 'Seg', horas: 2.5, meta: 3 },
  { day: 'Ter', horas: 3.2, meta: 3 },
  { day: 'Qua', horas: 2.8, meta: 3 },
  { day: 'Qui', horas: 4.1, meta: 3 },
  { day: 'Sex', horas: 3.5, meta: 3 },
  { day: 'Sáb', horas: 5.2, meta: 3 },
  { day: 'Dom', horas: 1.5, meta: 3 },
];

export function ProgressChart() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Horas de Estudo - Semana Atual</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHoras" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                className="text-muted-foreground text-xs"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-muted-foreground text-xs"
                tickFormatter={(value) => `${value}h`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-lg)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Area
                type="monotone"
                dataKey="meta"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="none"
                name="Meta"
              />
              <Area
                type="monotone"
                dataKey="horas"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorHoras)"
                name="Horas Estudadas"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
