import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Clock, 
  Target, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Trophy,
  Calendar,
  Brain,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Logo } from '@/components/ui/Logo';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
  features: {
    icon: React.ElementType;
    title: string;
    description: string;
  }[];
  color: string;
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Bem-vindo ao FD-Planner! 🎉',
    description: 'Sua jornada de estudos organizados começa agora. Vamos conhecer as principais funcionalidades.',
    icon: Sparkles,
    color: 'from-primary to-primary-glow',
    features: [
      {
        icon: BookOpen,
        title: 'Gerencie seus Cursos',
        description: 'Organize todos os seus cursos em um só lugar com módulos e progresso.'
      },
      {
        icon: Clock,
        title: 'Acompanhe seu Tempo',
        description: 'Registre automaticamente suas horas de estudo.'
      },
      {
        icon: Target,
        title: 'Defina Metas',
        description: 'Estabeleça objetivos semanais e acompanhe seu progresso.'
      },
    ],
  },
  {
    id: 2,
    title: 'Timer Pomodoro Integrado',
    description: 'Use a técnica Pomodoro para maximizar sua produtividade com ciclos de foco e descanso.',
    icon: Clock,
    color: 'from-success to-emerald-400',
    features: [
      {
        icon: Brain,
        title: 'Foco Total',
        description: 'Sessões de 25 minutos de concentração intensa.'
      },
      {
        icon: CheckCircle2,
        title: 'Pausas Programadas',
        description: 'Intervalos curtos e longos para recuperar energia.'
      },
      {
        icon: Trophy,
        title: 'Registro Automático',
        description: 'Suas sessões são salvas automaticamente no seu histórico.'
      },
    ],
  },
  {
    id: 3,
    title: 'Planejamento Inteligente',
    description: 'Crie planos de estudo personalizados e organize sua rotina de forma eficiente.',
    icon: Calendar,
    color: 'from-accent to-cyan-400',
    features: [
      {
        icon: Calendar,
        title: 'Planos de Estudo',
        description: 'Monte cronogramas com cursos e horários definidos.'
      },
      {
        icon: Target,
        title: 'Tarefas e Lembretes',
        description: 'Nunca esqueça uma atividade importante.'
      },
      {
        icon: BookOpen,
        title: 'Diário de Estudos',
        description: 'Registre seus aprendizados e reflexões.'
      },
    ],
  },
  {
    id: 4,
    title: 'Gamificação e Conquistas',
    description: 'Mantenha-se motivado com um sistema de níveis, conquistas e sequências de estudo.',
    icon: Trophy,
    color: 'from-amber-400 to-orange-500',
    features: [
      {
        icon: Trophy,
        title: 'Conquistas',
        description: 'Desbloqueie medalhas ao atingir marcos importantes.'
      },
      {
        icon: Sparkles,
        title: 'Sistema de Níveis',
        description: 'Ganhe XP e suba de nível conforme estuda.'
      },
      {
        icon: CheckCircle2,
        title: 'Sequências (Streaks)',
        description: 'Mantenha sua sequência de dias estudando.'
      },
    ],
  },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  
  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      navigate('/dashboard');
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gradient-hero">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 blob-1 rounded-full animate-pulse-soft opacity-50" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 blob-2 rounded-full animate-pulse-soft opacity-50" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 sm:p-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Logo size="md" variant="full" />
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
            Pular
          </Button>
        </div>
      </header>

      {/* Progress */}
      <div className="relative z-10 px-4 sm:px-6 mb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Passo {currentStep + 1} de {steps.length}
            </span>
            <span className="text-sm font-medium text-primary">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 relative z-10 px-4 sm:px-6 pb-6 flex items-center justify-center">
        <div className="max-w-4xl w-full animate-fade-in" key={currentStep}>
          <Card className="shadow-xl border-border/30 backdrop-blur-xl bg-card/90 overflow-hidden">
            <CardContent className="p-0">
              {/* Hero Section */}
              <div className={cn(
                "bg-gradient-to-r p-6 sm:p-8 text-white",
                step.color
              )}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="rounded-2xl bg-white/20 p-3 sm:p-4">
                    <step.icon className="h-8 w-8 sm:h-10 sm:w-10" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold font-display">
                      {step.title}
                    </h1>
                  </div>
                </div>
                <p className="text-white/90 text-sm sm:text-base lg:text-lg max-w-2xl">
                  {step.description}
                </p>
              </div>

              {/* Features Grid */}
              <div className="p-6 sm:p-8">
                <div className="grid gap-4 sm:gap-6 sm:grid-cols-3">
                  {step.features.map((feature, index) => (
                    <div 
                      key={index}
                      className="flex flex-col items-center text-center p-4 rounded-xl bg-muted/30 border border-border/30 transition-all duration-300 hover:bg-muted/50 hover:border-primary/30"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className={cn(
                        "rounded-xl p-3 mb-3 bg-gradient-to-br",
                        step.color
                      )}>
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="font-semibold text-sm sm:text-base mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="p-4 sm:p-6 pt-0 flex items-center justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                
                {/* Step indicators */}
                <div className="flex gap-2">
                  {steps.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={cn(
                        "w-2.5 h-2.5 rounded-full transition-all duration-300",
                        index === currentStep 
                          ? "bg-primary w-8" 
                          : index < currentStep 
                            ? "bg-primary/50" 
                            : "bg-muted-foreground/30"
                      )}
                    />
                  ))}
                </div>

                <Button onClick={handleNext} className="gap-2 shadow-glow">
                  <span>{isLastStep ? 'Começar!' : 'Próximo'}</span>
                  {isLastStep ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}