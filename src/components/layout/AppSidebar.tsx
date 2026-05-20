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
  Share2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Logo, LogoIcon } from '@/components/ui/Logo';
import { GlobalSearch } from './GlobalSearch';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/planejamentos', label: 'Planejamentos', icon: Calendar },
  { path: '/cursos', label: 'Cursos', icon: BookOpen },
  { path: '/foco', label: 'Foco', icon: Target },
  { path: '/tarefas', label: 'Tarefas', icon: CheckSquare },
  { path: '/notas', label: 'Notas', icon: StickyNote },
  { path: '/antivicio', label: 'AntiVício', icon: Shield },
  { path: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { path: '/conquistas', label: 'Conquistas', icon: Trophy },
  { path: '/redes', label: 'Redes', icon: Share2 },
  { path: '/perfil', label: 'Perfil', icon: User },
  { path: '/configuracoes', label: 'Configurações', icon: Settings },
];

interface AppSidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AppSidebar({ isMobile = false, isOpen = false, onOpenChange }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  const handleNavClick = () => {
    if (isMobile && onOpenChange) {
      onOpenChange(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  // Em mobile, não renderiza nada - apenas a BottomNavigation será usada
  if (isMobile) {
    return null;
  }

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

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-3 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={cn("h-4.5 w-4.5 shrink-0", isActive && "")} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border/50 p-3 space-y-1">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            onClick={toggleTheme}
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center"
            )}
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            {!collapsed && (
              <span className="text-sm">{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
            )}
          </Button>

          {/* Logout */}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            onClick={handleLogout}
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="text-sm">Sair</span>}
          </Button>

          {/* Collapse Button */}
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "default"}
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-sm">Recolher</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  );
}