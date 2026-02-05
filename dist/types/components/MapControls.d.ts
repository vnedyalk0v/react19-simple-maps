import { ReactNode } from 'react';
import { Position, Coordinates } from '../types';
interface MapControlsProps {
    initialPosition?: Position;
    onPositionChange?: (position: Position) => void;
    onGeographySelect?: (geography: string | null) => void;
    children?: (props: {
        position: Position;
        selectedGeography: string | null;
        isLoading: boolean;
        resetView: () => void;
        setZoom: (zoom: number) => void;
        setCenter: (center: Coordinates) => void;
        selectGeography: (geography: string | null) => void;
    }) => ReactNode;
}
export declare function MapControls({ initialPosition, onPositionChange, onGeographySelect, children, }: MapControlsProps): import("react/jsx-runtime").JSX.Element | null;
export default MapControls;
//# sourceMappingURL=MapControls.d.ts.map