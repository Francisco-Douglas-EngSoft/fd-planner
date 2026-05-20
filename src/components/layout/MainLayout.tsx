import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppSidebar } from './AppSidebar';
import { BottomNavigation } from './BottomNavigation';
import { GuestModeBanner } from './GuestModeBanner';
import { PageTransition } from './PageTransition';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { usePageSwipeNavigation } from '@/hooks/usePageSwipeNavigation';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Badge } from '@/components/ui/badge';
import { WifiOff, RefreshCw } from 'lucide-react';

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const { isGuest, user } = useAuth();
  const location = useLocation();
  const showGuestBanner = isGuest && !user;
  
  // Swipe navigation for mobile
  usePageSwipeNavigation({ enabled: isMobile });
  
  // Offline sync status
  const { isOnline, pendingActions } = useOfflineSync();
  
  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    window.dispatchEvent(new CustomEvent('pull-to-refresh'));
    await new Promise(resolve => setTimeout(resolve, 500));
  }, []);
  
  const { isRefreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: isMobile,
  });

  // Listen for sidebar state changes (desktop only)
  useEffect(() => {
    if (isMobile) return;
    
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
  }, [isMobile]);

  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-warning/90 text-warning-foreground py-1 px-4 flex items-center justify-center gap-2 text-sm">
          <WifiOff className="h-4 w-4" />
          <span>Você está offline. Suas ações serão sincronizadas quando a conexão voltar.</span>
          {pendingActions > 0 && (
            <Badge variant="secondary" className="bg-white/20 text-white">
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
      
      {/* Sidebar apenas em desktop */}
      {!isMobile && <AppSidebar />}
      
      <main
        className={cn(
          "min-h-screen transition-all duration-300 ease-in-out relative z-10 overflow-x-hidden",
          isMobile ? "ml-0 pb-20" : (sidebarCollapsed ? "ml-[72px]" : "ml-64"),
          showGuestBanner && "pt-10",
          !isOnline && "pt-8"
        )}
      >
        <div className="container mx-auto px-4 py-3 sm:p-6 lg:p-8 safe-area-x">
          <AnimatePresence mode="wait">
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom navigation apenas em mobile */}
      {isMobile && <BottomNavigation />}
    </div>
  );
}