import { useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

// Define page order for swipe navigation
const pageOrder = [
  '/dashboard',
  '/planejamentos',
  '/foco',
  '/cursos',
  '/tarefas',
  '/rotina',
  '/notas',
  '/antivicio',
  '/relatorios',
  '/conquistas',
  '/perfil',
  '/configuracoes',
];

interface SwipeNavigationOptions {
  threshold?: number;
  enabled?: boolean;
}

export function usePageSwipeNavigation({
  threshold = 80,
  enabled = true,
}: SwipeNavigationOptions = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const isHorizontalSwipe = useRef<boolean>(false);
  const swipeIndicator = useRef<HTMLDivElement | null>(null);

  const getCurrentPageIndex = useCallback(() => {
    return pageOrder.indexOf(location.pathname);
  }, [location.pathname]);

  const navigateToPage = useCallback((direction: 'left' | 'right') => {
    const currentIndex = getCurrentPageIndex();
    if (currentIndex === -1) return;

    let nextIndex: number;
    if (direction === 'left') {
      // Swipe left = go to next page
      nextIndex = currentIndex + 1;
      if (nextIndex >= pageOrder.length) return;
    } else {
      // Swipe right = go to previous page
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) return;
    }

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    navigate(pageOrder[nextIndex]);
  }, [getCurrentPageIndex, navigate]);

  const showSwipeIndicator = useCallback((direction: 'left' | 'right', progress: number) => {
    if (!swipeIndicator.current) {
      const indicator = document.createElement('div');
      indicator.className = 'fixed top-1/2 z-50 pointer-events-none transition-opacity';
      indicator.style.cssText = `
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: hsl(var(--primary) / 0.2);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translateY(-50%);
      `;
      indicator.innerHTML = direction === 'left' 
        ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>'
        : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
      document.body.appendChild(indicator);
      swipeIndicator.current = indicator;
    }

    const indicator = swipeIndicator.current;
    indicator.style.opacity = String(Math.min(progress / threshold, 1));
    
    if (direction === 'left') {
      indicator.style.right = '20px';
      indicator.style.left = 'auto';
      indicator.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
    } else {
      indicator.style.left = '20px';
      indicator.style.right = 'auto';
      indicator.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>';
    }
  }, [threshold]);

  const hideSwipeIndicator = useCallback(() => {
    if (swipeIndicator.current) {
      swipeIndicator.current.remove();
      swipeIndicator.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchEndX.current = null;
    isHorizontalSwipe.current = false;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const touch = e.touches[0];
    touchEndX.current = touch.clientX;

    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if this is a horizontal swipe
    if (!isHorizontalSwipe.current && absDeltaX > 10) {
      isHorizontalSwipe.current = absDeltaX > absDeltaY * 1.5;
    }

    // Show indicator for horizontal swipes
    if (isHorizontalSwipe.current && absDeltaX > 30) {
      const direction = deltaX > 0 ? 'right' : 'left';
      const currentIndex = getCurrentPageIndex();
      
      // Only show indicator if navigation is possible
      if (direction === 'left' && currentIndex < pageOrder.length - 1) {
        showSwipeIndicator('left', absDeltaX);
      } else if (direction === 'right' && currentIndex > 0) {
        showSwipeIndicator('right', absDeltaX);
      }
    }
  }, [getCurrentPageIndex, showSwipeIndicator]);

  const handleTouchEnd = useCallback(() => {
    hideSwipeIndicator();

    if (touchStartX.current === null || touchEndX.current === null || !isHorizontalSwipe.current) {
      touchStartX.current = null;
      touchStartY.current = null;
      touchEndX.current = null;
      isHorizontalSwipe.current = false;
      return;
    }

    const deltaX = touchEndX.current - touchStartX.current;
    const absDeltaX = Math.abs(deltaX);

    if (absDeltaX > threshold) {
      if (deltaX > 0) {
        navigateToPage('right');
      } else {
        navigateToPage('left');
      }
    }

    // Reset
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    isHorizontalSwipe.current = false;
  }, [threshold, navigateToPage, hideSwipeIndicator]);

  useEffect(() => {
    if (!enabled || !isMobile) return;

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      hideSwipeIndicator();
    };
  }, [enabled, isMobile, handleTouchStart, handleTouchMove, handleTouchEnd, hideSwipeIndicator]);

  return {
    currentPage: location.pathname,
    canSwipeLeft: getCurrentPageIndex() < pageOrder.length - 1,
    canSwipeRight: getCurrentPageIndex() > 0,
  };
}
