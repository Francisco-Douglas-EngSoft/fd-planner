import { motion } from "framer-motion";
import { LayoutDashboard, BookOpen, LineChart, Target, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const navMain = [
  { label: "Visão geral", icon: LayoutDashboard, active: true },
  { label: "Diário de estudos", icon: BookOpen, active: false },
  { label: "Análises", icon: LineChart, active: false },
];
const navGoals = [
  { label: "Metas", icon: Target, active: false },
  { label: "Relatórios", icon: FileText, active: false },
];

const bars = [40, 60, 55, 80, 95, 70, 85];
const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const weekly = [
  { label: "Cálculo Avançado", value: "12/15h", pct: 80, tone: "primary" as const },
  { label: "Estrutura de Dados", value: "8/8h", pct: 100, tone: "success" as const },
  { label: "Escrita Acadêmica", value: "4/10h", pct: 40, tone: "primary" as const },
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
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <Badge variant="outline" className="mb-4 px-4 py-1.5">
            <LineChart className="h-3 w-3 mr-1" />
            Visão do produto
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold font-display mb-3">
            Seus estudos em <span className="text-primary">dados claros</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Um exemplo do painel: horas estudadas, metas semanais e evolução — tudo em um só lugar.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="max-w-6xl mx-auto rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
        >
          {/* Browser chrome */}
          <div className="bg-muted/60 px-6 py-3 border-b border-border flex items-center justify-between">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-border" />
              <div className="w-3 h-3 rounded-full bg-border" />
              <div className="w-3 h-3 rounded-full bg-border" />
            </div>
            <div className="bg-card px-8 py-1 rounded-md text-[10px] text-muted-foreground font-medium border border-border/60">
              app.fd-planner.com/dashboard
            </div>
            <div className="w-12" />
          </div>

          <div className="p-6 sm:p-8 flex flex-col lg:flex-row gap-8">
            {/* Sidebar preview */}
            <aside className="hidden lg:block w-48 space-y-6 pt-1">
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2">
                  Menu
                </div>
                {navMain.map((item) => (
                  <div
                    key={item.label}
                    className={
                      item.active
                        ? "flex items-center gap-2 bg-primary/10 text-primary px-3 py-2 rounded-lg text-sm font-medium border-l-2 border-primary"
                        : "flex items-center gap-2 text-muted-foreground px-3 py-2 rounded-lg text-sm font-medium"
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-3 mb-2">
                  Metas
                </div>
                {navGoals.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-muted-foreground px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </div>
                ))}
              </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 space-y-8">
              {/* KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-muted/40 p-5 rounded-xl border border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Total de horas</div>
                  <div className="text-2xl font-semibold text-foreground">142,5h</div>
                  <div className="text-[10px] text-primary mt-2 font-medium">+12% na semana</div>
                </div>
                <div className="bg-muted/40 p-5 rounded-xl border border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Metas concluídas</div>
                  <div className="text-2xl font-semibold text-foreground">88,4%</div>
                  <div className="w-full bg-muted h-1.5 mt-3 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full" style={{ width: "88%" }} />
                  </div>
                </div>
                <div className="bg-muted/40 p-5 rounded-xl border border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Sequência atual</div>
                  <div className="text-2xl font-semibold text-foreground">14 dias</div>
                  <div className="text-[10px] text-muted-foreground mt-2">Recorde: 21 dias</div>
                </div>
              </div>

              {/* Chart + weekly goals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Evolution bar chart */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Evolução de horas</h3>
                  <div className="h-48 w-full bg-muted/40 rounded-xl relative flex items-end justify-between p-4 border border-border">
                    {bars.map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${h}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.06 }}
                        className="w-4 bg-primary rounded-t-sm"
                        style={{ opacity: 0.55 + (h / 100) * 0.45 }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground px-2 font-medium">
                    {days.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </div>
                </div>

                {/* Weekly progress */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Progresso semanal</h3>
                  <div className="space-y-5">
                    {weekly.map((w) => (
                      <div key={w.label} className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{w.label}</span>
                          <span className="font-medium text-foreground">{w.value}</span>
                        </div>
                        <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${w.pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.7 }}
                            className={w.tone === "success" ? "bg-success h-full" : "bg-primary h-full"}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};