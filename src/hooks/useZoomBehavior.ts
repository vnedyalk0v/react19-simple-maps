import {
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useState,
} from 'react';
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

// D3 has no public cancellation API for wheel timers or element-local gestures.
interface ActiveZoomGesture {
  active: number;
  wheel?: ReturnType<typeof setTimeout> | null;
  moved?: boolean;
  touch0?: unknown;
  touch1?: unknown;
}

type ZoomElement = SVGGElement & { __zooming?: ActiveZoomGesture };
type MouseupListener = (
  this: Window,
  event: MouseEvent,
  datum: unknown,
) => void;

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
  const [touchCancellation, setTouchCancellation] = useState(0);
  const [targetElement, setTargetElement] = useState<SVGGElement | null>(null);
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

  const latest = useRef({
    handleZoom,
    onZoomStart,
    onZoomEnd,
    filterZoomEvent,
  });
  // Ref targets can mount or be replaced without changing any hook props.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    latest.current = { handleZoom, onZoomStart, onZoomEnd, filterZoomEvent };
    if (targetElement !== mapRef.current) setTargetElement(mapRef.current);
  });

  useEffect(() => {
    const acceptedTouchIds = mapTouchIds.current;
    acceptedTouchIds.clear();
    const currentMapElement = targetElement;
    if (!currentMapElement) return;
    const mapElement = currentMapElement as ZoomElement;

    const svg = d3Select(mapElement);
    const activeGestures = new Set<ActiveZoomGesture>();
    const mouseGestures = new Map<
      Window,
      { gesture: ActiveZoomGesture; mouseup: MouseupListener }
    >();
    let disposed = false;
    let disposalTransform = zoomTransform(mapElement);
    let pendingTouchStart: D3ZoomEvent<SVGGElement, unknown> | undefined;
    let overlappingSelection: { root: HTMLElement; value: unknown } | undefined;

    function restoreSourceEvent(d3Event: D3ZoomEvent<SVGGElement, unknown>) {
      const sourceEvent = originalTouchEvents.current.get(d3Event.sourceEvent);
      return sourceEvent ? { ...d3Event, sourceEvent } : d3Event;
    }

    function handleZoomEvent(d3Event: D3ZoomEvent<SVGGElement, unknown>) {
      if (disposed || suppressTouchCallbacks.current) return;
      if (pendingTouchStart) {
        const startEvent = pendingTouchStart;
        pendingTouchStart = undefined;
        notifyZoomStart(startEvent);
      }
      if (!disposed) latest.current.handleZoom(restoreSourceEvent(d3Event));
    }

    function handleZoomStart(d3Event: D3ZoomEvent<SVGGElement, unknown>) {
      if (d3Event.sourceEvent?.type === 'mousedown' && overlappingSelection) {
        // Restore the snapshot before a callback can synchronously dispose this map.
        Reflect.set(
          overlappingSelection.root,
          '__noselect',
          overlappingSelection.value,
        );
      }
      const gesture = mapElement.__zooming;
      if (gesture) {
        activeGestures.add(gesture);
        if (d3Event.sourceEvent?.type === 'mousedown') {
          const view = (d3Event.sourceEvent as MouseEvent).view;
          const mouseup = view && d3Select(view).on('mouseup.zoom');
          if (view && mouseup) mouseGestures.set(view, { gesture, mouseup });
        }
      }
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
      const onZoomStart = latest.current.onZoomStart;
      if (!onZoomStart || bypassEvents.current) return;
      const coords = getCoords(width, height, d3Event.transform);
      const inverted = projection.invert?.(coords);
      if (inverted) {
        try {
          onZoomStart(
            {
              coordinates: createCoordinates(inverted[0], inverted[1]),
              zoom: d3Event.transform.k,
            },
            d3Event.sourceEvent || d3Event,
          );
        } finally {
          if (disposed) disposalTransform = zoomTransform(mapElement);
        }
      }
    }

    function handleZoomEnd(d3Event: D3ZoomEvent<SVGGElement, unknown>) {
      for (const gesture of activeGestures) {
        if (gesture.active === 0) activeGestures.delete(gesture);
      }
      if (suppressTouchCallbacks.current) return;
      if (pendingTouchStart) {
        pendingTouchStart = undefined;
        return;
      }
      if (bypassEvents.current) return;
      d3Event = restoreSourceEvent(d3Event);
      const coords = getCoords(width, height, d3Event.transform);
      const inverted = projection.invert?.(coords);
      if (inverted) {
        const [x, y] = inverted;
        const onZoomEnd = latest.current.onZoomEnd;
        if (!onZoomEnd) return;
        onZoomEnd(
          { coordinates: createCoordinates(x, y), zoom: d3Event.transform.k },
          d3Event.sourceEvent || d3Event,
        );
      }
    }

    function filterFunc(event: Event) {
      // D3 routes a canceled second tap through its double-click filter.
      if (event.type === 'touchcancel' || (!enableZoom && !enablePan))
        return false;
      const isScaling =
        event.type === 'wheel' ||
        event.type === 'dblclick' ||
        event.type === 'touchend';
      if (isScaling && !enableZoom) return false;
      if (!enablePan && !isScaling && event.type !== 'touchstart') return false;
      const originalEvent = originalTouchEvents.current.get(event) ?? event;
      const mouseEvent = originalEvent as MouseEvent;
      const currentFilter = latest.current.filterZoomEvent;
      const accepted = currentFilter
        ? currentFilter(originalEvent)
        : (!mouseEvent.ctrlKey || event.type === 'wheel') && !mouseEvent.button;
      if (disposed) return false;
      if (accepted && event.type === 'touchstart') {
        for (const touch of Array.from(
          (originalEvent as TouchEvent).changedTouches,
        )) {
          if (mapElement.contains(touch.target as Node))
            acceptedTouchIds.add(touch.identifier);
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

    const wheel = svg.on('wheel.zoom');
    svg.on(
      'wheel.zoom',
      function (event: WheelEvent, datum) {
        try {
          wheel?.call(this, event, datum);
        } finally {
          // D3 creates its wheel timer and transform after the start callback.
          if (disposed) {
            for (const gesture of activeGestures) {
              if (gesture.wheel) clearTimeout(gesture.wheel);
            }
            svg.property('__zoom', disposalTransform);
          }
        }
      },
      { passive: false },
    );

    const mousedown = svg.on('mousedown.zoom');
    svg.on('mousedown.zoom', function (event: MouseEvent, datum) {
      const root = event.view?.document.documentElement;
      // Overlapping mouse buttons must not replace D3's original selection style.
      overlappingSelection =
        root && Reflect.has(root, '__noselect')
          ? { root, value: Reflect.get(root, '__noselect') }
          : undefined;
      try {
        mousedown?.call(this, event, datum);
      } finally {
        overlappingSelection = undefined;
      }
    });

    if (enablePan || enableZoom) {
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
            if (
              type !== 'touchstart' &&
              !Array.from(event.changedTouches).some((touch) =>
                acceptedTouchIds.has(touch.identifier),
              )
            )
              return;
            const isScrolling =
              !enablePan &&
              type === 'touchmove' &&
              Array.from(event.touches).filter((touch) =>
                acceptedTouchIds.has(touch.identifier),
              ).length < 2;
            const proxy = new Proxy(event, {
              get(target, key) {
                if (
                  key === 'touches' ||
                  key === 'changedTouches' ||
                  key === 'targetTouches'
                ) {
                  return Array.from(target[key]).filter((touch) =>
                    acceptedTouchIds.has(touch.identifier),
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
                if (acceptedTouchIds.size === 0) return;
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
                  acceptedTouchIds.delete(touch.identifier);
                }
              }
            }
          },
          { passive: false },
        );
      }
    }

    for (const type of ['touchend', 'touchcancel'] as const) {
      const listener = svg.on(`${type}.zoom`);
      if (!listener) continue;
      svg.on(
        `${type}.zoom`,
        function (event: TouchEvent, datum) {
          const gesture = mapElement.__zooming;
          if (!gesture?.touch0 && !gesture?.touch1) return;
          listener.call(this, event, datum);
          if (type === 'touchcancel' && !gesture.touch0 && !gesture.touch1) {
            // Reinstall the behavior to discard D3's private double-tap timer.
            setTouchCancellation((value) => value + 1);
          }
        },
        { passive: false },
      );
    }

    return () => {
      disposed = true;
      disposalTransform = zoomTransform(mapElement);
      zoomBehavior.on('start zoom end', null);
      svg.on('.zoom', null);
      // An identity transform publicly interrupts pending double-click transitions.
      zoomBehavior.transform(svg, zoomTransform(mapElement));
      for (const gesture of activeGestures) {
        if (gesture.wheel) clearTimeout(gesture.wheel);
      }
      for (const [view, { gesture, mouseup }] of mouseGestures) {
        if (d3Select(view).on('mouseup.zoom') !== mouseup) continue;
        // Let D3 restore dragging/selection without suppressing the next page click.
        gesture.moved = false;
        const event = new MouseEvent('mouseup');
        Object.defineProperty(event, 'view', { value: view });
        mouseup.call(view, event, d3Select(view).datum());
      }
      if (mapElement.__zooming && activeGestures.has(mapElement.__zooming)) {
        delete mapElement.__zooming;
      }
      acceptedTouchIds.clear();
      if (zoomRef.current === zoomBehavior) zoomRef.current = undefined;
    };
  }, [
    targetElement,
    touchCancellation,
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
    mapRef,
    bypassEvents,
  ]);

  return {
    zoomRef,
    handleZoom,
  };
}

export default useZoomBehavior;
