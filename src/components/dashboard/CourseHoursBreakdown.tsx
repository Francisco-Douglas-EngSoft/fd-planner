import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Library, BookOpen } from 'lucide-react';
import { formatHoursToHMS } from '@/lib/timeUtils';

interface CategoryHours {
  name: string;
  totalHours: number;
  completedHours: number;
  coursesCount: number;
  color: string;
  percentage: number;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 71%, 45%)',
  'hsl(262, 83%, 58%)',
  'hsl(38, 92%, 50%)',
  'hsl(340, 82%, 52%)',
  'hsl(200, 89%, 48%)',
];

type TooltipPayloadItem = { payload?: { name: string; totalHours: number; completedHours: number; coursesCount: number } };
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-foreground text-sm">{data.name}</p>
        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">Carga Total:</span>
            <span className="font-mono font-medium">{formatHoursToHMS(data.totalHours)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">Concluído:</span>
            <span className="font-mono font-medium text-green-500">{formatHoursToHMS(data.completedHours)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">Cursos:</span>
            <span className="font-medium">{data.coursesCount}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function CourseHoursBreakdown() {
  const { user } = useAuth();
  const [data, setData] = useState<CategoryHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ total: 0, completed: 0 });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('category, total_hours, completed_hours, status')
        .eq('user_id', user?.id)
        .or('status.eq.pending,status.eq.in_progress');

      if (error) throw error;

      const categoryMap: Record<string, { totalHours: number; completedHours: number; count: number }> = {};
      let grandTotal = 0;
      let grandCompleted = 0;

      courses?.forEach((course) => {
        const category = course.category || 'Sem Categoria';
        const totalHours = Number(course.total_hours) || 0;
        const completedHours = Number(course.completed_hours) || 0;
        
        if (!categoryMap[category]) {
          categoryMap[category] = { totalHours: 0, completedHours: 0, count: 0 };
        }
        categoryMap[category].totalHours += totalHours;
        categoryMap[category].completedHours += completedHours;
        categoryMap[category].count += 1;
        grandTotal += totalHours;
        grandCompleted += completedHours;
      });

      setTotals({ total: grandTotal, completed: grandCompleted });

      const chartData: CategoryHours[] = Object.entries(categoryMap)
        .map(([name, stats], index) => ({
          name: name.length > 12 ? name.substring(0, 12) + '...' : name,
          fullName: name,
          totalHours: stats.totalHours,
          completedHours: stats.completedHours,
          coursesCount: stats.count,
          color: COLORS[index % COLORS.length],
          percentage: grandTotal > 0 ? Math.round((stats.totalHours / grandTotal) * 100) : 0,
        }))
        .sort((a, b) => b.totalHours - a.totalHours)
        .slice(0, 6);

      setData(chartData);
    } catch (error) {
      console.error('Error fetching course hours:', error);
    } finally {
      setLoading(false);
    }
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

  if (data.length === 0) {
    return (
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            Carga Horária por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex flex-col items-center justify-center text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhum curso ativo</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Adicione cursos para ver a distribuição
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            Carga Horária por Categoria
          </CardTitle>
          <div className="text-right">
            <span className="text-xs text-muted-foreground">
              {progressPercentage}% concluído
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary/10 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Carga Total</p>
            <p className="font-mono font-bold text-primary text-sm">
              {formatHoursToHMS(totals.total)}
            </p>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Concluído</p>
            <p className="font-mono font-bold text-green-500 text-sm">
              {formatHoursToHMS(totals.completed)}
            </p>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 0, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={80}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />
              <Bar 
                dataKey="totalHours" 
                radius={[0, 4, 4, 0]}
                maxBarSize={24}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category List */}
        <div className="space-y-2">
          {data.map((item) => (
            <div 
              key={item.name}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-2 h-6 rounded-full shrink-0" 
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.coursesCount} {item.coursesCount === 1 ? 'curso' : 'cursos'}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-mono font-medium">
                  {formatHoursToHMS(item.totalHours)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {item.percentage}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
