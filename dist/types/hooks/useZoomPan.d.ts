import { Position, Coordinates, ScaleExtent, TranslateExtent } from '../types';
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
    position: {
        x: number;
        y: number;
        k: number;
        dragging?: Event | undefined;
    };
    transformString: string;
    isPending: boolean;
}
export declare function useZoomPan({ center, filterZoomEvent, onMoveStart, onMoveEnd, onMove, translateExtent, scaleExtent, zoom, }: UseZoomPanHookProps): UseZoomPanReturn;
export default useZoomPan;
//# sourceMappingURL=useZoomPan.d.ts.map