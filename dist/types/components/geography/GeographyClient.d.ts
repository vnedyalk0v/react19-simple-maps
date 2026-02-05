import { ReactNode } from 'react';
import { FeatureCollection } from 'geojson';
import { Topology } from 'topojson-specification';
import { ParseGeographiesFunction } from './GeographyServer';
import { GeographyData } from '../../types';
interface GeographyClientProps {
    geography: string | Topology | FeatureCollection;
    children: (data: GeographyData) => ReactNode;
    parseGeographies?: ParseGeographiesFunction;
    fallback?: ReactNode;
}
export declare function GeographyClient({ geography, children, parseGeographies, fallback, }: GeographyClientProps): import("react/jsx-runtime").JSX.Element;
export type { GeographyClientProps };
export default GeographyClient;
//# sourceMappingURL=GeographyClient.d.ts.map