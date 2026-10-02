import { useRef, useDeferredValue } from 'react';
import { useMapContext } from '../components/MapProvider';
import {
  Position,
  Coordinates,
  ScaleExtent,
  TranslateExtent,
  createCoordinates,
  createTranslateExtent,
  createScaleExtent,
} from '../types';
import { useZoomBehavior } from './useZoomBehavior';
import { usePanBehavior } from './usePanBehavior';
import { useDeferredPosition } from './useDeferredPosition';

interface UseZoomPanHookProps {
  center: Coordinates;
  filterZoomEvent?: (event: Event) => boolean;
  onMoveStart?: (position: Position, event: Event) => void;
  onMoveEnd?: (position: Position, event: Event) => void;
  onMove?: (position: Position, event: Event) => void;
  translateExtent?: TranslateExtent;
  scaleExtent?: ScaleExtent;
  zoom?: number;
}

interface UseZoomPanReturn {
  mapRef: React.RefObject<SVGGElement | null>;
  position: { x: number; y: number; k: number; dragging?: Event | undefined };
  transformString: string;
  isPending: boolean;
}

export function useZoomPan(props: UseZoomPanHookProps): UseZoomPanReturn {
  return useZoomPanBehavior(props);
}

export function useZoomPanBehavior(
  {
    center,
    filterZoomEvent,
    onMoveStart,
    onMoveEnd,
    onMove,
    translateExtent = createTranslateExtent(
      createCoordinates(-Infinity, -Infinity),
      createCoordinates(Infinity, Infinity),
    ),
    scaleExtent = createScaleExtent(1, 8),
    zoom = 1,
  }: UseZoomPanHookProps,
  {
    enableZoom = true,
    enablePan = true,
  }: { enableZoom?: boolean; enablePan?: boolean } = {},
): UseZoomPanReturn {
  const { width, height, projection } = useMapContext();

  // Defer expensive calculations for smooth rendering with initialValue for better UX
  const deferredCenter = useDeferredValue(center, createCoordinates(0, 0));
  const deferredZoom = useDeferredValue(zoom, 1);

  const mapRef = useRef<SVGGElement>(null);
  const bypassEvents = useRef(false);

  // Use the focused hooks with optimistic updates
  const {
    smoothPosition,
    setPosition,
    setOptimisticPosition,
    isPending,
    startTransition,
    transformString,
  } = useDeferredPosition();

  const zoomBehaviorProps = {
    mapRef,
    enableZoom,
    enablePan,
    width,
    height,
    projection,
    scaleExtent,
    translateExtent,
    onZoomStart: onMoveStart,
    onZoomEnd: onMoveEnd,
    onMove,
    bypassEvents,
    onZoom: (
      transform: { x: number; y: number; k: number },
      sourceEvent?: Event,
    ) => {
      const newPosition = {
        x: transform.x,
        y: transform.y,
        k: transform.k,
        dragging: sourceEvent,
      };

      // Immediate optimistic update for responsive feel
      setOptimisticPosition(newPosition);

      // Use transition for non-blocking position updates
      startTransition(() => {
        setPosition(newPosition);
      });
    },
    ...(filterZoomEvent && { filterZoomEvent }),
  };

  const { zoomRef } = useZoomBehavior(zoomBehaviorProps);

  usePanBehavior({
    mapRef,
    zoomRef,
    width,
    height,
    projection,
    center: deferredCenter,
    zoom: deferredZoom,
    bypassEvents,
    onPositionChange: (newPosition) => {
      setPosition(newPosition);
    },
    startTransition,
  });

  return {
    mapRef,
    position: smoothPosition,
    transformString,
    isPending,
  };
}

export default useZoomPan;
