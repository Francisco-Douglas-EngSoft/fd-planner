import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Timer, BookOpen, Sparkles } from "lucide-react";

const STORAGE_KEY = "fdp_tour_v1_done";

const STEPS = [
  {
    icon: LayoutDashboard,
    title: "Bem-vindo ao FD-Planner",
    body: "Este é o seu painel central. Aqui você acompanha estudos, foco, tarefas e hábitos em um só lugar.",
  },
  {
    icon: Timer,
    title: "Foco Pomodoro",
    body: "Use a página Foco para cronometrar sessões de estudo. O timer continua rodando mesmo se você fechar o app.",
  },
  {
    icon: BookOpen,
    title: "Cursos e Planejamentos",
    body: "Cadastre seus cursos, defina horários de estudo e acompanhe o progresso semana a semana.",
  },
  {
    icon: Sparkles,
    title: "Busca rápida (Ctrl+K)",
    body: "Pressione Ctrl+K a qualquer momento para navegar, abrir notas e livros.",
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Pequeno delay para não competir com o carregamento inicial.
      const t = setTimeout(() => setOpen(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    setStep(0);
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : finish())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <DialogTitle>{current.title}</DialogTitle>
          <DialogDescription>{current.body}</DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 transition-colors ${
                i === step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <DialogFooter className="mt-4 flex flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={finish} size="sm">
            Pular tour
          </Button>
          <Button
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            size="sm"
          >
            {isLast ? "Concluir" : "Próximo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}