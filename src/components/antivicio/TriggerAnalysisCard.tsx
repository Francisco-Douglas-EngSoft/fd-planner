import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Heart, 
  Clock, 
  MapPin,
  Users,
  Smartphone,
  Coffee,
  Moon,
  Sun,
  TrendingUp,
  ChevronRight,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

interface TriggerData {
  trigger: string;
  count: number;
  percentage: number;
  icon: React.ElementType;
  color: string;
}

interface EmotionData {
  emotion: string;
  count: number;
  resistRate: number;
}

const TRIGGER_ICONS: Record<string, { icon: React.ElementType; color: string }> = {
  'Tédio': { icon: Coffee, color: 'text-yellow-500' },
  'Estresse': { icon: Brain, color: 'text-red-500' },
  'Solidão': { icon: Users, color: 'text-blue-500' },
  'Ansiedade': { icon: Heart, color: 'text-pink-500' },
  'Cansaço': { icon: Moon, color: 'text-purple-500' },
  'Antes de dormir': { icon: Moon, color: 'text-indigo-500' },
  'Ao acordar': { icon: Sun, color: 'text-orange-500' },
  'Redes Sociais': { icon: Smartphone, color: 'text-cyan-500' },
  'default': { icon: TrendingUp, color: 'text-muted-foreground' },
};

const EMOTION_LABELS: Record<string, string> = {
  'anxiety': 'Ansiedade',
  'stress': 'Estresse',
  'boredom': 'Tédio',
  'loneliness': 'Solidão',
  'sadness': 'Tristeza',
  'anger': 'Raiva',
  'frustration': 'Frustração',
  'excitement': 'Excitação',
};

export function TriggerAnalysisCard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [triggers, setTriggers] = useState<TriggerData[]>([]);
  const [emotions, setEmotions] = useState<EmotionData[]>([]);
  const [topTimeSlots, setTopTimeSlots] = useState<{ time: string; count: number }[]>([]);

  useEffect(() => {
    if (user) {
      fetchTriggerData();
    }
  }, [user]);

  const fetchTriggerData = async () => {
    if (!user) return;

    try {
      // Fetch impulse logs with triggers (using correct column names from schema)
      const { data: impulseLogs } = await supabase
        .from('impulse_logs')
        .select('trigger_type, trigger_context, resisted, created_at, intensity')
        .eq('user_id', user.id);

      // Fetch addiction profile for associated emotions
      const { data: profile } = await supabase
        .from('addiction_profiles')
        .select('associated_emotions, critical_hours')
        .eq('user_id', user.id)
        .maybeSingle();

      if (impulseLogs) {
        // Analyze triggers
        const triggerCounts: Record<string, number> = {};
        const contextStats: Record<string, { total: number; resisted: number }> = {};
        const hourCounts: Record<number, number> = {};

        impulseLogs.forEach(log => {
          // Count triggers by type
          if (log.trigger_type) {
            triggerCounts[log.trigger_type] = (triggerCounts[log.trigger_type] || 0) + 1;
          }

          // Count context with resist rates
          if (log.trigger_context) {
            if (!contextStats[log.trigger_context]) {
              contextStats[log.trigger_context] = { total: 0, resisted: 0 };
            }
            contextStats[log.trigger_context].total++;
            if (log.resisted) {
              contextStats[log.trigger_context].resisted++;
            }
          }

          // Count by hour
          const hour = new Date(log.created_at).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        });

        // Process triggers
        const totalLogs = impulseLogs.length || 1;
        const processedTriggers = Object.entries(triggerCounts)
          .map(([trigger, count]) => {
            const iconInfo = TRIGGER_ICONS[trigger] || TRIGGER_ICONS['default'];
            return {
              trigger,
              count,
              percentage: Math.round((count / totalLogs) * 100),
              icon: iconInfo.icon,
              color: iconInfo.color,
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setTriggers(processedTriggers);

        // Process contexts as emotions/situations
        const processedEmotions = Object.entries(contextStats)
          .map(([context, stats]) => ({
            emotion: EMOTION_LABELS[context] || context,
            count: stats.total,
            resistRate: stats.total > 0 ? Math.round((stats.resisted / stats.total) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        setEmotions(processedEmotions);

        // Process time slots
        const sortedHours = Object.entries(hourCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([hour, count]) => ({
            time: `${hour}h - ${parseInt(hour) + 1}h`,
            count,
          }));

        setTopTimeSlots(sortedHours);
      }
    } catch (error) {
      console.error('Error fetching trigger data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500" />
      
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/10">
            <Brain className="h-5 w-5 text-pink-500" />
          </div>
          Análise de Gatilhos
        </CardTitle>
        <CardDescription>
          Entenda seus padrões de impulso
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Top Triggers */}
        {triggers.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Principais Gatilhos
            </h4>
            <div className="space-y-2">
              {triggers.map((trigger, index) => {
                const Icon = trigger.icon;
                return (
                  <motion.div
                    key={trigger.trigger}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                  >
                    <div className="p-2 rounded-lg bg-background">
                      <Icon className={`h-4 w-4 ${trigger.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{trigger.trigger}</span>
                        <Badge variant="secondary" className="text-xs">
                          {trigger.count}x ({trigger.percentage}%)
                        </Badge>
                      </div>
                      <Progress value={trigger.percentage} className="h-1.5" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Emotions Analysis */}
        {emotions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Emoções Associadas
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {emotions.map((emotion, index) => (
                <motion.div
                  key={emotion.emotion}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{emotion.emotion}</span>
                    <Badge 
                      variant="secondary" 
                      className={emotion.resistRate >= 70 ? 'bg-success/10 text-success' : 
                                 emotion.resistRate >= 40 ? 'bg-warning/10 text-warning' : 
                                 'bg-destructive/10 text-destructive'}
                    >
                      {emotion.resistRate}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {emotion.count} impulsos • {emotion.resistRate}% resistidos
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Critical Time Slots */}
        {topTimeSlots.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Horários Críticos
            </h4>
            <div className="flex gap-2 flex-wrap">
              {topTimeSlots.map((slot, index) => (
                <Badge
                  key={slot.time}
                  variant="outline"
                  className={`px-3 py-1.5 ${
                    index === 0 ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                    index === 1 ? 'bg-warning/10 border-warning/20 text-warning' :
                    'bg-muted'
                  }`}
                >
                  <Clock className="h-3 w-3 mr-1.5" />
                  {slot.time}
                  <span className="ml-1.5 opacity-60">({slot.count}x)</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {triggers.length === 0 && emotions.length === 0 && (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Registre seus impulsos para ver análises detalhadas
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Clique em "Senti um Impulso" quando necessário
            </p>
          </div>
        )}

        {/* Tip Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-primary/5 border border-primary/20"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Dica de Melhoria</p>
              <p className="text-xs text-muted-foreground mt-1">
                {triggers.length > 0 
                  ? `Seu principal gatilho é "${triggers[0]?.trigger}". Tente criar uma alternativa saudável para esse momento.`
                  : 'Continue registrando seus impulsos para receber dicas personalizadas.'}
              </p>
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}
