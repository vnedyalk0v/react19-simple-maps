import { ZoomPanState } from '../types';
interface ZoomPanPosition extends ZoomPanState {
    dragging?: Event | undefined;
}
interface UseDeferredPositionProps {
    initialPosition?: ZoomPanPosition;
    transitionPriority?: 'background' | 'normal' | 'urgent';
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
    isDeferred: boolean;
    updateCount: number;
}
export declare function useDeferredPosition({ initialPosition, transitionPriority, // Reserved for future React 19 scheduler integration
deferredUpdateThreshold, }?: UseDeferredPositionProps): UseDeferredPositionReturn;
export default useDeferredPosition;
//# sourceMappingURL=useDeferredPosition.d.ts.map