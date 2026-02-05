import { ZoomBehavior } from 'd3-zoom';
import { GeoProjection } from 'd3-geo';
import { ZoomPanState, Coordinates } from '../types';
interface UsePanBehaviorProps {
    mapRef: React.RefObject<SVGGElement | null>;
    zoomRef: React.RefObject<ZoomBehavior<SVGGElement, unknown> | undefined>;
    width: number;
    height: number;
    projection: GeoProjection;
    center: Coordinates;
    zoom: number;
    bypassEvents: React.MutableRefObject<boolean>;
    onPositionChange?: (position: ZoomPanState) => void;
    startTransition: (callback: () => void) => void;
}
interface UsePanBehaviorReturn {
    lastPosition: React.MutableRefObject<ZoomPanState>;
    programmaticMove: (center: Coordinates, zoom: number) => void;
}
export declare function usePanBehavior({ mapRef, zoomRef, width, height, projection, center, zoom, bypassEvents, onPositionChange, startTransition, }: UsePanBehaviorProps): UsePanBehaviorReturn;
export default usePanBehavior;
//# sourceMappingURL=usePanBehavior.d.ts.map