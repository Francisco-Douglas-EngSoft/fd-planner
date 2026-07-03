import { motion } from "framer-motion";
import {
  LineChart,
  Flame,
  Clock,
  Trophy,
  Timer,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const bars = [
  { d: "Seg", h: 40 },
  { d: "Ter", h: 65 },
  { d: "Qua", h: 50 },
  { d: "Qui", h: 85 },
  { d: "Sex", h: 45 },
  { d: "Sáb", h: 70 },
  { d: "Dom", h: 95 },
];

const weekHeat = [true, true, true, true, false, false, false];

const tasks = [
  { label: "Revisão de Biologia", done: true },
  { label: "Simulado de Matemática", done: false },
  { label: "Redação: estrutura", done: false },
  { label: "Vocabulário de Inglês", done: false },
];

export const DashboardPreview = () => {
  return (
    <section className="py-16 sm:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <Badge variant="outline" className="mb-4 px-4 py-1.5">
            <LineChart className="h-3 w-3 mr-1" />
            Visão do produto
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display mb-3">
            Seus estudos em <span className="text-primary">dados claros</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Um panorama do painel: horas, metas, ofensiva, foco e tarefas — tudo em uma só tela.
          </p>
        </motion.div>

        {/* Bento grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-6xl mx-auto grid grid-cols-12 auto-rows-[120px] gap-4"
        >
          {/* Evolution chart — large */}
          <div className="col-span-12 md:col-span-8 row-span-3 rounded-3xl border border-border bg-card p-6 shadow-card flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display font-bold text-lg">Evolução de horas</h3>
                <p className="text-xs text-muted-foreground">Produtividade dos últimos 7 dias</p>
              </div>
              <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-lg">
                Últimos 7 dias
              </span>
            </div>
            <div className="flex-1 flex items-end justify-between gap-3 rounded-2xl bg-muted/40 p-5">
              {bars.map((b, i) => (
                <div key={b.d} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: `${b.h}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.06 }}
                    className={
                      i === bars.length - 1
                        ? "w-full rounded-t-lg bg-primary"
                        : "w-full rounded-t-lg bg-accent/70"
                    }
                  />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">{b.d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Streak KPI — dark */}
          <div className="col-span-6 md:col-span-4 row-span-1 rounded-3xl bg-primary text-primary-foreground p-6 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-xs font-medium opacity-70">Ofensiva</p>
              <p className="font-display font-bold text-2xl">14 dias</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/10">
              <Flame className="h-6 w-6" />
            </div>
          </div>

          {/* Focus KPI */}
          <div className="col-span-6 md:col-span-4 row-span-1 rounded-3xl border border-border bg-card p-6 shadow-card flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Foco total</p>
              <p className="font-display font-bold text-2xl">142,5h</p>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Clock className="h-6 w-6" />
            </div>
          </div>

          {/* Ranking KPI */}
          <div className="col-span-12 md:col-span-4 row-span-1 rounded-3xl border border-border bg-muted/50 p-6 flex items-center gap-4">
            <div className="h-11 w-11 flex-shrink-0 rounded-full bg-accent/15 text-accent flex items-center justify-center font-display font-bold">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-sm">Metas concluídas</p>
              <p className="text-xs text-muted-foreground">88,4% neste mês</p>
            </div>
          </div>

          {/* Weekly progress */}
          <div className="col-span-12 md:col-span-5 row-span-2 rounded-3xl border border-border bg-card p-6 shadow-card">
            <h3 className="font-display font-bold text-sm mb-4">Progresso semanal</h3>
            <div className="space-y-1 mb-5">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Meta semanal</span>
                <span>75%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "75%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7 }}
                  className="h-full rounded-full bg-primary"
                />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {weekHeat.map((active, i) => (
                <div
                  key={i}
                  className={active ? "h-9 rounded-md bg-primary" : "h-9 rounded-md bg-muted"}
                />
              ))}
            </div>
          </div>

          {/* Pomodoro */}
          <div className="col-span-12 md:col-span-3 row-span-2 rounded-3xl bg-accent text-accent-foreground p-6 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Pomodoro</span>
              <span className="flex h-2 w-2 rounded-full bg-white animate-pulse" />
            </div>
            <div className="text-center">
              <p className="font-display font-bold text-4xl">21:04</p>
              <p className="text-[10px] uppercase tracking-wide opacity-70 mt-1 flex items-center justify-center gap-1">
                <Timer className="h-3 w-3" /> Foco intenso
              </p>
            </div>
            <div className="w-full py-2 rounded-xl bg-white/15 text-center text-xs font-semibold">
              Pausar
            </div>
          </div>

          {/* Tasks */}
          <div className="col-span-12 md:col-span-4 row-span-2 rounded-3xl border border-border bg-card p-6 shadow-card">
            <h3 className="font-display font-bold text-sm mb-4">Próximas tarefas</h3>
            <ul className="space-y-3">
              {tasks.map((t) => (
                <li key={t.label} className="flex items-center gap-3">
                  {t.done ? (
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span
                    className={
                      t.done
                        ? "text-sm text-muted-foreground line-through"
                        : "text-sm text-foreground"
                    }
                  >
                    {t.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
