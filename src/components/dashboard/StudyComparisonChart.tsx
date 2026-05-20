import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, Timer, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface ComparisonData {
  day: string;
  focusMinutes: number;
  courseHours: number;
}

export function StudyComparisonChart() {
  const [data, setData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchComparisonData();
    }
  }, [user]);

  const fetchComparisonData = async () => {
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

      // Get focus sessions
      const { data: sessions } = await supabase
        .from('focus_sessions')
        .select('duration_minutes, completed_at')
        .eq('user_id', user.id)
        .eq('session_type', 'work')
        .gte('completed_at', startOfWeek.toISOString())
        .lte('completed_at', endOfWeek.toISOString());

      // Get daily study progress
      const { data: progress } = await supabase
        .from('daily_study_progress')
        .select('hours_studied, study_date')
        .eq('user_id', user.id)
        .gte('study_date', startOfWeek.toISOString().split('T')[0])
        .lte('study_date', endOfWeek.toISOString().split('T')[0]);

      const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

      const weekData: ComparisonData[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        const focusMins = (sessions || [])
          .filter(s => s.completed_at.startsWith(dateStr))
          .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

        const courseHrs = (progress || [])
          .filter(p => p.study_date === dateStr)
          .reduce((sum, p) => sum + (Number(p.hours_studied) || 0), 0);

        weekData.push({
          day: dayNames[i],
          focusMinutes: Math.round(focusMins / 60 * 10) / 10, // Convert to hours
          courseHours: Math.round(courseHrs * 10) / 10,
        });
      }

      setData(weekData);
    } catch (error) {
      console.error('Error fetching comparison data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="card-elevated col-span-2">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated col-span-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Foco vs Horas de Curso (Semanal)
          </CardTitle>
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(24, 95%, 53%)' }} />
              <span className="text-xs text-muted-foreground">Foco (Pomodoro)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--primary))' }} />
              <span className="text-xs text-muted-foreground">Cursos</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="20%">
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(value) => `${value}h`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold mb-2">{label}</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <Timer className="h-3 w-3 text-orange-500" />
                            <span>Foco:</span>
                            <span className="font-mono font-bold">{payload[0]?.value}h</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <BookOpen className="h-3 w-3 text-primary" />
                            <span>Cursos:</span>
                            <span className="font-mono font-bold">{payload[1]?.value}h</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="focusMinutes" 
                fill="hsl(24, 95%, 53%)" 
                radius={[4, 4, 0, 0]} 
                name="Foco"
              />
              <Bar 
                dataKey="courseHours" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]} 
                name="Cursos"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
