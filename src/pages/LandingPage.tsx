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
  Brain,
  Network,
  Sparkles,
  ArrowRight,
  Layers,
  Zap,
  Bell,
  Lock,
  Palette,
  Smartphone,
} from "lucide-react";
import { motion } from "framer-motion";
import { Footer } from "@/components/landing/Footer";
import { ContactForm } from "@/components/landing/ContactForm";
import { WhatsAppButton, WhatsAppInlineButton } from "@/components/landing/WhatsAppButton";
import { AuthorshipNotice } from "@/components/legal/AuthorshipNotice";

const WHATSAPP_NUMBER = "+5586981625526";

const LandingPage = () => {
  const modules = [
    { icon: BarChart3, title: "Dashboard", desc: "Métricas de estudo, metas e evolução em tempo real." },
    { icon: BookOpen, title: "Cursos", desc: "Módulos hierárquicos, progresso por horas e categorias." },
    { icon: Calendar, title: "Planejamentos", desc: "Cronogramas semanais e blocos de estudo por curso." },
    { icon: CheckSquare, title: "Tarefas", desc: "Prioridades, prazos e lembretes automáticos." },
    { icon: BookOpen, title: "Biblioteca", desc: "Leitor PDF/EPUB com anotações e progresso." },
    { icon: Brain, title: "Flashcards", desc: "Repetição espaçada SM-2 e geração por IA." },
    { icon: Network, title: "Mapas Mentais", desc: "Editor visual com nós, arestas e IA." },
    { icon: Sparkles, title: "Assistente IA", desc: "Resumos, dúvidas e geração de material." },
    { icon: Trophy, title: "Conquistas", desc: "XP, níveis e recompensas por período." },
    { icon: Shield, title: "AntiVício", desc: "Controle de impulsos e sequência de dias limpos." },
    { icon: StickyNote, title: "Notas", desc: "Diário de estudos com editor rico." },
    { icon: Share2, title: "Redes", desc: "Perfis sociais centralizados." },
  ];

  const platform = [
    { icon: Smartphone, title: "PWA Instalável", desc: "App no celular e desktop, funciona offline." },
    { icon: Bell, title: "Notificações FCM", desc: "Lembretes de foco, revisão e leitura." },
    { icon: Lock, title: "Segurança & LGPD", desc: "RLS por usuário e consentimento explícito." },
    { icon: Palette, title: "Temas Customizáveis", desc: "Grafite, claro, escuro e builder visual." },
  ];

  return (
    <div className="min-h-screen w-full bg-[#0f1012] text-white font-body overflow-x-hidden selection:bg-[#f0a71a]/30">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[#0f1012]/70 border-b border-[#2a2b30]/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#f0a71a] to-[#2a2b30] grid place-items-center shadow-lg shadow-[#f0a71a]/20">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">FD-Planner</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="#modules" className="hidden md:inline text-sm text-gray-400 hover:text-white transition-colors px-3 py-2">
              Módulos
            </a>
            <a href="#platform" className="hidden md:inline text-sm text-gray-400 hover:text-white transition-colors px-3 py-2">
              Plataforma
            </a>
            <a href="#contact" className="hidden md:inline text-sm text-gray-400 hover:text-white transition-colors px-3 py-2">
              Contato
            </a>
            <Link to="/auth">
              <Button size="sm" className="bg-[#f0a71a] hover:bg-[#d99110] text-white shadow-lg shadow-[#f0a71a]/20 h-9">
                Acessar
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero + CTA — Bento principal */}
      <section className="relative pt-24 pb-12 md:pt-28 md:pb-16 px-4 sm:px-6 md:px-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[50%] h-[50%] bg-[#f0a71a]/10 blur-[120px] rounded-full" />
          <div className="absolute -bottom-40 -right-40 w-[40%] h-[40%] bg-[#2a2b30]/25 blur-[100px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 auto-rows-[minmax(120px,auto)]">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="md:col-span-8 md:row-span-3 bg-gradient-to-br from-[#17181b] to-[#0f1012] rounded-[2rem] p-8 md:p-12 border border-[#2a2b30]/50 flex flex-col justify-center gap-6 shadow-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f0a71a]/10 border border-[#f0a71a]/20 text-[#f0a71a] text-sm font-medium w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-[#f0a71a] animate-pulse" />
              FD-Planner v2.0
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight tracking-tight">
              Domine seu tempo,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f0a71a] to-[#f5c05a]">
                desenhe seu futuro.
              </span>
            </h1>
            <p className="text-gray-400 text-lg md:text-xl max-w-xl leading-relaxed">
              A plataforma definitiva para quem busca clareza mental e produtividade intencional
              através do planejamento estratégico — estudos, foco, biblioteca e IA em um só lugar.
            </p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="md:col-span-4 md:row-span-3 bg-[#f0a71a] rounded-[2rem] p-8 flex flex-col justify-between items-start group overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-4 opacity-20 transform group-hover:scale-110 transition-transform">
              <Layers className="h-28 w-28 text-white" strokeWidth={1} />
            </div>
            <div className="relative z-10">
              <h2 className="font-display text-3xl font-bold mb-4 leading-tight">
                Pronto para a evolução?
              </h2>
              <p className="text-indigo-100/80 mb-8">
                Crie sua conta ou entre no modo visitante e explore todos os módulos.
              </p>
            </div>
            <div className="w-full flex flex-col gap-3 relative z-10">
              <Link to="/auth" className="w-full">
                <Button className="w-full py-4 h-auto bg-white text-[#0f1012] hover:bg-amber-50 font-bold rounded-xl shadow-lg shadow-black/10">
                  Começar Agora
                </Button>
              </Link>
              <Link to="/auth" className="w-full">
                <Button
                  variant="outline"
                  className="w-full py-4 h-auto bg-[#17181b]/20 hover:bg-white/10 text-white border-white/10 font-medium rounded-xl"
                >
                  Entrar na Conta
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Feature: Focus */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="md:col-span-4 md:row-span-2 bg-[#17181b]/40 backdrop-blur-md rounded-[2rem] p-8 border border-[#2a2b30]/30 hover:border-[#f0a71a]/50 transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#2a2b30] flex items-center justify-center mb-6 text-[#f0a71a]">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">Deep Focus</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Pomodoro persistente com histórico, streaks e vinculação por curso — mesmo com aba fechada.
            </p>
          </motion.div>

          {/* Feature: Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="md:col-span-5 md:row-span-2 bg-[#17181b]/40 backdrop-blur-md rounded-[2rem] p-8 border border-[#2a2b30]/30 hover:border-[#f0a71a]/50 transition-all"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#2a2b30] flex items-center justify-center text-[#f0a71a]">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div className="flex gap-1 items-end h-10">
                <div className="w-2 bg-[#f0a71a]/40 h-[40%] rounded-full" />
                <div className="w-2 bg-[#f0a71a]/60 h-[70%] rounded-full" />
                <div className="w-2 bg-[#f0a71a] h-full rounded-full" />
                <div className="w-2 bg-[#f0a71a]/50 h-[60%] rounded-full" />
              </div>
            </div>
            <h3 className="font-display text-xl font-bold mb-2">Insights Visuais</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Gráficos de horas, comparativos semanais e evolução por curso. Relatórios exportáveis em PDF.
            </p>
          </motion.div>

          {/* Manifesto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-3 md:row-span-2 bg-gradient-to-b from-[#2a2b30]/40 to-transparent rounded-[2rem] p-8 border border-[#2a2b30]/30 flex flex-col justify-center items-center text-center"
          >
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#f0a71a] mb-2">
              Manifesto
            </span>
            <p className="font-display text-lg italic font-light text-gray-300">
              "Onde há foco, há poder."
            </p>
          </motion.div>
        </div>
      </section>

      {/* Módulos em Bento */}
      <section id="modules" className="relative py-16 md:py-24 px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#f0a71a]">
              Módulos do sistema
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mt-3 leading-tight">
              12 módulos integrados em uma <span className="text-[#f0a71a]">única plataforma</span>.
            </h2>
            <p className="text-gray-400 mt-4">
              Cada bloco é um subsistema completo, projetado para atender uma necessidade específica do seu fluxo de estudos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                className="group relative rounded-3xl border border-[#2a2b30]/40 bg-[#17181b]/40 backdrop-blur-md p-6 hover:border-[#f0a71a]/50 hover:-translate-y-0.5 transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#2a2b30] flex items-center justify-center text-[#f0a71a] mb-4">
                  <m.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-bold text-lg mb-1">{m.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{m.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Plataforma */}
      <section id="platform" className="relative py-16 md:py-24 px-4 sm:px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-10">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#f0a71a]">
              Plataforma
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-bold mt-3 leading-tight">
              Uma base <span className="text-[#f0a71a]">sólida</span> em toda a experiência.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {platform.map((f) => (
              <div
                key={f.title}
                className="rounded-3xl border border-[#2a2b30]/40 bg-[#17181b]/40 backdrop-blur-md p-6"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#2a2b30] flex items-center justify-center text-[#f0a71a] mb-4">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-bold text-base mb-1">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="relative py-20 md:py-28 px-4 sm:px-6 md:px-12">
        <div className="max-w-5xl mx-auto rounded-[2rem] border border-[#2a2b30]/50 bg-gradient-to-br from-[#17181b] to-[#0f1012] p-10 md:p-16 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-[#f0a71a]/20 blur-[100px] rounded-full" />
          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight mb-4">
              Sua próxima sessão de foco começa agora.
            </h2>
            <p className="text-gray-400 mb-8">
              Cadastre-se em segundos e transforme sua rotina de estudos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/auth">
                <Button className="bg-[#f0a71a] hover:bg-[#d99110] text-white px-8 py-6 h-auto rounded-xl shadow-lg shadow-[#f0a71a]/20">
                  Acessar Plataforma <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <WhatsAppInlineButton phoneNumber={WHATSAPP_NUMBER} className="px-8 py-6 h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contact" className="relative py-16 md:py-24 px-4 sm:px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#f0a71a]">
              Contato
            </span>
            <h2 className="font-display text-3xl md:text-4xl font-bold mt-3">Fale conosco</h2>
            <p className="text-gray-400 mt-3">Dúvidas, sugestões ou feedback? Escreva pra gente.</p>
          </div>
          <div className="rounded-3xl border border-[#2a2b30]/40 bg-[#17181b]/40 backdrop-blur-md p-6 md:p-8">
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
