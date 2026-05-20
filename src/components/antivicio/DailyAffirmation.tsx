import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  RefreshCw, 
  Heart, 
  Sun,
  Moon,
  Sunrise,
  Quote,
  Volume2,
  VolumeX,
  Share2,
  Bookmark,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const affirmations = [
  {
    text: "Eu sou mais forte que qualquer impulso passageiro.",
    category: "força",
    author: null,
  },
  {
    text: "Cada dia sem ceder é uma vitória que me transforma.",
    category: "progresso",
    author: null,
  },
  {
    text: "Minha disciplina de hoje constrói meu sucesso de amanhã.",
    category: "futuro",
    author: null,
  },
  {
    text: "Eu escolho conscientemente o que é bom para mim.",
    category: "escolha",
    author: null,
  },
  {
    text: "Meus objetivos são maiores que meus desejos momentâneos.",
    category: "propósito",
    author: null,
  },
  {
    text: "Eu protejo minha mente e minha energia todos os dias.",
    category: "proteção",
    author: null,
  },
  {
    text: "A liberdade verdadeira está em controlar meus impulsos.",
    category: "liberdade",
    author: null,
  },
  {
    text: "Eu mereço uma vida plena, livre de vícios.",
    category: "merecimento",
    author: null,
  },
  {
    text: "Cada resistência fortalece meu caráter.",
    category: "caráter",
    author: null,
  },
  {
    text: "Eu sou alguém que cumpre suas promessas para si mesmo.",
    category: "identidade",
    author: null,
  },
];

const motivationalQuotes = [
  {
    text: "A disciplina é a ponte entre metas e realizações.",
    author: "Jim Rohn",
  },
  {
    text: "Você nunca é forte demais para precisar de ajuda.",
    author: "Provérbio",
  },
  {
    text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
    author: "Robert Collier",
  },
  {
    text: "Não é sobre ser perfeito, é sobre ser melhor do que ontem.",
    author: "Anônimo",
  },
  {
    text: "A força não vem de vencer. Suas lutas desenvolvem suas forças.",
    author: "Arnold Schwarzenegger",
  },
  {
    text: "O momento em que você pensa em desistir é o momento em que você precisa continuar.",
    author: "Provérbio Japonês",
  },
  {
    text: "Caia sete vezes, levante-se oito.",
    author: "Provérbio Japonês",
  },
  {
    text: "A dor que você sente hoje será a força que você sentirá amanhã.",
    author: "Anônimo",
  },
];

const dailyMessages = [
  {
    period: 'morning',
    icon: Sunrise,
    messages: [
      "Bom dia! Hoje é um novo começo. Cada momento é uma chance de fazer diferente.",
      "A manhã traz novas oportunidades. Comece o dia com propósito!",
      "Você acordou mais forte do que ontem. Aproveite essa energia!",
      "Este dia ainda não foi escrito. Faça dele uma obra-prima.",
    ],
  },
  {
    period: 'afternoon',
    icon: Sun,
    messages: [
      "Continue firme! A tarde é quando muitos desistem - não seja um deles.",
      "Metade do dia já passou. Você está indo bem, continue assim!",
      "Este é o momento de manter o foco. Você consegue!",
      "A tarde pode ser desafiadora, mas você é mais forte que qualquer desafio.",
    ],
  },
  {
    period: 'evening',
    icon: Moon,
    messages: [
      "A noite chegou. Reflita sobre suas vitórias de hoje.",
      "Você sobreviveu a mais um dia. Isso é uma conquista!",
      "Descanse sabendo que você deu o seu melhor hoje.",
      "A noite é para recuperar forças para amanhã. Durma bem!",
    ],
  },
];

interface DailyAffirmationProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function DailyAffirmation({ variant = 'full', className }: DailyAffirmationProps) {
  const [currentAffirmation, setCurrentAffirmation] = useState(affirmations[0]);
  const [currentQuote, setCurrentQuote] = useState(motivationalQuotes[0]);
  const [dailyMessage, setDailyMessage] = useState<string>('');
  const [periodIcon, setPeriodIcon] = useState<typeof Sun>(Sun);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showQuote, setShowQuote] = useState(true);

  useEffect(() => {
    // Set daily content based on date (consistent for the day)
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    const affirmationIndex = dayOfYear % affirmations.length;
    const quoteIndex = dayOfYear % motivationalQuotes.length;
    
    setCurrentAffirmation(affirmations[affirmationIndex]);
    setCurrentQuote(motivationalQuotes[quoteIndex]);
    
    // Set period-based message
    const hour = today.getHours();
    let period: 'morning' | 'afternoon' | 'evening';
    if (hour >= 5 && hour < 12) {
      period = 'morning';
    } else if (hour >= 12 && hour < 18) {
      period = 'afternoon';
    } else {
      period = 'evening';
    }
    
    const periodData = dailyMessages.find(m => m.period === period)!;
    const messageIndex = dayOfYear % periodData.messages.length;
    setDailyMessage(periodData.messages[messageIndex]);
    setPeriodIcon(periodData.icon);
  }, []);

  const refreshContent = () => {
    setIsAnimating(true);
    setTimeout(() => {
      const randomAffirmation = affirmations[Math.floor(Math.random() * affirmations.length)];
      const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
      setCurrentAffirmation(randomAffirmation);
      setCurrentQuote(randomQuote);
      setIsAnimating(false);
    }, 300);
  };

  const PeriodIcon = periodIcon;

  if (variant === 'compact') {
    return (
      <Card className={cn("overflow-hidden border-0 bg-gradient-to-br from-primary/5 via-accent/5 to-transparent", className)}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                "{currentAffirmation.text}"
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px] capitalize">
                  {currentAffirmation.category}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={refreshContent}
                >
                  <RefreshCw className={cn("h-3 w-3", isAnimating && "animate-spin")} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "overflow-hidden border-0",
      "bg-gradient-to-br from-primary/10 via-accent/5 to-success/5",
      "shadow-lg shadow-primary/5",
      className
    )}>
      <CardContent className="p-0">
        {/* Daily Message Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-primary/10 to-transparent border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <PeriodIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensagem do Dia</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{dailyMessage}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-5 space-y-5">
          {/* Toggle Tabs */}
          <div className="flex gap-2">
            <Button
              variant={showQuote ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setShowQuote(true)}
            >
              <Quote className="h-3.5 w-3.5" />
              Citação
            </Button>
            <Button
              variant={!showQuote ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 gap-2"
              onClick={() => setShowQuote(false)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Afirmação
            </Button>
          </div>

          {/* Content Area */}
          <AnimatePresence mode="wait">
            <motion.div
              key={showQuote ? 'quote' : 'affirmation'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-[140px]"
            >
              {showQuote ? (
                <div className="text-center space-y-4 py-4">
                  <div className="relative">
                    <Quote className="h-8 w-8 text-primary/20 absolute -top-2 -left-1" />
                    <p className="text-lg sm:text-xl font-medium text-foreground leading-relaxed px-6 italic">
                      {currentQuote.text}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-px w-8 bg-gradient-to-r from-transparent to-primary/30" />
                    <p className="text-sm text-primary font-medium">{currentQuote.author}</p>
                    <div className="h-px w-8 bg-gradient-to-l from-transparent to-primary/30" />
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4 py-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                    <Sparkles className="h-6 w-6 text-primary mx-auto mb-3" />
                    <p className="text-lg sm:text-xl font-semibold text-primary leading-relaxed">
                      "{currentAffirmation.text}"
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="outline" className="capitalize text-xs">
                      {currentAffirmation.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">• Repita 3x em voz alta</span>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Heart className={cn(
                  "h-4 w-4 transition-colors",
                  isFavorite && "fill-destructive text-destructive"
                )} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <Bookmark className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={refreshContent}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isAnimating && "animate-spin")} />
              Nova Mensagem
            </Button>
          </div>
        </div>

        {/* Prayer/Meditation Section */}
        <div className="px-5 py-4 bg-gradient-to-r from-success/5 to-transparent border-t border-success/10">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-success/10 shrink-0">
              <Star className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Oração / Meditação
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                "Que eu tenha sabedoria para reconhecer meus gatilhos, coragem para resistir, 
                e serenidade para aceitar que a jornada é feita de um dia de cada vez."
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
