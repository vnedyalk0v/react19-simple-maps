import { ReactNode } from 'react';
import { Feature, FeatureCollection, Geometry } from 'geojson';
import { Topology } from 'topojson-specification';
import { GeographyData } from '../../types';
type ParseGeographiesFunction = (geographies: Feature<Geometry>[]) => Feature<Geometry>[];
interface GeographyServerProps {
    geography: string;
    children: (data: GeographyData) => ReactNode;
    parseGeographies?: ParseGeographiesFunction;
}
interface GeographyProcessorProps {
    geographyData: Topology | FeatureCollection;
    parseGeographies?: ParseGeographiesFunction;
    children: (data: GeographyData) => ReactNode;
}
declare function GeographyProcessor({ geographyData, parseGeographies, children, }: GeographyProcessorProps): ReactNode;
export declare function GeographyServer({ geography, children, parseGeographies, }: GeographyServerProps): Promise<import("react/jsx-runtime").JSX.Element>;
export { GeographyProcessor };
export type { GeographyServerProps, ParseGeographiesFunction };
export default GeographyServer;
//# sourceMappingURL=GeographyServer.d.ts.map