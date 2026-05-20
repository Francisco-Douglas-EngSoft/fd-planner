import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Zap, 
  Clock, 
  ChevronRight,
  CheckCircle2,
  Lightbulb,
  Play
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MinimumActionCardProps {
  title?: string;
  description?: string;
  onStartAction?: () => void;
}

const minimumActions = [
  {
    id: 'study',
    title: 'Estudar',
    minimumAction: 'Abra o material e leia 1 parágrafo',
    fullAction: 'Complete uma sessão de 25 minutos',
    icon: Target,
    color: 'primary',
    tip: 'A maioria continua após começar!',
  },
  {
    id: 'exercise',
    title: 'Exercício',
    minimumAction: 'Vista a roupa de treino',
    fullAction: 'Complete o treino planejado',
    icon: Zap,
    color: 'accent',
    tip: 'O primeiro passo quebra a inércia!',
  },
  {
    id: 'task',
    title: 'Tarefa Difícil',
    minimumAction: 'Trabalhe nela por apenas 2 minutos',
    fullAction: 'Complete a tarefa inteira',
    icon: Clock,
    color: 'success',
    tip: 'Após 2 min, decidir parar é mais difícil!',
  },
];

export function MinimumActionCard({ title, description, onStartAction }: MinimumActionCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-accent/10 to-transparent">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-accent/10">
            <Lightbulb className="h-4 w-4 text-accent" />
          </div>
          <div>
            <CardTitle className="text-base">{title || 'Ação Mínima'}</CardTitle>
            <CardDescription className="text-xs">
              {description || 'Vença a procrastinação com passos pequenos'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="bg-muted/30 rounded-lg p-3 text-sm">
          <p className="font-medium mb-2 flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" />
            Princípio da Ação Mínima
          </p>
          <p className="text-muted-foreground text-xs">
            Quando sentir resistência, comprometa-se apenas com o primeiro passo mínimo. 
            Isso quebra a inércia e geralmente leva à ação completa.
          </p>
        </div>

        <div className="space-y-3">
          {minimumActions.map((action, index) => (
            <div 
              key={action.id}
              className="p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  action.color === 'primary' && "bg-primary/10",
                  action.color === 'accent' && "bg-accent/10",
                  action.color === 'success' && "bg-success/10"
                )}>
                  <action.icon className={cn(
                    "h-4 w-4",
                    action.color === 'primary' && "text-primary",
                    action.color === 'accent' && "text-accent",
                    action.color === 'success' && "text-success"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{action.title}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] shrink-0">MÍNIMO</Badge>
                      <span className="text-xs text-muted-foreground truncate">{action.minimumAction}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] shrink-0">IDEAL</Badge>
                      <span className="text-xs text-muted-foreground truncate">{action.fullAction}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-primary mt-2 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {action.tip}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
          <p className="text-xs text-center font-medium text-primary">
            💡 "Não preciso fazer tudo. Só preciso começar."
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
