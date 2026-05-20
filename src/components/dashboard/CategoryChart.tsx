import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, FolderOpen } from 'lucide-react';

interface CategoryData {
  name: string;
  value: number;
  hours: number;
  color: string;
}

const COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(262, 83%, 58%)',
  'hsl(38, 92%, 50%)',
  'hsl(340, 82%, 52%)',
  'hsl(200, 89%, 48%)',
  'hsl(24, 95%, 53%)',
  'hsl(280, 68%, 60%)',
];

type ChartPayloadEntry = { name: string; value: number; color?: string; payload: { name: string; value: number; color?: string; percentage?: number; hours?: number } };
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: ChartPayloadEntry[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-foreground">{data.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: data.color }}
          />
          <span className="text-sm text-muted-foreground">
            {data.value}% {data.hours ? `(${data.hours.toFixed(1)}h)` : ''}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: { payload?: ChartPayloadEntry[] }) => {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
      {payload?.map((entry, index: number) => (
        <div key={`legend-${index}`} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground font-medium">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export function CategoryChart() {
  const { user } = useAuth();
  const [data, setData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalHours, setTotalHours] = useState(0);

  useEffect(() => {
    if (user) {
      fetchCategoryData();
    }
  }, [user]);

  const fetchCategoryData = async () => {
    try {
      const { data: courses, error } = await supabase
        .from('courses')
        .select('category, completed_hours')
        .eq('user_id', user?.id);

      if (error) throw error;

      // Group by category
      const categoryMap: Record<string, number> = {};
      let total = 0;

      courses?.forEach((course) => {
        const category = course.category || 'Sem Categoria';
        const hours = Number(course.completed_hours) || 0;
        categoryMap[category] = (categoryMap[category] || 0) + hours;
        total += hours;
      });

      setTotalHours(total);

      // Convert to chart data
      const chartData: CategoryData[] = Object.entries(categoryMap)
        .filter(([_, hours]) => hours > 0)
        .map(([name, hours], index) => ({
          name,
          value: total > 0 ? Math.round((hours / total) * 100) : 0,
          hours,
          color: COLORS[index % COLORS.length],
        }))
        .sort((a, b) => b.value - a.value);

      setData(chartData);
    } catch (error) {
      console.error('Error fetching category data:', error);
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
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Distribuição por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex flex-col items-center justify-center text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma hora estudada ainda</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Complete módulos para ver sua distribuição
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Distribuição por Categoria
          </CardTitle>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {totalHours.toFixed(1)}h total
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <defs>
                {data.map((entry, index) => (
                  <linearGradient
                    key={`gradient-${index}`}
                    id={`gradient-${index}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                    <stop offset="100%" stopColor={entry.color} stopOpacity={0.7} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={2}
                stroke="hsl(var(--background))"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#gradient-${index})`}
                    className="transition-all duration-300 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {data.slice(0, 4).map((item, index) => (
            <div 
              key={item.name}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              <div 
                className="w-2 h-8 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.hours.toFixed(1)}h ({item.value}%)
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
