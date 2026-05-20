import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const quotes = [
  { text: "O segredo para começar é parar de falar e começar a fazer.", author: "Walt Disney" },
  { text: "Foco é dizer não para as coisas boas para poder dizer sim para as melhores.", author: "Steve Jobs" },
  { text: "A disciplina é a ponte entre metas e realizações.", author: "Jim Rohn" },
  { text: "Você não precisa ser excelente para começar, mas precisa começar para ser excelente.", author: "Zig Ziglar" },
  { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", author: "Robert Collier" },
  { text: "A única maneira de fazer um ótimo trabalho é amar o que você faz.", author: "Steve Jobs" },
  { text: "Não espere por oportunidades, crie-as.", author: "George Bernard Shaw" },
  { text: "Cada hora de estudo é uma semente plantada para o seu futuro.", author: "Anônimo" },
  { text: "O conhecimento é a única coisa que ninguém pode tirar de você.", author: "B.B. King" },
  { text: "Persistência é o caminho do êxito.", author: "Charles Chaplin" },
  { text: "Acredite em você e todo o resto virá.", author: "Theodore Roosevelt" },
  { text: "O único limite para a sua realização de amanhã são as suas dúvidas de hoje.", author: "Franklin Roosevelt" },
  { text: "Estudar não é um fardo, é uma oportunidade de crescer.", author: "Anônimo" },
  { text: "O tempo é o bem mais precioso. Use-o com sabedoria.", author: "Anônimo" },
  { text: "Grandes conquistas começam com pequenos passos consistentes.", author: "Anônimo" },
];

interface MotivationalQuoteProps {
  isRunning?: boolean;
  className?: string;
}

export function MotivationalQuote({ isRunning, className }: MotivationalQuoteProps) {
  const [currentQuote, setCurrentQuote] = useState(quotes[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      changeQuote();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const changeQuote = () => {
    setIsAnimating(true);
    setTimeout(() => {
      const newQuote = quotes[Math.floor(Math.random() * quotes.length)];
      setCurrentQuote(newQuote);
      setIsAnimating(false);
    }, 300);
  };

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/[0.04] p-4 sm:p-5",
      className
    )}>
      {/* Decorative glow */}
      <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="relative flex items-start gap-3">
        <div className="shrink-0 mt-0.5 p-1.5 rounded-lg bg-primary/10">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className={cn(
          "flex-1 min-w-0 transition-all duration-300",
          isAnimating && "opacity-0 translate-y-2"
        )}>
          <p className="text-sm text-foreground/85 italic leading-relaxed line-clamp-3 font-medium">
            "{currentQuote.text}"
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-medium">
            — {currentQuote.author}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground/50 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={changeQuote}
          title="Nova frase"
        >
          <RefreshCw className={cn(
            "h-3.5 w-3.5 transition-transform",
            isAnimating && "animate-spin"
          )} />
        </Button>
      </div>
    </div>
  );
}
