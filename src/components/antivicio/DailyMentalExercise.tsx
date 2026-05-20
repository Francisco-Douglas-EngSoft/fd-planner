import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  Sparkles, 
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Timer,
  Volume2,
  Eye,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DailyMentalExerciseProps {
  onComplete?: () => void;
}

const exercises = [
  {
    id: 'visualization',
    title: 'Visualização do Sucesso',
    duration: 3,
    icon: Eye,
    steps: [
      {
        instruction: 'Feche os olhos e imagine seu dia perfeito de estudos',
        duration: 30,
      },
      {
        instruction: 'Veja você completando suas tarefas com foco total',
        duration: 30,
      },
      {
        instruction: 'Sinta a satisfação de ter resistido às distrações',
        duration: 30,
      },
      {
        instruction: 'Visualize o futuro que você está construindo',
        duration: 30,
      },
    ],
  },
  {
    id: 'identity',
    title: 'Afirmações de Identidade',
    duration: 2,
    icon: Sparkles,
    affirmations: [
      'Eu sou uma pessoa disciplinada.',
      'Eu protejo meu foco todos os dias.',
      'Eu escolho crescimento, não prazer instantâneo.',
      'Cada dia eu me torno mais forte.',
      'Meus objetivos são maiores que meus impulsos.',
    ],
  },
  {
    id: 'gratitude',
    title: 'Gratidão e Propósito',
    duration: 2,
    icon: Brain,
    prompts: [
      'Pelo que você é grato hoje?',
      'Qual é seu maior objetivo agora?',
      'Por que esse objetivo é importante para você?',
      'Quem você quer se tornar?',
    ],
  },
];

export function DailyMentalExercise({ onComplete }: DailyMentalExerciseProps) {
  const [started, setStarted] = useState(false);
  const [currentExercise, setCurrentExercise] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);

  const exercise = exercises[currentExercise];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      handleNextStep();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const handleStart = () => {
    setStarted(true);
    setCurrentStep(0);
    if (exercise.id === 'visualization') {
      setTimeLeft(exercise.steps![0].duration);
    }
    setIsRunning(true);
  };

  const handleNextStep = () => {
    if (exercise.id === 'visualization') {
      if (currentStep < exercise.steps!.length - 1) {
        setCurrentStep(prev => prev + 1);
        setTimeLeft(exercise.steps![currentStep + 1].duration);
      } else {
        handleNextExercise();
      }
    } else if (exercise.id === 'identity') {
      if (currentStep < exercise.affirmations!.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleNextExercise();
      }
    } else if (exercise.id === 'gratitude') {
      if (currentStep < exercise.prompts!.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleNextExercise();
      }
    }
  };

  const handleNextExercise = () => {
    if (currentExercise < exercises.length - 1) {
      setCurrentExercise(prev => prev + 1);
      setCurrentStep(0);
      setIsRunning(false);
      setStarted(false);
    } else {
      setCompleted(true);
      setIsRunning(false);
      toast.success('Exercício mental concluído! 🧠✨');
      onComplete?.();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const getProgress = () => {
    const exerciseProgress = (currentExercise / exercises.length) * 100;
    let stepProgress = 0;
    
    if (exercise.id === 'visualization') {
      stepProgress = ((currentStep + 1) / exercise.steps!.length) * (100 / exercises.length);
    } else if (exercise.id === 'identity') {
      stepProgress = ((currentStep + 1) / exercise.affirmations!.length) * (100 / exercises.length);
    } else if (exercise.id === 'gratitude') {
      stepProgress = ((currentStep + 1) / exercise.prompts!.length) * (100 / exercises.length);
    }
    
    return exerciseProgress + stepProgress;
  };

  if (completed) {
    return (
      <Card className="border-success/20 bg-gradient-to-br from-success/5 to-transparent">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-success/20 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Exercício Completo!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Você fortaleceu sua mente hoje. Continue assim!
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => {
              setCompleted(false);
              setCurrentExercise(0);
              setCurrentStep(0);
              setStarted(false);
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Repetir Exercícios
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Exercício Mental Diário</CardTitle>
              <CardDescription className="text-xs">5-10 minutos para reprogramar sua mente</CardDescription>
            </div>
          </div>
          <Badge variant="outline">
            <Timer className="h-3 w-3 mr-1" />
            ~7 min
          </Badge>
        </div>
        <Progress value={getProgress()} className="h-1.5 mt-3" />
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Exercise Tabs */}
        <div className="flex gap-2">
          {exercises.map((ex, index) => (
            <button
              key={ex.id}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                index === currentExercise 
                  ? "bg-primary text-primary-foreground" 
                  : index < currentExercise
                    ? "bg-success/20 text-success"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {index < currentExercise ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <ex.icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{ex.title.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Current Exercise Content */}
        <div className="min-h-[180px]">
          {!started ? (
            <div className="text-center space-y-4 py-6">
              <div className="w-14 h-14 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                <exercise.icon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">{exercise.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Duração: ~{exercise.duration} minutos
                </p>
              </div>
              <Button onClick={handleStart} className="gap-2">
                Começar
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              {/* Visualization Exercise */}
              {exercise.id === 'visualization' && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mx-auto flex items-center justify-center">
                    <div className="text-3xl font-bold text-primary">{timeLeft}</div>
                  </div>
                  <p className="text-lg font-medium px-4">
                    {exercise.steps![currentStep].instruction}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Etapa {currentStep + 1} de {exercise.steps!.length}
                  </p>
                </div>
              )}

              {/* Identity Affirmations */}
              {exercise.id === 'identity' && (
                <div className="text-center space-y-4 py-4">
                  <Sparkles className="h-8 w-8 text-primary mx-auto" />
                  <div className="p-6 rounded-xl bg-primary/5 border border-primary/20">
                    <p className="text-xl font-semibold text-primary italic">
                      "{exercise.affirmations![currentStep]}"
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Repita em voz alta 3x • {currentStep + 1}/{exercise.affirmations!.length}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" size="sm" onClick={handlePrevStep} disabled={currentStep === 0}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={handleNextStep}>
                      Próxima
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Gratitude Prompts */}
              {exercise.id === 'gratitude' && (
                <div className="text-center space-y-4 py-4">
                  <Brain className="h-8 w-8 text-primary mx-auto" />
                  <div className="p-6 rounded-xl bg-muted/50">
                    <p className="text-lg font-medium">
                      {exercise.prompts![currentStep]}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reflita por alguns segundos • {currentStep + 1}/{exercise.prompts!.length}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button variant="outline" size="sm" onClick={handlePrevStep} disabled={currentStep === 0}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={handleNextStep}>
                      {currentStep === exercise.prompts!.length - 1 ? 'Concluir' : 'Próxima'}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
