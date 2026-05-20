import { useEffect, useRef, useCallback } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  edgeWidth?: number;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  edgeWidth = 20,
}: SwipeGestureOptions) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const isEdgeSwipe = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchEndX.current = null;
    
    // Check if swipe started from the edge
    isEdgeSwipe.current = touch.clientX <= edgeWidth || 
      touch.clientX >= window.innerWidth - edgeWidth;
  }, [edgeWidth]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    touchEndX.current = touch.clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null || touchEndX.current === null) {
      return;
    }

    const deltaX = touchEndX.current - touchStartX.current;
    const absDeltaX = Math.abs(deltaX);

    // Only trigger if it's an edge swipe and meets threshold
    if (absDeltaX > threshold) {
      if (deltaX > 0 && touchStartX.current <= edgeWidth) {
        // Swipe right from left edge - open sidebar
        onSwipeRight?.();
      } else if (deltaX < 0 && isEdgeSwipe.current) {
        // Swipe left - close sidebar
        onSwipeLeft?.();
      }
    }

    // Reset
    touchStartX.current = null;
    touchStartY.current = null;
    touchEndX.current = null;
    isEdgeSwipe.current = false;
  }, [onSwipeLeft, onSwipeRight, threshold, edgeWidth]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
}
