import { ZoomBehavior, D3ZoomEvent } from 'd3-zoom';
import { GeoProjection } from 'd3-geo';
import { ScaleExtent, TranslateExtent } from '../types';
import { Position } from '../types';
interface UseZoomBehaviorProps {
    mapRef: React.RefObject<SVGGElement | null>;
    width: number;
    height: number;
    projection: GeoProjection;
    scaleExtent: ScaleExtent;
    translateExtent: TranslateExtent;
    filterZoomEvent?: (event: Event) => boolean;
    onZoom?: (transform: {
        x: number;
        y: number;
        k: number;
    }, sourceEvent?: Event) => void;
    onZoomStart?: ((position: Position, event: Event) => void) | undefined;
    onZoomEnd?: ((position: Position, event: Event) => void) | undefined;
    onMove?: ((position: Position, event: Event) => void) | undefined;
    bypassEvents: React.MutableRefObject<boolean>;
}
interface UseZoomBehaviorReturn {
    zoomRef: React.RefObject<ZoomBehavior<SVGGElement, unknown> | undefined>;
    handleZoom: (d3Event: D3ZoomEvent<SVGGElement, unknown>) => void;
}
export declare function useZoomBehavior({ mapRef, width, height, projection, scaleExtent, translateExtent, filterZoomEvent, onZoom, onZoomStart, onZoomEnd, onMove, bypassEvents, }: UseZoomBehaviorProps): UseZoomBehaviorReturn;
export default useZoomBehavior;
//# sourceMappingURL=useZoomBehavior.d.ts.map