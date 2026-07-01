import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Target, 
  Clock, 
  Trophy, 
  Brain, 
  BarChart3,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Timer,
  Calendar,
  FileText,
  Bell,
  Flame,
  LineChart,
  Layers,
  CheckSquare,
  Award,
  TrendingUp,
  Play,
  ChevronDown,
  Mail,
  Palette,
  Download,
  Smartphone,
  Users,
  StickyNote,
  Share2,
  Settings,
  User,
  Monitor,
  Moon,
  Sun,
  Globe,
  Wifi,
  Lock,
  Eye
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/landing/ThemeToggle";
import { Footer } from "@/components/landing/Footer";
import { ContactForm } from "@/components/landing/ContactForm";
import { WhatsAppButton, WhatsAppInlineButton } from "@/components/landing/WhatsAppButton";

const WHATSAPP_NUMBER = "+5586981625526";

const LandingPage = () => {
  // All system modules
  const allModules = [
    {
      icon: BarChart3,
      title: "Dashboard",
      description: "Visão geral completa com estatísticas de horas estudadas, metas semanais, progresso por categoria e gráficos de evolução.",
      details: ["Horas estudadas por semana", "Metas semanais personalizáveis", "Gráfico de evolução mensal", "Progresso por curso e categoria"],
      color: "from-blue-500 to-indigo-600",
    },
    {
      icon: BookOpen,
      title: "Cursos",
      description: "Gerencie todos os seus cursos com módulos hierárquicos, categorias, progresso em horas e importação/exportação de dados.",
      details: ["Módulos e submódulos", "Categorias personalizadas", "Progresso por horas", "Importação e exportação"],
      color: "from-cyan-500 to-blue-500",
    },
    {
      icon: Timer,
      title: "Foco (Pomodoro)",
      description: "Timer Pomodoro inteligente com ciclos configuráveis, sons ambientes, vinculação a cursos e histórico de sessões.",
      details: ["Ciclos de trabalho e pausa", "Sons ambientes relaxantes", "Vinculação com cursos", "Histórico de sessões do dia"],
      color: "from-orange-500 to-red-500",
    },
    {
      icon: Calendar,
      title: "Planejamentos",
      description: "Crie planos de estudo com cursos vinculados, visualize em calendário semanal e mensal, e acompanhe metas diárias.",
      details: ["Planos por período", "Calendário semanal e mensal", "Blocos de tempo configuráveis", "Metas diárias de estudo"],
      color: "from-emerald-500 to-green-600",
    },
    {
      icon: CheckSquare,
      title: "Tarefas",
      description: "Gerencie atividades com prioridades, datas de entrega, lembretes inteligentes e organização por status.",
      details: ["Prioridade alta/média/baixa", "Datas de entrega", "Lembretes automáticos", "Filtros por status"],
      color: "from-violet-500 to-purple-600",
    },
    {
      icon: StickyNote,
      title: "Notas",
      description: "Diário de estudos com editor de texto rico, organização por categorias, vinculação a cursos e busca rápida.",
      details: ["Editor de texto rico", "Categorias e tags", "Vinculação a cursos", "Busca por conteúdo"],
      color: "from-yellow-500 to-amber-600",
    },
    {
      icon: Shield,
      title: "AntiVício",
      description: "Sistema exclusivo para controle de impulsos digitais com check-ins, protocolo de emergência e acompanhamento de sequências.",
      details: ["Botão de impulso rápido", "Check-in diário", "Protocolo de emergência", "Sequência de dias limpos"],
      color: "from-rose-500 to-pink-600",
    },
    {
      icon: BarChart3,
      title: "Relatórios",
      description: "Análise detalhada com gráficos interativos de tempo estudado, comparativos semanais e exportação em PDF.",
      details: ["Gráficos interativos", "Comparativo semanal", "Evolução por período", "Exportação em PDF"],
      color: "from-teal-500 to-cyan-600",
    },
    {
      icon: Trophy,
      title: "Conquistas",
      description: "Sistema de gamificação com badges desbloqueáveis, XP por atividades, níveis de evolução e celebração de marcos.",
      details: ["Badges desbloqueáveis", "Sistema de XP e níveis", "Marcos de progresso", "Motivação contínua"],
      color: "from-amber-500 to-orange-600",
    },
    {
      icon: Share2,
      title: "Redes Sociais",
      description: "Gerencie seus perfis de redes sociais e acompanhe suas conexões diretamente do sistema.",
      details: ["Links de perfis sociais", "Acesso rápido", "Integração centralizada", "Compartilhamento fácil"],
      color: "from-sky-500 to-blue-600",
    },
  ];

  // Platform features (non-module)
  const platformFeatures = [
    { icon: Moon, title: "Temas Múltiplos", desc: "Claro, escuro e temas personalizados com builder visual." },
    { icon: Smartphone, title: "PWA Instalável", desc: "Instale como app no celular ou desktop, funciona offline." },
    { icon: Download, title: "Exportação de Dados", desc: "Exporte relatórios em PDF e dados do banco completo." },
    { icon: Bell, title: "Notificações", desc: "Lembretes de estudo, horários críticos e alertas de metas." },
    { icon: Lock, title: "Privacidade", desc: "Dados protegidos com RLS, consentimento LGPD e controle total." },
    { icon: Palette, title: "Personalização", desc: "Logo, cores, nome do app e identidade visual customizáveis." },
    { icon: Globe, title: "Modo Visitante", desc: "Explore o sistema sem cadastro para conhecer os recursos." },
    { icon: Wifi, title: "Sincronização", desc: "Dados salvos na nuvem com Supabase, acessíveis de qualquer lugar." },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <a href="#modules">
              <Button variant="ghost" size="sm" className="hidden md:flex text-muted-foreground">
                Funcionalidades
              </Button>
            </a>
            <a href="#contact">
              <Button variant="ghost" size="sm" className="hidden md:flex text-muted-foreground">
                Contato
              </Button>
            </a>
            <Link to="/auth">
              <Button size="sm" className="bg-primary text-primary-foreground">
                Acessar
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 relative">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Plataforma de Estudos Completa</span>
            </motion.div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-display leading-tight mb-6">
              Conheça o
              <span className="block mt-2 bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient">
                FD-Planner
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
              Uma plataforma completa para <span className="text-foreground font-semibold">organizar seus estudos</span>, 
              gerenciar cursos, manter o foco, acompanhar progresso e conquistar suas metas acadêmicas — 
              tudo em um único lugar.
            </p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-6 bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  <Play className="mr-2 h-5 w-5" />
                  Acessar Plataforma
                </Button>
              </Link>
              <a href="#modules">
                <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 py-6 border-2">
                  Ver Funcionalidades
                  <ChevronDown className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </motion.div>
          </motion.div>

          {/* Quick module icons */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="mt-16"
          >
            <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
              {allModules.slice(0, 8).map((mod, i) => (
                <motion.div
                  key={mod.title}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.05 }}
                >
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/40 hover:bg-card transition-all">
                    <mod.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{mod.title}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* All Modules Section */}
      <section id="modules" className="py-20 sm:py-28 bg-muted/30 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />
        
        <div className="container mx-auto px-4 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-4 px-4 py-1.5">
              <Layers className="h-3 w-3 mr-1" />
              Módulos do Sistema
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display mb-4">
              Todas as funcionalidades
              <span className="block text-primary">em detalhe</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              O FD-Planner conta com {allModules.length} módulos integrados, cada um projetado para atender
              uma necessidade específica da sua rotina de estudos.
            </p>
          </motion.div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-5 max-w-5xl mx-auto"
          >
            {allModules.map((mod) => (
              <motion.div key={mod.title} variants={itemVariants}>
                <Card className="h-full border border-border/60 shadow-card bg-card hover:shadow-lg hover:border-primary/30 transition-all overflow-hidden group">
                  <div className="h-0.5 bg-border group-hover:bg-primary/60 transition-colors" />
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 p-3 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <mod.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold font-display mb-1 group-hover:text-primary transition-colors">
                          {mod.title}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                          {mod.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {mod.details.map((detail) => (
                            <span 
                              key={detail} 
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted/80 text-muted-foreground"
                            >
                              <CheckCircle2 className="h-3 w-3 text-primary/70" />
                              {detail}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <Badge variant="outline" className="mb-4 px-4 py-1.5">
              <Settings className="h-3 w-3 mr-1" />
              Recursos da Plataforma
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
              Muito além dos módulos
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Funcionalidades que tornam toda a experiência mais completa, segura e personalizada.
            </p>
          </motion.div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto"
          >
            {platformFeatures.map((feat) => (
              <motion.div key={feat.title} variants={itemVariants}>
                <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-card/60 border border-border/50 hover:border-primary/30 hover:bg-card transition-all h-full">
                  <div className="p-3 rounded-xl bg-primary/10 mb-3">
                    <feat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{feat.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <Badge variant="outline" className="mb-4 px-4 py-1.5">
              <Target className="h-3 w-3 mr-1" />
              Como Funciona
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
              Comece em <span className="text-primary">3 passos</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", title: "Crie sua conta", description: "Cadastre-se gratuitamente ou explore no modo visitante para conhecer a plataforma.", icon: User },
              { step: "02", title: "Configure seus estudos", description: "Adicione cursos, crie planejamentos, defina metas e personalize o sistema.", icon: Settings },
              { step: "03", title: "Acompanhe sua evolução", description: "Use o timer de foco, registre atividades, desbloqueie conquistas e veja seus relatórios.", icon: TrendingUp },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="text-center"
              >
                <div className="relative inline-flex mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-card border border-border/50 flex items-center justify-center shadow-md">
                    <item.icon className="h-8 w-8 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-bold font-display mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5" />
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px]" />
        
        <div className="container mx-auto px-4 relative">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex p-4 rounded-2xl bg-primary/10 mb-6">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display mb-6">
              Experimente o
              <span className="block text-primary">FD-Planner</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Acesse a plataforma, explore as funcionalidades e descubra como o FD-Planner 
              pode ajudar na sua rotina de estudos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-10 py-6 bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105">
                  <Play className="mr-2 h-5 w-5" />
                  Acessar Plataforma
                </Button>
              </Link>
              <WhatsAppInlineButton phoneNumber={WHATSAPP_NUMBER} className="text-lg px-8 py-6" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 sm:py-28 bg-muted/30 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background pointer-events-none" />
        
        <div className="container mx-auto px-4 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <Badge variant="outline" className="mb-4 px-4 py-1.5">
              <Mail className="h-3 w-3 mr-1" />
              Contato
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
              Fale Conosco
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Dúvidas, sugestões ou feedback? Entre em contato.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto"
          >
            <ContactForm />
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <Footer />

      {/* WhatsApp Floating Button */}
      <WhatsAppButton phoneNumber={WHATSAPP_NUMBER} />
    </div>
  );
};

export default LandingPage;
