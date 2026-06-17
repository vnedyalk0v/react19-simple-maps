import { useEffect, useRef, useCallback } from 'react';
import { zoom as d3Zoom, ZoomBehavior, D3ZoomEvent } from 'd3-zoom';
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
    if (!mapRef.current) return;

    const svg = d3Select(mapRef.current);

    function handleZoomStart(d3Event: D3ZoomEvent<SVGGElement, unknown>) {
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
      if (bypassEvents.current) {
        bypassEvents.current = false;
        return;
      }
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

    function filterFunc(d3Event: D3ZoomEvent<SVGGElement, unknown> | null) {
      if (filterZoomEvent && d3Event) {
        return filterZoomEvent(d3Event.sourceEvent || d3Event);
      }
      return d3Event
        ? !d3Event.sourceEvent?.ctrlKey && !d3Event.sourceEvent?.button
        : false;
    }

    const zoomBehavior = d3Zoom<SVGGElement, unknown>()
      .filter(filterFunc)
      .scaleExtent([minZoom, maxZoom])
      .translateExtent([
        [a1, a2],
        [b1, b2],
      ])
      .on('start', handleZoomStart)
      .on('zoom', handleZoom)
      .on('end', handleZoomEnd);

    zoomRef.current = zoomBehavior;
    svg.call(zoomBehavior);

    return () => {
      // Mirror setup: remove all d3-zoom listeners bound under the .zoom
      // namespace so they don't outlive this effect run / component unmount.
      svg.on('.zoom', null);
    };
  }, [
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
