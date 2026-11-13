import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Timer,
  Calendar,
  CheckSquare,
  StickyNote,
  Shield,
  BarChart3,
  Trophy,
  Share2,
  Sparkles,
  ArrowRight,
  Zap,
  Bell,
  Lock,
  Palette,
  Smartphone,
  Library,
  Flame,
  FolderOpen,
  Clock,
  Target,
  Rocket,
  WifiOff,
} from "lucide-react";
import { motion } from "framer-motion";
import { Footer } from "@/components/landing/Footer";
import { ContactForm } from "@/components/landing/ContactForm";
import { WhatsAppButton, WhatsAppInlineButton } from "@/components/landing/WhatsAppButton";
import { AuthorshipNotice } from "@/components/legal/AuthorshipNotice";

const WHATSAPP_NUMBER = "+5586981625526";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
};

const modules = [
  { icon: BarChart3, title: "Dashboard", desc: "Métricas de estudo, metas e evolução em tempo real." },
  { icon: BookOpen, title: "Cursos", desc: "Módulos, progresso por horas e total por categoria." },
  { icon: Calendar, title: "Planejamentos", desc: "Cronogramas semanais e blocos de estudo por curso." },
  { icon: CheckSquare, title: "Tarefas", desc: "Prioridades, prazos e lembretes automáticos." },
  { icon: Library, title: "Biblioteca", desc: "Leitor PDF/EPUB com anotações e progresso." },
  { icon: Sparkles, title: "Assistente IA", desc: "Resumos, dúvidas e geração de material." },
  { icon: Trophy, title: "Conquistas", desc: "XP, níveis e recompensas por período." },
  { icon: Shield, title: "AntiVício", desc: "Controle de impulsos e sequência de dias limpos." },
  { icon: StickyNote, title: "Notas", desc: "Diário de estudos com editor rico." },
  { icon: Share2, title: "Redes", desc: "Perfis sociais e currículo centralizados." },
];

const platform = [
  { icon: Smartphone, title: "PWA instalável", desc: "App no celular e no computador, funciona offline." },
  { icon: Bell, title: "Notificações", desc: "Lembretes de foco, revisão e leitura." },
  { icon: Lock, title: "Segurança & LGPD", desc: "Dados isolados por usuário e consentimento explícito." },
  { icon: Palette, title: "Temas", desc: "Grafite, claro, escuro e personalização visual." },
];

const steps = [
  { icon: BookOpen, title: "Cadastre seus cursos", desc: "Adicione módulos, carga horária e categorias. O total de horas é somado automaticamente." },
  { icon: Target, title: "Planeje e foque", desc: "Gere cronogramas, ative o modo foco e registre cada sessão sem esforço." },
  { icon: Rocket, title: "Acompanhe a evolução", desc: "Veja horas por categoria, ofensivas e relatórios para manter o ritmo." },
];

const previewCategories = [
  { name: "Desenvolvimento Web", hours: "86:30:00", pct: 72 },
  { name: "Dados & IA", hours: "42:15:00", pct: 48 },
  { name: "Idiomas", hours: "18:00:00", pct: 31 },
];

function BrandMark({ size = "md" }: { readonly size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-8 w-8 rounded-lg" : "h-9 w-9 rounded-xl";
  return (
    <div className={`${box} grid place-items-center bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-[var(--shadow-glow)]`}>
      <Zap className="h-4 w-4" strokeWidth={2.5} />
    </div>
  );
}

function SectionHeader({ eyebrow, title, desc, center }: { readonly eyebrow: string; readonly title: React.ReactNode; readonly desc?: string; readonly center?: boolean }) {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.5 }} className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
        <span className="h-px w-6 bg-primary/60" />
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-bold leading-[1.1] md:text-5xl">{title}</h2>
      {desc && <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">{desc}</p>}
    </motion.div>
  );
}

function ProductPreview() {
  return (
    <div className="relative">
      <div aria-hidden className="brand-glow absolute -inset-10 -z-10" />
      <div className="brand-card brand-ring overflow-hidden rounded-3xl">
        {/* window chrome */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground">fd-planner · Cursos</span>
          <span className="w-10" />
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-5">
          {/* focus */}
          <div className="rounded-2xl border border-border bg-muted/40 p-4 sm:col-span-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Timer className="h-3.5 w-3.5" /> Sessão de foco
            </p>
            <div className="relative mx-auto mt-4 grid h-28 w-28 place-items-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                <motion.circle
                  cx="50" cy="50" r="44" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={276}
                  initial={{ strokeDashoffset: 276 }}
                  animate={{ strokeDashoffset: 80 }}
                  transition={{ duration: 1.6, ease: "easeOut", delay: 0.4 }}
                />
              </svg>
              <div className="text-center">
                <p className="font-mono text-xl font-semibold tabular-nums">17:42</p>
                <p className="text-[10px] text-muted-foreground">restantes</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-background/60 px-3 py-2 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground"><Flame className="h-3.5 w-3.5 text-accent" /> Ofensiva</span>
              <span className="font-semibold">12 dias</span>
            </div>
          </div>

          {/* category hours */}
          <div className="rounded-2xl border border-border bg-muted/40 p-4 sm:col-span-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Horas por categoria
              </p>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">146:45:00</span>
            </div>
            <ul className="mt-4 space-y-3.5">
              {previewCategories.map((c, i) => (
                <li key={c.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium"><FolderOpen className="h-3.5 w-3.5 text-primary" />{c.name}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">{c.hours}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background/70">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow"
                      initial={{ width: 0 }}
                      animate={{ width: `${c.pct}%` }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.15, ease: "easeOut" }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] text-muted-foreground">Soma de todos os cursos · 9 cursos</p>
          </div>

          {/* week bars */}
          <div className="rounded-2xl border border-border bg-muted/40 p-4 sm:col-span-5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Esta semana</span>
              <span className="text-success">+18% vs. anterior</span>
            </div>
            <div className="mt-3 flex h-16 items-end gap-2">
              {[38, 62, 45, 80, 52, 70, 92].map((h, i) => (
                <motion.div
                  key={i}
                  className={`flex-1 rounded-md ${i === 6 ? "bg-primary" : "bg-primary/25"}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.7, delay: 0.3 + i * 0.06 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* floating chip */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.1 }}
        className="brand-card absolute -bottom-5 -left-4 hidden items-center gap-3 rounded-2xl px-4 py-3 sm:flex"
      >
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-accent/15 text-accent">
          <Trophy className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold">Módulo concluído</p>
          <p className="text-[11px] text-muted-foreground">+120 XP · Nível 8</p>
        </div>
      </motion.div>
    </div>
  );
}

const LandingPage = () => {
  return (
    <div className="brand-surface min-h-screen w-full overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <span className="font-display text-lg font-bold">FD-Planner</span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {[
              ["#recursos", "Recursos"],
              ["#modulos", "Módulos"],
              ["#como-funciona", "Como funciona"],
              ["#contato", "Contato"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden h-9 text-muted-foreground hover:bg-muted hover:text-foreground sm:inline-flex">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="h-9 rounded-lg font-semibold shadow-[var(--shadow-glow)]">
              <Link to="/auth">
                Começar grátis <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative px-4 pb-20 pt-32 sm:px-6 md:pb-28 md:pt-40">
        <div aria-hidden className="brand-grid pointer-events-none absolute inset-0" />
        <div aria-hidden className="brand-glow pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <a href="#recursos" className="group inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 py-1 pl-1 pr-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground">
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">Novo</span>
              Horas por categoria nos cursos
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </a>
            <h1 className="mt-6 text-5xl font-bold leading-[1.02] sm:text-6xl lg:text-7xl">
              Domine seu tempo,{" "}
              <span className="text-brand-gradient">desenhe seu futuro.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Cursos, foco, planejamento, biblioteca e IA em um só lugar — para você concluir o que começou, com clareza sobre cada hora estudada.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-xl px-7 text-base font-semibold shadow-[var(--shadow-glow)]">
                <Link to="/auth">
                  Começar agora <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl border-border bg-muted/40 px-7 text-base hover:bg-muted hover:text-foreground">
                <a href="#como-funciona">Ver como funciona</a>
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
              {[
                [WifiOff, "Funciona offline"],
                [Lock, "Seguro & LGPD"],
                [Sparkles, "Assistente com IA"],
              ].map(([Icon, label]) => {
                const I = Icon as typeof Lock;
                return (
                  <span key={label as string} className="flex items-center gap-2">
                    <I className="h-4 w-4 text-primary" /> {label as string}
                  </span>
                );
              })}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 30, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }}>
            <ProductPreview />
          </motion.div>
        </div>
      </header>

      {/* Stats strip */}
      <section className="border-y border-border/60 bg-muted/20 px-4 sm:px-6">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-border/60 md:grid-cols-4 md:divide-x">
          {[
            ["12+", "módulos integrados"],
            ["100%", "offline após instalar"],
            ["HH:MM:SS", "precisão nas horas"],
            ["0 R$", "para começar"],
          ].map(([k, v]) => (
            <div key={v} className="px-4 py-8 text-center">
              <p className="font-display text-2xl font-bold text-foreground md:text-3xl">{k}</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature bento */}
      <section id="recursos" className="scroll-mt-20 px-4 py-24 sm:px-6 md:py-32">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Recursos"
            title={<>Tudo o que você precisa para <span className="text-primary">terminar o que começou</span>.</>}
            desc="Ferramentas pensadas para manter o foco, medir o progresso real e transformar intenção em hábito."
          />
          <div className="mt-14 grid gap-4 md:grid-cols-6">
            <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="brand-card group overflow-hidden rounded-3xl p-8 md:col-span-4">
              <div className="flex items-start justify-between gap-6">
                <div className="max-w-sm">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Clock className="h-5 w-5" /></div>
                  <h3 className="mt-6 text-2xl font-bold">Horas por categoria</h3>
                  <p className="mt-2 text-muted-foreground">Veja o total de horas de cada categoria e a soma de todos os seus cursos — com o quanto já foi concluído e o que ainda falta.</p>
                </div>
                <div className="hidden shrink-0 rounded-2xl border border-border bg-background/60 p-4 sm:block">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Soma total</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-primary">146:45:00</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">em 3 categorias</p>
                </div>
              </div>
            </motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="brand-card rounded-3xl p-8 md:col-span-2">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/15 text-accent"><Zap className="h-5 w-5" /></div>
              <h3 className="mt-6 text-xl font-bold">Deep Focus</h3>
              <p className="mt-2 text-sm text-muted-foreground">Pomodoro persistente com histórico e ofensivas — mesmo com a aba fechada.</p>
            </motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="brand-card rounded-3xl p-8 md:col-span-2">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Library className="h-5 w-5" /></div>
              <h3 className="mt-6 text-xl font-bold">Biblioteca</h3>
              <p className="mt-2 text-sm text-muted-foreground">Leia PDF e EPUB com marcadores, anotações e leitura offline.</p>
            </motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.05 }} className="brand-card rounded-3xl p-8 md:col-span-2">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-success/15 text-success"><BarChart3 className="h-5 w-5" /></div>
              <h3 className="mt-6 text-xl font-bold">Insights visuais</h3>
              <p className="mt-2 text-sm text-muted-foreground">Gráficos de horas, comparativos semanais e relatórios em PDF.</p>
            </motion.div>
            <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }} className="brand-card rounded-3xl p-8 md:col-span-2">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></div>
              <h3 className="mt-6 text-xl font-bold">Assistente IA</h3>
              <p className="mt-2 text-sm text-muted-foreground">Resumos, explicações e planos de leitura gerados para você.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modulos" className="scroll-mt-20 px-4 pb-24 sm:px-6 md:pb-32">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            eyebrow="Módulos"
            title={<>Um sistema completo, <span className="text-primary">uma única plataforma</span>.</>}
            desc="Cada módulo resolve uma parte do seu fluxo de estudos — e todos conversam entre si."
          />
          <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-5">
            {modules.map((m, i) => (
              <motion.div
                key={m.title}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                className="group bg-background p-6 transition-colors hover:bg-card"
              >
                <m.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                <h3 className="mt-5 text-base font-semibold">{m.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="scroll-mt-20 border-y border-border/60 bg-muted/20 px-4 py-24 sm:px-6 md:py-32">
        <div className="mx-auto max-w-7xl">
          <SectionHeader center eyebrow="Como funciona" title="Três passos para estudar com método." />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div key={s.title} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.08 }} className="brand-card rounded-3xl p-8">
                <div className="flex items-center justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></div>
                  <span className="font-display text-5xl font-bold text-border">0{i + 1}</span>
                </div>
                <h3 className="mt-6 text-xl font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform */}
      <section className="px-4 py-24 sm:px-6 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <SectionHeader
            eyebrow="Plataforma"
            title={<>Uma base <span className="text-primary">sólida</span> em toda a experiência.</>}
            desc="Instale no celular, receba lembretes e mantenha seus dados protegidos — com a aparência que você preferir."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            {platform.map((f, i) => (
              <motion.div key={f.title} {...fadeUp} transition={{ duration: 0.4, delay: i * 0.05 }} className="brand-card rounded-2xl p-6">
                <f.icon className="h-5 w-5 text-primary" />
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-24 sm:px-6 md:pb-32">
        <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="brand-card relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] px-6 py-16 text-center md:px-16 md:py-24">
          <div aria-hidden className="brand-grid pointer-events-none absolute inset-0 opacity-70" />
          <div aria-hidden className="brand-glow pointer-events-none absolute -top-32 left-1/2 h-80 w-[560px] -translate-x-1/2" />
          <div aria-hidden className="brand-glow-accent pointer-events-none absolute -bottom-24 right-0 h-64 w-96" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold leading-tight md:text-5xl">Sua próxima sessão de foco começa agora.</h2>
            <p className="mt-4 text-lg text-muted-foreground">Crie sua conta em segundos ou explore tudo no modo visitante.</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-xl px-8 text-base font-semibold shadow-[var(--shadow-glow)]">
                <Link to="/auth">Acessar plataforma <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <WhatsAppInlineButton phoneNumber={WHATSAPP_NUMBER} className="h-12 rounded-xl px-8" />
            </div>
          </div>
        </motion.div>
      </section>

      {/* Contact */}
      <section id="contato" className="scroll-mt-20 px-4 pb-24 sm:px-6 md:pb-32">
        <div className="mx-auto max-w-3xl">
          <SectionHeader center eyebrow="Contato" title="Fale conosco" desc="Dúvidas, sugestões ou feedback? Escreva pra gente." />
          <div className="brand-card mt-10 rounded-3xl p-6 md:p-8">
            <ContactForm />
          </div>
        </div>
      </section>

      <AuthorshipNotice variant="section" />
      <Footer />
      <WhatsAppButton phoneNumber={WHATSAPP_NUMBER} />
    </div>
  );
};

export default LandingPage;
