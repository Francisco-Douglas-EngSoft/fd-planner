import { 
  Rocket, 
  Brain, 
  Gamepad2, 
  Share2, 
  Zap, 
  Layout,
  MessageSquare,
  Trophy,
  Globe,
  Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const expansionItems = [
  {
    category: "UX/UI & Acessibilidade",
    icon: Layout,
    color: "blue",
    items: [
      { title: "Modo Offline PWA", desc: "Sincronização robusta sem internet", status: "Em progresso" },
      { title: "Temas Customizados", desc: "Criação de paletas pelo usuário", status: "Planejado" },
      { title: "Micro-interações", desc: "Feedback visual com Framer Motion", status: "Planejado" }
    ]
  },
  {
    category: "Inteligência Artificial",
    icon: Brain,
    color: "violet",
    items: [
      { title: "Tutor por Disciplina", desc: "IA com contexto dos seus livros", status: "Planejado" },
      { title: "Auto-Flashcards", desc: "Geração de cards a partir de notas", status: "Planejado" },
      { title: "Sumarização", desc: "Resumos de PDFs e vídeos", status: "Planejado" }
    ]
  },
  {
    category: "Gamificação",
    icon: Gamepad2,
    color: "emerald",
    items: [
      { title: "Ligas Semanais", desc: "Competição baseada em XP", status: "Planejado" },
      { title: "Badges de Especialista", desc: "Marcos por categoria de estudo", status: "Planejado" },
      { title: "GitHub-style Streaks", desc: "Visualização de consistência", status: "Planejado" }
    ]
  },
  {
    category: "Ecossistema",
    icon: Share2,
    color: "orange",
    items: [
      { title: "Marketplace", desc: "Compartilhamento de cronogramas", status: "Planejado" },
      { title: "Sincronização Agenda", desc: "Google Calendar & Outlook", status: "Planejado" },
      { title: "Comunidades", desc: "Grupos de estudo por interesse", status: "Planejado" }
    ]
  }
];

export function ExpansionPlan() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {expansionItems.map((cat, idx) => {
          const Icon = cat.icon;
          return (
            <Card key={idx} className="tint-card relative overflow-hidden" style={{ ['--tint' as string]: `var(--tint-${cat.color})` }}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <div className="tint-icon rounded-lg p-2">
                    <Icon className="h-5 w-5" />
                  </div>
                  {cat.category}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cat.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                    </div>
                    <Badge variant={item.status === "Em progresso" ? "default" : "outline"} className="shrink-0 text-[10px]">
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 space-y-2">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                Missão FD-Planner 2027
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Nossa visão é transformar o FD-Planner na ferramenta definitiva de aprendizado autodidata, 
                unindo o poder da IA generativa com métodos científicos de memorização e uma interface 
                extremamente limpa e focada.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
              <div className="p-3 bg-background border border-border rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Escalabilidade</p>
                <p className="text-lg font-bold">100%</p>
              </div>
              <div className="p-3 bg-background border border-border rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Foco em IA</p>
                <p className="text-lg font-bold">Alta</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
