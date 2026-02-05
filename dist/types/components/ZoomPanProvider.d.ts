import React, { ReactNode } from 'react';
import { ZoomPanContextType } from '../types';
declare const ZoomPanContext: React.Context<ZoomPanContextType | undefined>;
interface ZoomPanProviderProps {
    value?: ZoomPanContextType;
    children: ReactNode;
}
declare const ZoomPanProvider: React.FC<ZoomPanProviderProps>;
declare const useZoomPanContext: () => ZoomPanContextType;
export { ZoomPanContext, ZoomPanProvider, useZoomPanContext };
//# sourceMappingURL=ZoomPanProvider.d.ts.map