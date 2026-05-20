import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DailyCheckinProps {
  checkin: {
    id: string;
    impulses_count: number;
    resistances_count: number;
    relapses_count: number;
    self_control_score: number;
  } | null;
  onUpdate: () => void;
}

const moods = [
  { id: 'great', label: 'Ótimo', emoji: '😊' },
  { id: 'good', label: 'Bem', emoji: '🙂' },
  { id: 'neutral', label: 'Neutro', emoji: '😐' },
  { id: 'difficult', label: 'Difícil', emoji: '😓' },
  { id: 'struggling', label: 'Lutando', emoji: '😰' },
];

export function DailyCheckin({ checkin, onUpdate }: DailyCheckinProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(!checkin);
  const [selfControlScore, setSelfControlScore] = useState(checkin?.self_control_score || 5);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    
    try {
      setSaving(true);
      const today = format(new Date(), 'yyyy-MM-dd');
      
      if (checkin) {
        await supabase
          .from('addiction_checkins')
          .update({
            self_control_score: selfControlScore,
            mood: selectedMood,
            notes: notes || null,
          })
          .eq('id', checkin.id);
      } else {
        await supabase.from('addiction_checkins').insert({
          user_id: user.id,
          check_date: today,
          self_control_score: selfControlScore,
          mood: selectedMood,
          notes: notes || null,
        });
      }
      
      toast.success('Check-in salvo!');
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error saving checkin:', error);
      toast.error('Erro ao salvar check-in');
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-success';
    if (score >= 4) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 7) return TrendingUp;
    if (score >= 4) return Minus;
    return TrendingDown;
  };

  const ScoreIcon = getScoreIcon(checkin?.self_control_score || selfControlScore);

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Check-in Diário
          </div>
          <Badge variant="outline" className="text-xs">
            {format(new Date(), "dd 'de' MMM", { locale: ptBR })}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isEditing && checkin ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-2xl font-bold text-primary">{checkin.impulses_count}</p>
                <p className="text-xs text-muted-foreground">Impulsos</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-2xl font-bold text-success">{checkin.resistances_count}</p>
                <p className="text-xs text-muted-foreground">Resistências</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-2xl font-bold text-destructive">{checkin.relapses_count}</p>
                <p className="text-xs text-muted-foreground">Recaídas</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <ScoreIcon className={cn("h-5 w-5", getScoreColor(checkin.self_control_score))} />
                <span className="text-sm font-medium">Autocontrole</span>
              </div>
              <span className={cn("text-2xl font-bold", getScoreColor(checkin.self_control_score))}>
                {checkin.self_control_score}/10
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setIsEditing(true)}
            >
              Atualizar Check-in
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">Como está seu autocontrole hoje?</p>
                <span className={cn("text-xl font-bold", getScoreColor(selfControlScore))}>
                  {selfControlScore}/10
                </span>
              </div>
              <Slider
                value={[selfControlScore]}
                onValueChange={(value) => setSelfControlScore(value[0])}
                min={1}
                max={10}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Como você está se sentindo?</p>
              <div className="flex flex-wrap gap-2">
                {moods.map((mood) => (
                  <Badge
                    key={mood.id}
                    variant={selectedMood === mood.id ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all py-2 px-3",
                      selectedMood === mood.id && "bg-primary"
                    )}
                    onClick={() => setSelectedMood(mood.id)}
                  >
                    <span className="mr-1">{mood.emoji}</span>
                    {mood.label}
                  </Badge>
                ))}
              </div>
            </div>

            <Textarea
              placeholder="Observações do dia (opcional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px]"
            />

            <div className="flex gap-2">
              {checkin && (
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Check-in'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
