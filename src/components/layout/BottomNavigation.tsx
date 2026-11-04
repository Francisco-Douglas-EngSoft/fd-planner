import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Target,
  CheckSquare,
  Menu,
  StickyNote,
  Shield,
  Share2,
  BarChart3,
  Trophy,
  User,
  Settings,
  LogOut,
  Sun,
  Moon,
  X,
  Search,
} from 'lucide-react';
import { Library, Bookmark, Network, Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingTasksCount } from '@/hooks/usePendingTasksCount';
import { useUserRole } from '@/hooks/useUserRole';

const primaryNavItems = [
  { path: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { path: '/planejamentos', label: 'Planejar', icon: Calendar },
  { path: '/foco', label: 'Foco', icon: Target },
  { path: '/cursos', label: 'Cursos', icon: BookOpen },
];

const secondaryNavItems = [
  { path: '/tarefas', label: 'Tarefas', icon: CheckSquare },
  { path: '/notas', label: 'Notas', icon: StickyNote },
  { path: '/biblioteca', label: 'Biblioteca', icon: Library },
  { path: '/marcadores', label: 'Marcadores', icon: Bookmark },
  { path: '/assistente', label: 'Assistente IA', icon: Sparkles },
  { path: '/antivicio', label: 'AntiVício', icon: Shield },
  { path: '/redes', label: 'Redes', icon: Share2 },
  { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { path: '/conquistas', label: 'Conquistas', icon: Trophy },
  { path: '/perfil', label: 'Perfil', icon: User },
  { path: '/configuracoes', label: 'Configurações', icon: Settings },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const pendingTasks = usePendingTasksCount();
  const { isAdmin } = useUserRole();

  const menuItems = [
    ...primaryNavItems,
    ...secondaryNavItems,
    ...(isAdmin ? [{ path: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  const isMoreActive = !primaryNavItems.some(item => item.path === location.pathname);

  const handleLogout = async () => {
    await signOut();
    setOpen(false);
    navigate('/auth');
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-xl border-t border-border/60 safe-area-bottom shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)]"
        role="navigation"
        aria-label="Navegação principal"
      >
        <div className="flex items-stretch justify-around h-[64px] px-1 max-w-md mx-auto">
          {primaryNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[44px] min-h-[44px] touch-feedback rounded-lg",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon
                  className={cn(
                    "h-[22px] w-[22px] transition-transform",
                    isActive && "scale-110"
                  )}
                  strokeWidth={isActive ? 2.4 : 2}
                />
                <span
                  className={cn(
                    "text-[10px] leading-tight",
                    isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 flex-1 min-w-[44px] min-h-[44px] touch-feedback rounded-lg outline-none",
                  isMoreActive || open ? "text-primary" : "text-muted-foreground"
                )}
                aria-label="Abrir menu"
              >
                {(isMoreActive || open) && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Menu
                  className={cn("h-[22px] w-[22px] transition-transform", (isMoreActive || open) && "scale-110")}
                  strokeWidth={isMoreActive || open ? 2.4 : 2}
                />
                {pendingTasks > 0 && (
                  <span
                    className="absolute top-2.5 right-1/2 translate-x-[14px] h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background"
                    aria-label={`${pendingTasks} tarefas pendentes`}
                  />
                )}
                <span className={cn("text-[10px] leading-tight", isMoreActive || open ? "font-semibold" : "font-medium")}>
                  Menu
                </span>
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-[85vw] sm:w-[380px] p-0 flex flex-col bg-background border-l border-border"
            >
              <SheetHeader className="px-5 py-4 border-b border-border/60 flex-row items-center justify-between space-y-0">
                <SheetTitle asChild>
                  <div>
                    <Logo size="md" variant="full" />
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto py-3 no-scrollbar">
                <p className="px-5 pb-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground/70">
                  Navegação
                </p>
                <nav className="px-2 space-y-0.5">
                  {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium touch-feedback min-h-[48px]",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/80 hover:bg-accent active:bg-accent"
                        )}
                      >
                        <span className="relative shrink-0">
                          <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
                          {item.path === '/tarefas' && pendingTasks > 0 && (
                            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" aria-hidden />
                          )}
                        </span>
                        <span>{item.label}</span>
                        {item.path === '/tarefas' && pendingTasks > 0 && (
                          <span className="ml-auto min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[11px] font-semibold">
                            {pendingTasks > 99 ? '99+' : pendingTasks}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              <div className="border-t border-border/60 p-3 space-y-1 safe-area-bottom">
                <Button
                  variant="ghost"
                  onClick={toggleTheme}
                  className="w-full justify-start gap-3 h-12"
                >
                  {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Sair</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </>
  );
}
