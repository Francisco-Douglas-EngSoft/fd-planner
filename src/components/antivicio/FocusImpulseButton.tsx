import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, 
  Timer, 
  CheckCircle2, 
  X,
  Wind,
  BookOpen,
  Dumbbell,
  Music
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FocusImpulseButtonProps {
  onResisted?: () => void;
  variant?: 'default' | 'compact' | 'icon';
  className?: string;
}

const techniques = [
  { id: 'breathing', label: 'Respiração', icon: Wind, description: 'Respire fundo 5 vezes' },
  { id: 'exercise', label: 'Movimento', icon: Dumbbell, description: '10 polichinelos' },
  { id: 'reading', label: 'Leitura', icon: BookOpen, description: 'Leia 1 página do material' },
  { id: 'music', label: 'Música', icon: Music, description: 'Ouça uma música motivacional' },
];

export function FocusImpulseButton({ onResisted, variant = 'default', className }: FocusImpulseButtonProps) {
  const { user } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [phase, setPhase] = useState<'initial' | 'timer' | 'technique' | 'result'>('initial');
  const [timeLeft, setTimeLeft] = useState(60);
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [resisted, setResisted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase === 'timer' && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (timeLeft === 0 && phase === 'timer') {
      setPhase('technique');
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, phase]);

  const handleOpenDialog = () => {
    setShowDialog(true);
    setPhase('initial');
    setTimeLeft(60);
    setSelectedTechnique(null);
    setNotes('');
    setResisted(false);
  };

  const startTimer = () => {
    setPhase('timer');
  };

  const handleTechniqueSelect = (technique: string) => {
    setSelectedTechnique(technique);
  };

  const handleResult = async (didResist: boolean) => {
    setResisted(didResist);
    setPhase('result');
    
    try {
      // Log the impulse - occurred during study = true (since we're in focus mode)
      await supabase.from('impulse_logs').insert({
        user_id: user?.id,
        trigger_type: 'focus_session',
        trigger_context: notes || 'Impulso durante sessão de foco',
        intensity: 7,
        resisted: didResist,
        resistance_technique: selectedTechnique,
        occurred_during_study: true,
      });

      // Update today's checkin
      const today = new Date().toISOString().split('T')[0];
      const { data: existingCheckin } = await supabase
        .from('addiction_checkins')
        .select('*')
        .eq('user_id', user?.id)
        .eq('check_date', today)
        .maybeSingle();

      if (existingCheckin) {
        await supabase
          .from('addiction_checkins')
          .update({
            impulses_count: (existingCheckin.impulses_count || 0) + 1,
            resistances_count: didResist 
              ? (existingCheckin.resistances_count || 0) + 1 
              : existingCheckin.resistances_count,
          })
          .eq('id', existingCheckin.id);
      } else {
        await supabase.from('addiction_checkins').insert({
          user_id: user?.id,
          check_date: today,
          impulses_count: 1,
          resistances_count: didResist ? 1 : 0,
          self_control_score: didResist ? 7 : 4,
        });
      }

      // Update streaks if resisted
      if (didResist) {
        const { data: streaks } = await supabase
          .from('clean_streaks')
          .select('*')
          .eq('user_id', user?.id);

        if (streaks) {
          for (const streak of streaks) {
            const lastDate = new Date(streak.last_clean_date);
            const todayDate = new Date(today);
            const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

            if (diffDays <= 1) {
              const newStreak = diffDays === 0 ? streak.current_streak : streak.current_streak + 1;
              await supabase
                .from('clean_streaks')
                .update({
                  current_streak: newStreak,
                  longest_streak: Math.max(newStreak, streak.longest_streak || 0),
                  last_clean_date: today,
                })
                .eq('id', streak.id);
            }
          }
        }
      }

      onResisted?.();
    } catch (error) {
      console.error('Error logging impulse:', error);
    }
  };

  const handleClose = () => {
    setShowDialog(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <>
      {variant === 'icon' ? (
        <Button
          onClick={handleOpenDialog}
          variant="ghost"
          size="icon"
          className={cn("text-white/70 hover:text-white hover:bg-white/10", className)}
          title="Registrar Impulso"
        >
          <AlertTriangle className="h-5 w-5" />
        </Button>
      ) : variant === 'compact' ? (
        <Button
          onClick={handleOpenDialog}
          variant="outline"
          size="sm"
          className={cn("gap-1", className)}
        >
          <AlertTriangle className="h-4 w-4" />
          <span className="text-xs">Impulso</span>
        </Button>
      ) : (
        <Button
          onClick={handleOpenDialog}
          className={cn("bg-gradient-warm hover:opacity-90 text-primary-foreground gap-2", className)}
        >
          <AlertTriangle className="h-4 w-4" />
          <span className="hidden sm:inline">Crise de Impulso</span>
          <span className="sm:hidden">Crise</span>
        </Button>
      )}

      <Dialog open={showDialog} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Gerenciando o Impulso
            </DialogTitle>
            <DialogDescription className="text-center">
              Vamos trabalhar juntos para superar esse momento
            </DialogDescription>
          </DialogHeader>

          {phase === 'initial' && (
            <div className="space-y-4 text-center py-4">
              <p className="text-sm text-muted-foreground">
                Você está sentindo um impulso durante o estudo. Vamos trabalhar juntos para superá-lo.
              </p>
              <div className="bg-primary/10 rounded-lg p-4">
                <p className="text-sm font-medium text-primary">
                  "Cada impulso resistido me torna mais forte"
                </p>
              </div>
              <Button onClick={startTimer} className="w-full">
                <Timer className="h-4 w-4 mr-2" />
                Iniciar Timer de 60 segundos
              </Button>
            </div>
          )}

          {phase === 'timer' && (
            <div className="space-y-6 text-center py-8">
              <div className="relative w-32 h-32 mx-auto">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="8"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    strokeDasharray={352}
                    strokeDashoffset={352 - (352 * timeLeft) / 60}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-4xl font-bold">{timeLeft}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Respire fundo e mantenha o foco...
              </p>
              <Button variant="outline" onClick={() => setPhase('technique')}>
                Pular para técnicas
              </Button>
            </div>
          )}

          {phase === 'technique' && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-center text-muted-foreground">
                Escolha uma técnica para ajudar a superar o impulso:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {techniques.map((tech) => (
                  <button
                    key={tech.id}
                    onClick={() => handleTechniqueSelect(tech.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                      selectedTechnique === tech.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <tech.icon className={cn(
                      "h-6 w-6",
                      selectedTechnique === tech.id ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className="text-sm font-medium">{tech.label}</span>
                    <span className="text-xs text-muted-foreground text-center">{tech.description}</span>
                  </button>
                ))}
              </div>
              
              <Textarea
                placeholder="O que disparou esse impulso? (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-4"
              />
              
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleResult(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Não resisti
                </Button>
                <Button
                  className="flex-1 bg-gradient-success hover:opacity-90"
                  onClick={() => handleResult(true)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Resisti!
                </Button>
              </div>
            </div>
          )}

          {phase === 'result' && (
            <div className="space-y-4 text-center py-8">
              {resisted ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-gradient-success mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-success">Excelente!</h3>
                  <p className="text-sm text-muted-foreground">
                    Você resistiu ao impulso e manteve o foco. Continue assim!
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">Tudo bem</h3>
                  <p className="text-sm text-muted-foreground">
                    O importante é retomar o foco agora. Você consegue!
                  </p>
                </>
              )}
              <Button onClick={handleClose} className="w-full">
                Voltar ao Foco
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
