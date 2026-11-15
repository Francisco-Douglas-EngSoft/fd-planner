import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  Target, 
  CheckSquare, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Trophy,
  LogOut,
  Menu,
  X,
  User,
  Shield,
  StickyNote,
  Share2,
  Library,
  Bookmark,
  Network,
  Layers,
  Sparkles,
  CalendarCheck2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { usePendingTasksCount } from '@/hooks/usePendingTasksCount';
import { Logo, LogoIcon } from '@/components/ui/Logo';
import { GlobalSearch } from './GlobalSearch';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useI18n } from '@/i18n';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

const getNavItems = (t: (pt: string, en: string) => string) => [
  { path: '/dashboard', label: t('Dashboard', 'Dashboard'), icon: LayoutDashboard },
  { path: '/planejamentos', label: t('Planejamentos', 'Planning'), icon: Calendar },
  { path: '/cursos', label: t('Cursos', 'Courses'), icon: BookOpen },
  { path: '/foco', label: t('Foco', 'Focus'), icon: Target },
  { path: '/tarefas', label: t('Tarefas', 'Tasks'), icon: CheckSquare },
  { path: '/rotina', label: t('Rotina', 'Routine'), icon: CalendarCheck2 },
  { path: '/notas', label: t('Notas', 'Notes'), icon: StickyNote },
  { path: '/biblioteca', label: t('Biblioteca', 'Library'), icon: Library },
  { path: '/marcadores', label: t('Marcadores', 'Bookmarks'), icon: Bookmark },
  { path: '/assistente', label: t('Assistente IA', 'AI Assistant'), icon: Sparkles },
  { path: '/antivicio', label: t('AntiVício', 'Habit Control'), icon: Shield },
  { path: '/relatorios', label: t('Relatórios', 'Reports'), icon: BarChart3 },
  { path: '/conquistas', label: t('Conquistas', 'Achievements'), icon: Trophy },
  { path: '/redes', label: t('Redes', 'Networks'), icon: Share2 },
  { path: '/perfil', label: t('Perfil', 'Profile'), icon: User },
  { path: '/configuracoes', label: t('Configurações', 'Settings'), icon: Settings },
];

interface AppSidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 'fixed' = sidebar fixa (desktop); 'drawer' = gaveta com menu hambúrguer (tablet) */
  variant?: 'fixed' | 'drawer';
}

export function AppSidebar({
  isMobile = false,
  isOpen = false,
  onOpenChange,
  variant = 'fixed',
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const pendingTasks = usePendingTasksCount();
  const { t } = useI18n();
  const navItems = getNavItems(t);
  const items = isAdmin
    ? [...navItems, { path: '/admin', label: 'Admin', icon: Shield }]
    : navItems;

  const handleNavClick = () => {
    if (variant === 'drawer' && onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    if (variant === 'drawer' && onOpenChange) onOpenChange(false);
    navigate('/auth');
  };

  // Em mobile, não renderiza nada - apenas a BottomNavigation será usada
  if (isMobile) {
    return null;
  }

  // ---- Conteúdo de navegação compartilhado ----
  const NavContent = ({ compact }: { compact: boolean }) => (
    <nav className="flex-1 space-y-0.5 px-3 py-2 overflow-y-auto">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={handleNavClick}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-all duration-200",
              compact && "justify-center px-2",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            title={compact ? item.label : undefined}
          >
            <span className="relative shrink-0">
              <item.icon className="h-4 w-4" />
              {item.path === '/tarefas' && pendingTasks > 0 && (
                <span
                  className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar"
                  aria-hidden
                />
              )}
            </span>
            {!compact && <span>{item.label}</span>}
            {!compact && item.path === '/tarefas' && pendingTasks > 0 && (
              <span
                className={cn(
                  "ml-auto min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full text-[10px] font-semibold",
                  isActive ? "bg-primary-foreground text-primary" : "bg-destructive text-destructive-foreground"
                )}
                aria-label={t(`${pendingTasks} tarefas pendentes`, `${pendingTasks} pending tasks`)}
              >
                {pendingTasks > 99 ? '99+' : pendingTasks}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  const FooterButtons = ({ compact }: { compact: boolean }) => (
    <div className="border-t border-sidebar-border/50 p-2.5 space-y-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTheme}
        className={cn(
          "w-full h-8 justify-start gap-2.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          compact && "justify-center px-0"
        )}
      >
        {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        {!compact && (
          <span className="text-[13px]">{theme === 'light' ? t('Modo Escuro', 'Dark Mode') : t('Modo Claro', 'Light Mode')}</span>
        )}
      </Button>

      <LanguageSwitcher
        variant={compact ? 'compact' : 'full'}
        align="start"
        className={cn(
          "w-full h-8 justify-start gap-2.5 px-3 font-normal text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&_span]:text-[13px] [&_span]:font-normal",
          compact && "justify-center px-0 [&_span]:hidden"
        )}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className={cn(
          "w-full h-8 justify-start gap-2.5 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10",
          compact && "justify-center px-0"
        )}
      >
        <LogOut className="h-4 w-4" />
        {!compact && <span className="text-[13px]">{t('Sair', 'Sign out')}</span>}
      </Button>

      {variant === 'fixed' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full h-8 justify-start gap-2.5 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            compact && "justify-center px-0"
          )}
        >
          {compact ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-[13px]">{t('Recolher', 'Collapse')}</span>
            </>
          )}
        </Button>
      )}
    </div>
  );

  // ---- Variante gaveta (tablet) ----
  if (variant === 'drawer') {
    return (
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="w-[280px] p-0 flex flex-col bg-sidebar border-r border-sidebar-border sidebar-with-theme"
        >
          <SheetHeader className="px-4 h-16 flex-row items-center border-b border-sidebar-border/50 space-y-0">
            <SheetTitle asChild>
              <div><Logo size="lg" variant="full" /></div>
            </SheetTitle>
          </SheetHeader>
          <div className="px-3 py-3">
            <GlobalSearch />
          </div>
          <NavContent compact={false} />
          <FooterButtons compact={false} />
        </SheetContent>
      </Sheet>
    );
  }

  // ---- Variante fixa (desktop) ----
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-[90] h-screen transition-all duration-300 ease-in-out",
        "bg-sidebar border-r border-sidebar-border shadow-sm sidebar-with-theme",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className={cn(
          "flex items-center gap-3 border-b border-sidebar-border/50 p-4 h-16",
          collapsed && "justify-center"
        )}>
          {collapsed ? (
            <LogoIcon size="lg" />
          ) : (
            <Logo size="lg" variant="full" />
          )}
        </div>

        {!collapsed && (
          <div className="px-3 py-3">
            <GlobalSearch />
          </div>
        )}

        <NavContent compact={collapsed} />
        <FooterButtons compact={collapsed} />
      </div>
    </aside>
  );
}