import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  Wind, 
  Heart, 
  Brain, 
  Sparkles,
  CheckCircle2,
  Timer,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Shield,
  Zap,
  Target,
  Coffee,
  Dumbbell,
  Music,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmergencyProtocolProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (resisted: boolean) => void;
}

type Phase = 'intro' | 'breathing' | 'grounding' | 'affirmation' | 'action' | 'result';

const groundingSteps = [
  { sense: '👁️ Visão', instruction: 'Identifique 5 coisas que você pode VER ao seu redor' },
  { sense: '👂 Audição', instruction: 'Identifique 4 sons que você pode OUVIR agora' },
  { sense: '✋ Tato', instruction: 'Toque 3 objetos diferentes e sinta suas texturas' },
  { sense: '👃 Olfato', instruction: 'Identifique 2 cheiros ao seu redor' },
  { sense: '👅 Paladar', instruction: 'Identifique 1 sabor na sua boca (ou beba água)' },
];

const affirmations = [
  "Eu sou mais forte que meus impulsos.",
  "Este momento vai passar. Meus objetivos são maiores.",
  "Cada resistência me torna mais forte.",
  "Eu escolho meu futuro, não o prazer momentâneo.",
  "Minha disciplina define quem eu sou.",
  "Eu protejo meu foco e minha energia.",
];

const quickActions = [
  { id: 'walk', label: 'Caminhe', icon: Dumbbell, description: 'Dê uma volta de 2 minutos' },
  { id: 'water', label: 'Beba Água', icon: Coffee, description: 'Hidrate-se agora' },
  { id: 'music', label: 'Música', icon: Music, description: 'Ouça algo motivador' },
  { id: 'study', label: 'Estude', icon: Target, description: 'Volte aos estudos por 5 min' },
];

export function EmergencyProtocol({ open, onOpenChange, onComplete }: EmergencyProtocolProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [breathCount, setBreathCount] = useState(0);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [currentGrounding, setCurrentGrounding] = useState(0);
  const [currentAffirmation, setCurrentAffirmation] = useState(0);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [resisted, setResisted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (phase === 'breathing' && breathCount < 5) {
      const durations = { inhale: 4000, hold: 4000, exhale: 4000 };
      
      timerRef.current = setTimeout(() => {
        if (breathPhase === 'inhale') {
          setBreathPhase('hold');
        } else if (breathPhase === 'hold') {
          setBreathPhase('exhale');
        } else {
          setBreathCount(prev => prev + 1);
          setBreathPhase('inhale');
        }
      }, durations[breathPhase]);
    } else if (phase === 'breathing' && breathCount >= 5) {
      setPhase('grounding');
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase, breathCount, breathPhase]);

  const handleClose = () => {
    setPhase('intro');
    setBreathCount(0);
    setBreathPhase('inhale');
    setCurrentGrounding(0);
    setCurrentAffirmation(0);
    setSelectedAction(null);
    onOpenChange(false);
  };

  const handleResult = (didResist: boolean) => {
    setResisted(didResist);
    setPhase('result');
    onComplete(didResist);
  };

  const getBreathInstruction = () => {
    switch (breathPhase) {
      case 'inhale': return 'INSPIRE profundamente...';
      case 'hold': return 'SEGURE o ar...';
      case 'exhale': return 'EXPIRE lentamente...';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
            Protocolo de Emergência
          </DialogTitle>
          <DialogDescription className="text-center">
            Sistema de recuperação em 5 etapas baseado em neurociência
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          {['intro', 'breathing', 'grounding', 'affirmation', 'action'].map((step, index) => (
            <div
              key={step}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                phase === step ? "w-8 bg-primary" : 
                ['intro', 'breathing', 'grounding', 'affirmation', 'action'].indexOf(phase) > index 
                  ? "w-4 bg-primary/60" : "w-4 bg-muted"
              )}
            />
          ))}
        </div>

        {/* Phase: Intro */}
        {phase === 'intro' && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mx-auto flex items-center justify-center">
                <AlertTriangle className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Você está sentindo um impulso forte</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Este protocolo vai te ajudar a superar os próximos 5 minutos críticos usando técnicas comprovadas.
                </p>
              </div>
            </div>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">O que você vai fazer:</span>
                </div>
                <ol className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="h-5 w-5 flex items-center justify-center p-0">1</Badge>
                    Respiração 4-4-4 (acalmar sistema nervoso)
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="h-5 w-5 flex items-center justify-center p-0">2</Badge>
                    Técnica 5-4-3-2-1 (aterramento)
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="h-5 w-5 flex items-center justify-center p-0">3</Badge>
                    Afirmações de identidade
                  </li>
                  <li className="flex items-center gap-2">
                    <Badge variant="outline" className="h-5 w-5 flex items-center justify-center p-0">4</Badge>
                    Ação substituta
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Button onClick={() => setPhase('breathing')} className="w-full" size="lg">
              <Play className="h-4 w-4 mr-2" />
              Iniciar Protocolo
            </Button>
          </div>
        )}

        {/* Phase: Breathing */}
        {phase === 'breathing' && (
          <div className="space-y-6 py-8 text-center">
            <div className="space-y-2">
              <Badge variant="secondary" className="mb-4">
                <Wind className="h-3 w-3 mr-1" />
                Etapa 1: Respiração
              </Badge>
              <h3 className="text-lg font-semibold">Respiração 4-4-4</h3>
              <p className="text-sm text-muted-foreground">
                Respire pelo nariz, segure e expire pela boca
              </p>
            </div>

            <div className="relative w-40 h-40 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="8"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="8"
                  strokeDasharray={440}
                  strokeDashoffset={440 - (440 * breathCount) / 5}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={cn(
                  "w-16 h-16 rounded-full transition-all duration-1000 flex items-center justify-center",
                  breathPhase === 'inhale' && "scale-100 bg-primary/20",
                  breathPhase === 'hold' && "scale-110 bg-primary/30",
                  breathPhase === 'exhale' && "scale-90 bg-primary/10"
                )}>
                  <Wind className="h-8 w-8 text-primary" />
                </div>
              </div>
            </div>

            <p className="text-xl font-semibold text-primary animate-pulse">
              {getBreathInstruction()}
            </p>

            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">Ciclo {breathCount}/5</span>
            </div>

            <Button variant="outline" onClick={() => setPhase('grounding')} size="sm">
              Pular para próxima etapa
            </Button>
          </div>
        )}

        {/* Phase: Grounding */}
        {phase === 'grounding' && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <Badge variant="secondary" className="mb-4">
                <Eye className="h-3 w-3 mr-1" />
                Etapa 2: Aterramento 5-4-3-2-1
              </Badge>
              <h3 className="text-lg font-semibold">Técnica de Aterramento</h3>
              <p className="text-sm text-muted-foreground">
                Use seus sentidos para se conectar ao presente
              </p>
            </div>

            <Card className="border-primary/20">
              <CardContent className="p-6 text-center space-y-4">
                <div className="text-4xl">{groundingSteps[currentGrounding].sense}</div>
                <p className="text-lg font-medium">{groundingSteps[currentGrounding].instruction}</p>
                <Progress value={((currentGrounding + 1) / groundingSteps.length) * 100} className="h-2" />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              {currentGrounding > 0 && (
                <Button variant="outline" onClick={() => setCurrentGrounding(prev => prev - 1)} className="flex-1">
                  Anterior
                </Button>
              )}
              <Button 
                onClick={() => {
                  if (currentGrounding < groundingSteps.length - 1) {
                    setCurrentGrounding(prev => prev + 1);
                  } else {
                    setPhase('affirmation');
                  }
                }}
                className="flex-1"
              >
                {currentGrounding < groundingSteps.length - 1 ? 'Próximo' : 'Continuar'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Phase: Affirmation */}
        {phase === 'affirmation' && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <Badge variant="secondary" className="mb-4">
                <Brain className="h-3 w-3 mr-1" />
                Etapa 3: Reprogramação Mental
              </Badge>
              <h3 className="text-lg font-semibold">Afirmações de Identidade</h3>
              <p className="text-sm text-muted-foreground">
                Leia em voz alta ou repita mentalmente
              </p>
            </div>

            <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-transparent">
              <CardContent className="p-8 text-center">
                <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
                <p className="text-xl font-semibold text-primary italic">
                  "{affirmations[currentAffirmation]}"
                </p>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-2">
              {affirmations.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentAffirmation(index)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    currentAffirmation === index ? "w-6 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setCurrentAffirmation(prev => (prev + 1) % affirmations.length)}
                className="flex-1"
              >
                Próxima Afirmação
              </Button>
              <Button onClick={() => setPhase('action')} className="flex-1">
                Continuar
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Phase: Action */}
        {phase === 'action' && (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <Badge variant="secondary" className="mb-4">
                <Target className="h-3 w-3 mr-1" />
                Etapa 4: Ação Substituta
              </Badge>
              <h3 className="text-lg font-semibold">Escolha uma Ação Agora</h3>
              <p className="text-sm text-muted-foreground">
                Substitua o impulso por algo construtivo
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => setSelectedAction(action.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                    selectedAction === action.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <action.icon className={cn(
                    "h-6 w-6",
                    selectedAction === action.id ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className="text-sm font-medium">{action.label}</span>
                  <span className="text-xs text-muted-foreground text-center">{action.description}</span>
                </button>
              ))}
            </div>

            <div className="pt-4 space-y-3">
              <p className="text-sm text-center text-muted-foreground font-medium">
                Como você está se sentindo agora?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
                  onClick={() => handleResult(false)}
                >
                  Ainda preciso de ajuda
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-success to-success/80"
                  onClick={() => handleResult(true)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Me sinto melhor!
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Phase: Result */}
        {phase === 'result' && (
          <div className="space-y-6 py-8 text-center">
            {resisted ? (
              <>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-success to-success/80 mx-auto flex items-center justify-center animate-scale-in">
                  <CheckCircle2 className="h-10 w-10 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-success">Parabéns! Você venceu!</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Você completou o protocolo de emergência e protegeu seu foco. 
                    Cada vitória fortalece sua disciplina.
                  </p>
                </div>
                <Card className="border-success/20 bg-success/5">
                  <CardContent className="p-4 text-sm text-success">
                    <Sparkles className="h-4 w-4 inline mr-2" />
                    "Eu sou alguém que resiste aos impulsos e constrói seu futuro."
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-muted mx-auto flex items-center justify-center">
                  <Heart className="h-10 w-10 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Está tudo bem</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Recaídas fazem parte do processo de recuperação. 
                    O importante é aprender e continuar tentando.
                  </p>
                </div>
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 text-sm text-primary">
                    <Brain className="h-4 w-4 inline mr-2" />
                    Anote o que disparou esse impulso para evitá-lo no futuro.
                  </CardContent>
                </Card>
              </>
            )}
            <Button onClick={handleClose} className="w-full" size="lg">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
