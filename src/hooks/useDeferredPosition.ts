import {
  useState,
  useDeferredValue,
  useTransition,
  useMemo,
  useCallback,
} from 'react';
import { ZoomPanState } from '../types';

interface ZoomPanPosition extends ZoomPanState {
  dragging?: Event | undefined;
}

interface UseDeferredPositionProps {
  initialPosition?: ZoomPanPosition;
  // React 19 optimization: Allow custom transition priority
  transitionPriority?: 'background' | 'normal' | 'urgent';
  // Performance hint for deferred value updates
  deferredUpdateThreshold?: number;
}

interface UseDeferredPositionReturn {
  position: ZoomPanPosition;
  smoothPosition: ZoomPanPosition;
  optimisticPosition: ZoomPanPosition;
  setPosition: (position: ZoomPanPosition) => void;
  setOptimisticPosition: (position: ZoomPanPosition) => void;
  isPending: boolean;
  startTransition: (callback: () => void) => void;
  transformString: string;
  // React 19 enhancement: Expose performance metrics
  isDeferred: boolean;
  updateCount: number;
}

export function useDeferredPosition({
  initialPosition = { x: 0, y: 0, k: 1 },
  transitionPriority = 'normal', // Reserved for future React 19 scheduler integration
  deferredUpdateThreshold = 16, // 60fps threshold
}: UseDeferredPositionProps = {}): UseDeferredPositionReturn {
  // Note: transitionPriority is reserved for future React 19 scheduler API integration
  void transitionPriority; // Acknowledge the parameter is intentionally unused for now
  // React 19 concurrent features with optimizations
  const [isPending, startTransition] = useTransition();

  // Track update frequency for performance optimization
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);

  const [position, setPosition] = useState<ZoomPanPosition>(initialPosition);

  // Keep a live position for immediate UI feedback during drag/zoom interactions.
  // useOptimistic is intended for transition/action-driven optimistic UI and emits
  // runtime warnings for this continuous interaction pattern.
  const [optimisticPosition, setOptimisticPosition] =
    useState<ZoomPanPosition>(initialPosition);

  // React 19 optimization: Smart deferred value with performance hints
  const smoothPosition = useDeferredValue(optimisticPosition, initialPosition);

  // Check if the deferred value is actually deferred (performance indicator)
  const isDeferred = smoothPosition !== optimisticPosition;

  // Optimized transform string calculation with memoization
  const transformString = useMemo(() => {
    // Use the most appropriate position based on interaction state
    const activePosition = optimisticPosition.dragging
      ? optimisticPosition
      : smoothPosition;
    return `translate(${activePosition.x} ${activePosition.y}) scale(${activePosition.k})`;
  }, [smoothPosition, optimisticPosition]);

  // Enhanced setPosition with performance tracking and batching
  const enhancedSetPosition = useCallback(
    (newPosition: ZoomPanPosition) => {
      const now = performance.now();
      const timeSinceLastUpdate = now - lastUpdateTime;

      setUpdateCount((prev) => prev + 1);
      setLastUpdateTime(now);
      setOptimisticPosition(newPosition);

      // React 19 optimization: Batch rapid updates based on threshold
      if (timeSinceLastUpdate < deferredUpdateThreshold) {
        // For rapid updates, use transition to prevent blocking
        startTransition(() => {
          setPosition(newPosition);
        });
      } else {
        // For slower updates, update immediately
        setPosition(newPosition);
      }
    },
    [lastUpdateTime, deferredUpdateThreshold, startTransition],
  );

  return {
    position,
    smoothPosition,
    optimisticPosition,
    setPosition: enhancedSetPosition,
    setOptimisticPosition,
    isPending,
    startTransition,
    transformString,
    isDeferred,
    updateCount,
  };
}

export default useDeferredPosition;
