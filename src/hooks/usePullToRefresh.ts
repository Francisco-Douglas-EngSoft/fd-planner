import { useState, useEffect, useRef, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  enabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  enabled = true,
}: PullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const isMobile = useIsMobile();
  
  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);
  const isPulling = useRef<boolean>(false);
  const refreshIndicator = useRef<HTMLDivElement | null>(null);

  const createRefreshIndicator = useCallback(() => {
    if (refreshIndicator.current) return;

    const indicator = document.createElement('div');
    indicator.id = 'pull-refresh-indicator';
    indicator.className = 'fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200';
    indicator.style.cssText = `
      top: -60px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: hsl(var(--background));
      box-shadow: 0 4px 12px hsl(var(--foreground) / 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      transform: translateX(-50%);
    `;
    indicator.innerHTML = `
      <svg id="refresh-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="hsl(var(--primary))" stroke-width="2" style="transition: transform 0.2s;">
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
        <path d="M21 3v5h-5"/>
      </svg>
    `;
    document.body.appendChild(indicator);
    refreshIndicator.current = indicator;
  }, []);

  const updateRefreshIndicator = useCallback((progress: number, isRefreshingNow: boolean) => {
    if (!refreshIndicator.current) return;

    const indicator = refreshIndicator.current;
    const icon = indicator.querySelector('#refresh-icon') as SVGElement;
    
    const translateY = Math.min(progress, threshold + 20);
    indicator.style.top = `${translateY - 60}px`;
    indicator.style.opacity = String(Math.min(progress / (threshold * 0.5), 1));

    if (icon) {
      const rotation = (progress / threshold) * 360;
      if (isRefreshingNow) {
        icon.style.animation = 'spin 1s linear infinite';
      } else {
        icon.style.animation = 'none';
        icon.style.transform = `rotate(${rotation}deg)`;
      }
    }
  }, [threshold]);

  const removeRefreshIndicator = useCallback(() => {
    if (refreshIndicator.current) {
      refreshIndicator.current.style.top = '-60px';
      refreshIndicator.current.style.opacity = '0';
      setTimeout(() => {
        refreshIndicator.current?.remove();
        refreshIndicator.current = null;
      }, 200);
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only activate if at the top of the page
    if (window.scrollY > 0) return;
    
    const touch = e.touches[0];
    touchStartY.current = touch.clientY;
    touchCurrentY.current = null;
    isPulling.current = false;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touchStartY.current === null || isRefreshing) return;
    if (window.scrollY > 0) return;

    const touch = e.touches[0];
    touchCurrentY.current = touch.clientY;

    const deltaY = touch.clientY - touchStartY.current;
    
    if (deltaY > 0) {
      isPulling.current = true;
      const progress = Math.min(deltaY * 0.5, threshold + 30);
      setPullProgress(progress);
      
      createRefreshIndicator();
      updateRefreshIndicator(progress, false);

      // Prevent default scrolling while pulling
      if (deltaY > 10) {
        e.preventDefault();
      }
    }
  }, [isRefreshing, threshold, createRefreshIndicator, updateRefreshIndicator]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || isRefreshing) {
      touchStartY.current = null;
      touchCurrentY.current = null;
      isPulling.current = false;
      return;
    }

    const shouldRefresh = pullProgress >= threshold;

    if (shouldRefresh) {
      setIsRefreshing(true);
      updateRefreshIndicator(threshold, true);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([10, 50, 10]);
      }

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        removeRefreshIndicator();
      }
    } else {
      removeRefreshIndicator();
    }

    setPullProgress(0);
    touchStartY.current = null;
    touchCurrentY.current = null;
    isPulling.current = false;
  }, [isRefreshing, pullProgress, threshold, onRefresh, updateRefreshIndicator, removeRefreshIndicator]);

  useEffect(() => {
    if (!enabled || !isMobile) return;

    // Add CSS for spin animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      removeRefreshIndicator();
      style.remove();
    };
  }, [enabled, isMobile, handleTouchStart, handleTouchMove, handleTouchEnd, removeRefreshIndicator]);

  return {
    isRefreshing,
    pullProgress,
  };
}
