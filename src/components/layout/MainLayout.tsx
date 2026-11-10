import { useState, useEffect, useCallback, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { BottomNavigation } from './BottomNavigation';
import { GuestModeBanner } from './GuestModeBanner';
import { PageTransition } from './PageTransition';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { cn } from '@/lib/utils';
import { useDeviceType } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { usePageSwipeNavigation } from '@/hooks/usePageSwipeNavigation';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useSyncStatus } from '@/hooks/useSyncStatus';
import { Badge } from '@/components/ui/badge';
import { WifiOff, RefreshCw, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/Logo';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { CommandPalette } from '@/components/CommandPalette';
import { installLinkPreload, preloadCommonRoutes } from '@/lib/routePreload';

/** Mostrado só na área da página enquanto o código dela chega (o menu continua na tela). */
function ContentLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Carregando">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
    </div>
  );
}

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const device = useDeviceType();
  const isMobile = device === 'mobile';
  const isTablet = device === 'tablet';
  const isDesktop = device === 'desktop';
  const { isGuest, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const showGuestBanner = isGuest && !user;
  
  // Swipe navigation for mobile
  usePageSwipeNavigation({ enabled: isMobile });
  
  // Offline sync status
  const { isOnline, pending: pendingActions } = useSyncStatus();
  
  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    window.dispatchEvent(new CustomEvent('pull-to-refresh'));
    await new Promise(resolve => setTimeout(resolve, 500));
  }, []);
  
  const { isRefreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: isMobile,
  });

  // Espaçamento superior combinado: banner offline + banner convidado + header do tablet
  const topPad =
    (showGuestBanner ? 40 : 0) + (!isOnline ? 32 : 0) + (isTablet ? 56 : 0);

  // Baixa as telas mais usadas em segundo plano e a do link apontado antes do clique.
  useEffect(() => {
    const pararLinks = installLinkPreload();
    const pararFila = preloadCommonRoutes();
    return () => {
      pararLinks();
      pararFila();
    };
  }, []);

  // Fecha a gaveta ao trocar de rota (tablet)
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Listen for sidebar state changes (desktop only)
  useEffect(() => {
    if (!isDesktop) return;
    
    const checkSidebar = () => {
      const sidebar = document.querySelector('aside');
      if (sidebar) {
        setSidebarCollapsed(sidebar.classList.contains('w-[72px]'));
      }
    };

    const observer = new MutationObserver(checkSidebar);
    const sidebar = document.querySelector('aside');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }

    return () => observer.disconnect();
  }, [isDesktop]);

  return (
    <div className="min-h-screen bg-gradient-surface">
      <CommandPalette />
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-warning/90 text-warning-foreground py-1 px-4 flex items-center justify-center gap-2 text-sm">
          <WifiOff className="h-4 w-4" />
          <span>Você está offline — alterações serão sincronizadas</span>
          {pendingActions > 0 && (
            <Badge variant="secondary" className="bg-background/20 text-warning-foreground">
              {pendingActions} pendente{pendingActions !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}
      
      {/* Refresh indicator */}
      {isRefreshing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200]">
          <div className="bg-background rounded-full p-3 shadow-lg border">
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
          </div>
        </div>
      )}
      
      {/* Guest Mode Banner */}
      <GuestModeBanner />
      
      {/* Animated Background */}
      <AnimatedBackground variant="orbs" intensity="medium" />
      
      {/* Sidebar fixa apenas em desktop */}
      {isDesktop && <AppSidebar variant="fixed" />}

      {/* Gaveta com menu hambúrguer em tablet */}
      {isTablet && (
        <AppSidebar variant="drawer" isOpen={drawerOpen} onOpenChange={setDrawerOpen} />
      )}

      {/* Barra superior com hambúrguer em tablet */}
      {isTablet && (
        <header
          className={cn(
            "fixed left-0 right-0 z-[95] h-14 flex items-center justify-between gap-2 px-4",
            "bg-background/95 backdrop-blur-xl border-b border-border/60"
          )}
          style={{ top: (showGuestBanner ? 40 : 0) + (!isOnline ? 32 : 0) }}
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Logo size="md" variant="full" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={toggleTheme}
            aria-label="Alternar tema"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
        </header>
      )}
      
      <main
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out relative z-10 overflow-x-hidden",
          isMobile && "ml-0 pb-20",
          isTablet && "ml-0",
          isDesktop && (sidebarCollapsed ? "ml-[72px]" : "ml-64")
        )}
        style={{ paddingTop: topPad || undefined }}
      >
        <div className="container mx-auto px-4 py-3 sm:p-6 lg:p-8 safe-area-x">
          {/* Sem esperar a animação de saída: a nova página começa a montar na hora. */}
          <PageTransition key={location.pathname}>
            <Suspense fallback={<ContentLoader />}>
              <Outlet />
            </Suspense>
          </PageTransition>
        </div>
      </main>

      {/* Bottom navigation apenas em mobile */}
      {isMobile && <BottomNavigation />}
    </div>
  );
}