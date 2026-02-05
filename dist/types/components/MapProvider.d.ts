import React, { ReactNode } from 'react';
import { GeoProjection } from 'd3-geo';
import { MapContextType, ProjectionConfig } from '../types';
declare const MapContext: React.Context<MapContextType | undefined>;
interface MapProviderProps {
    width: number;
    height: number;
    projection?: string | GeoProjection;
    projectionConfig?: ProjectionConfig;
    children: ReactNode;
}
declare const MapProvider: React.FC<MapProviderProps>;
declare const useMapContext: () => MapContextType;
export { MapProvider, MapContext, useMapContext };
//# sourceMappingURL=MapProvider.d.ts.map