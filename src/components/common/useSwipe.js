import { useRef, useEffect } from 'react';

export function useSwipe({
  onSwipeDown,
  onSwipeUp,
  onSwipeLeft,
  onSwipeRight,
  threshold = 150,
  verticalThreshold = 20,
  crossAxisLimit = 500,
  edgeZone = 500,
  debug = false, // set true temporarily to see console logs
}) {
  const start = useRef(null);

  useEffect(() => {
    const log = (...args) => debug && console.log('[useSwipe]', ...args);

    const handleStart = (e) => {
      const t = e.touches[0];
      const height = window.innerHeight;

      const startedAtTopEdge = t.clientY <= edgeZone;
      const startedAtBottomEdge = t.clientY >= height - edgeZone;

      start.current = {
        x: t.clientX,
        y: t.clientY,
        time: Date.now(),
        startedAtEdge: startedAtTopEdge || startedAtBottomEdge,
      };
      log('start', start.current);
    };

    const handleMove = (e) => {
      if (start.current && window.scrollY === 0) {
        const dy = e.touches[0].clientY - start.current.y;
        if (dy > 0) e.preventDefault();
      }
    };

    const handleEnd = (e) => {
      if (!start.current) {
        log('end fired but no start recorded');
        return;
      }
      const t = e.changedTouches[0];
      const dx = t.clientX - start.current.x;
      const dy = t.clientY - start.current.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      const isVerticalSwipe =
        absY > verticalThreshold && absX <= crossAxisLimit && start.current.startedAtEdge;
      const isHorizontalSwipe = absX > threshold && absY <= crossAxisLimit;

      log('end', { dx, dy, absX, absY, isVerticalSwipe, isHorizontalSwipe, startedAtEdge: start.current.startedAtEdge });

      if (isVerticalSwipe) {
        if (dy > 0) onSwipeDown && onSwipeDown();
        else onSwipeUp && onSwipeUp();
      } else if (isHorizontalSwipe) {
        if (dx > 0) onSwipeRight && onSwipeRight();
        else onSwipeLeft && onSwipeLeft();
      }

      start.current = null;
    };

    const handleCancel = () => {
      log('touchcancel — gesture aborted (likely by native scroll)');
      start.current = null;
    };

    document.addEventListener('touchstart', handleStart, { passive: true });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd, { passive: true });
    document.addEventListener('touchcancel', handleCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleStart);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleCancel);
    };
  }, [onSwipeDown, onSwipeUp, onSwipeLeft, onSwipeRight, threshold, verticalThreshold, crossAxisLimit, edgeZone, debug]);
}