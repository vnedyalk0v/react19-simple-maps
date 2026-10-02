import { useEffect, useRef, useCallback } from 'react';
import {
  zoom as d3Zoom,
  zoomTransform,
  zoomIdentity,
  ZoomBehavior,
  D3ZoomEvent,
} from 'd3-zoom';
import { select as d3Select } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { ScaleExtent, TranslateExtent } from '../types';
import { getCoords } from '../utils';
import { Position, Coordinates, Longitude, Latitude } from '../types';

// Helper function to create branded coordinates
const createCoordinates = (lon: number, lat: number): Coordinates => [
  lon as Longitude,
  lat as Latitude,
];

interface UseZoomBehaviorProps {
  mapRef: React.RefObject<SVGGElement | null>;
  enableZoom?: boolean;
  enablePan?: boolean;
  width: number;
  height: number;
  projection: GeoProjection;
  scaleExtent: ScaleExtent;
  translateExtent: TranslateExtent;
  filterZoomEvent?: (event: Event) => boolean;
  onZoom?: (
    transform: { x: number; y: number; k: number },
    sourceEvent?: Event,
  ) => void;
  onZoomStart?: ((position: Position, event: Event) => void) | undefined;
  onZoomEnd?: ((position: Position, event: Event) => void) | undefined;
  onMove?: ((position: Position, event: Event) => void) | undefined;
  bypassEvents: React.MutableRefObject<boolean>;
}

interface UseZoomBehaviorReturn {
  zoomRef: React.RefObject<ZoomBehavior<SVGGElement, unknown> | undefined>;
  handleZoom: (d3Event: D3ZoomEvent<SVGGElement, unknown>) => void;
}

export function useZoomBehavior({
  mapRef,
  enableZoom = true,
  enablePan = true,
  width,
  height,
  projection,
  scaleExtent,
  translateExtent,
  filterZoomEvent,
  onZoom,
  onZoomStart,
  onZoomEnd,
  onMove,
  bypassEvents,
}: UseZoomBehaviorProps): UseZoomBehaviorReturn {
  const zoomRef = useRef<ZoomBehavior<SVGGElement, unknown> | undefined>(
    undefined,
  );
  const mapTouchIds = useRef(new Set<number>());
  const originalTouchEvents = useRef(new WeakMap<Event, TouchEvent>());
  const suppressTouchCallbacks = useRef(false);
  const [minZoom, maxZoom] = scaleExtent;
  const [a, b] = translateExtent;
  const [a1, a2] = a;
  const [b1, b2] = b;

  // Memoized zoom handler with concurrent features
  const handleZoom = useCallback(
    (d3Event: D3ZoomEvent<SVGGElement, unknown>) => {
      if (bypassEvents.current) return;
      const { transform, sourceEvent } = d3Event;

      // Call the zoom callback
      if (onZoom) {
        onZoom(
          {
            x: transform.x,
            y: transform.y,
            k: transform.k,
          },
          sourceEvent,
        );
      }

      // Immediate callback for responsive feel
      if (!onMove) return;
      const coords = getCoords(width, height, transform);
      const inverted = projection.invert?.(coords);
      if (inverted) {
        onMove(
          {
            coordinates: createCoordinates(inverted[0], inverted[1]),
            zoom: transform.k,
          },
          d3Event.sourceEvent || d3Event,
        );
      }
    },
    [onZoom, onMove, width, height, projection, bypassEvents],
  );

  useEffect(() => {
    if (enablePan || !enableZoom) mapTouchIds.current.clear();
    const currentMapElement = mapRef.current;
    if (!currentMapElement) return;
    const mapElement = currentMapElement;

    const svg = d3Select(mapElement);
    let pendingTouchStart: D3ZoomEvent<SVGGElement, unknown> | undefined;

    function restoreSourceEvent(d3Event: D3ZoomEvent<SVGGElement, unknown>) {
      const sourceEvent = originalTouchEvents.current.get(d3Event.sourceEvent);
      return sourceEvent ? { ...d3Event, sourceEvent } : d3Event;
    }

    function handleZoomEvent(d3Event: D3ZoomEvent<SVGGElement, unknown>) {
      if (suppressTouchCallbacks.current) return;
      if (pendingTouchStart) {
        const startEvent = pendingTouchStart;
        pendingTouchStart = undefined;
        notifyZoomStart(startEvent);
      }
      handleZoom(restoreSourceEvent(d3Event));
    }

    function handleZoomStart(d3Event: D3ZoomEvent<SVGGElement, unknown>) {
      if (suppressTouchCallbacks.current) return;
      if (!enablePan && d3Event.sourceEvent?.type === 'touchstart') {
        if ((d3Event.sourceEvent as TouchEvent).touches.length === 1) {
          pendingTouchStart = d3Event;
          return;
        }
      }
      pendingTouchStart = undefined;
      notifyZoomStart(d3Event);
    }

    function notifyZoomStart(d3Event: D3ZoomEvent<SVGGElement, unknown>) {
      d3Event = restoreSourceEvent(d3Event);
      if (!enableZoom)
        zoomBehavior.scaleExtent([d3Event.transform.k, d3Event.transform.k]);
      if (!onZoomStart || bypassEvents.current) return;
      const coords = getCoords(width, height, d3Event.transform);
      const inverted = projection.invert?.(coords);
      if (inverted) {
        onZoomStart(
          {
            coordinates: createCoordinates(inverted[0], inverted[1]),
            zoom: d3Event.transform.k,
          },
          d3Event.sourceEvent || d3Event,
        );
      }
    }

    function handleZoomEnd(d3Event: D3ZoomEvent<SVGGElement, unknown>) {
      if (suppressTouchCallbacks.current) return;
      if (pendingTouchStart) {
        pendingTouchStart = undefined;
        return;
      }
      if (bypassEvents.current) {
        bypassEvents.current = false;
        return;
      }
      d3Event = restoreSourceEvent(d3Event);
      const coords = getCoords(width, height, d3Event.transform);
      const inverted = projection.invert?.(coords);
      if (inverted) {
        const [x, y] = inverted;
        if (!onZoomEnd) return;
        onZoomEnd(
          { coordinates: createCoordinates(x, y), zoom: d3Event.transform.k },
          d3Event.sourceEvent || d3Event,
        );
      }
    }

    function filterFunc(event: Event) {
      if (!enableZoom && !enablePan) return false;
      const isScaling =
        event.type === 'wheel' ||
        event.type === 'dblclick' ||
        event.type === 'touchend';
      if (isScaling && !enableZoom) return false;
      if (!enablePan && !isScaling && event.type !== 'touchstart') return false;
      const originalEvent = originalTouchEvents.current.get(event) ?? event;
      const mouseEvent = originalEvent as MouseEvent;
      const accepted = filterZoomEvent
        ? filterZoomEvent(originalEvent)
        : (!mouseEvent.ctrlKey || event.type === 'wheel') && !mouseEvent.button;
      if (accepted && !enablePan && event.type === 'touchstart') {
        for (const touch of Array.from(
          (originalEvent as TouchEvent).changedTouches,
        )) {
          if (mapElement.contains(touch.target as Node))
            mapTouchIds.current.add(touch.identifier);
        }
      }
      return accepted;
    }

    const zoomBehavior = d3Zoom<SVGGElement, unknown>()
      .extent([
        [0, 0],
        [width, height],
      ])
      .filter(filterFunc)
      .scaleExtent([minZoom, maxZoom])
      .translateExtent([
        [a1, a2],
        [b1, b2],
      ])
      .on('start', handleZoomStart)
      .on('zoom', handleZoomEvent)
      .on('end', handleZoomEnd);

    if (!enablePan) {
      zoomBehavior.constrain((transform) => {
        const previous = zoomTransform(mapElement);
        const ratio = transform.k / previous.k;
        return zoomIdentity
          .translate(
            width / 2 - (width / 2 - previous.x) * ratio,
            height / 2 - (height / 2 - previous.y) * ratio,
          )
          .scale(transform.k);
      });
    }

    if (!enableZoom) {
      const currentScale = zoomTransform(mapElement).k;
      zoomBehavior.scaleExtent([currentScale, currentScale]);
    }

    zoomRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    if (!enablePan && enableZoom) {
      for (const type of [
        'touchstart',
        'touchmove',
        'touchend',
        'touchcancel',
      ] as const) {
        const listener = svg.on(`${type}.zoom`);
        if (!listener) continue;
        svg.on(
          `${type}.zoom`,
          function (event: TouchEvent, datum) {
            const isScrolling =
              type === 'touchmove' &&
              Array.from(event.touches).filter((touch) =>
                mapTouchIds.current.has(touch.identifier),
              ).length < 2;
            const proxy = new Proxy(event, {
              get(target, key) {
                if (
                  key === 'touches' ||
                  key === 'changedTouches' ||
                  key === 'targetTouches'
                ) {
                  return Array.from(target[key]).filter((touch) =>
                    mapTouchIds.current.has(touch.identifier),
                  );
                }
                if (
                  isScrolling &&
                  (key === 'preventDefault' ||
                    key === 'stopImmediatePropagation')
                )
                  return () => {};
                const value = Reflect.get(target, key, target);
                return typeof value === 'function' ? value.bind(target) : value;
              },
            });
            originalTouchEvents.current.set(proxy, event);
            try {
              if (isScrolling) {
                if (mapTouchIds.current.size === 0) return;
                suppressTouchCallbacks.current = true;
              }
              // Keep D3's accepted map touches current without consuming page scrolling.
              listener.call(this, proxy, datum);
              if (isScrolling) {
                // Rebase the touch origin before a second accepted finger begins a pinch.
                zoomBehavior.transform(svg, zoomTransform(mapElement));
              }
            } finally {
              if (isScrolling) suppressTouchCallbacks.current = false;
              if (type === 'touchend' || type === 'touchcancel') {
                for (const touch of Array.from(event.changedTouches)) {
                  mapTouchIds.current.delete(touch.identifier);
                }
              }
            }
          },
          { passive: false },
        );
      }
    }

    return () => {
      // Mirror setup: remove all d3-zoom listeners bound under the .zoom
      // namespace so they don't outlive this effect run / component unmount.
      svg.on('.zoom', null);
    };
  }, [
    enableZoom,
    enablePan,
    width,
    height,
    a1,
    a2,
    b1,
    b2,
    minZoom,
    maxZoom,
    projection,
    onZoomStart,
    onMove,
    onZoomEnd,
    filterZoomEvent,
    handleZoom,
    mapRef,
    bypassEvents,
  ]);

  return {
    zoomRef,
    handleZoom,
  };
}

export default useZoomBehavior;
