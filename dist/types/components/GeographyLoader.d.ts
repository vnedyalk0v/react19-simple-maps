import { ReactNode } from 'react';
import { FeatureCollection } from 'geojson';
import { Topology } from 'topojson-specification';
interface GeographyLoaderProps {
    url: string;
    onLoad?: (data: Topology | FeatureCollection) => void;
    onError?: (error: string) => void;
    children?: (props: {
        data: Topology | FeatureCollection | null;
        isLoading: boolean;
        error: string | null;
        reload: () => void;
    }) => ReactNode;
    fallback?: ReactNode;
    preload?: boolean;
}
export declare function GeographyLoader({ url, onLoad, onError, children, fallback, preload, }: GeographyLoaderProps): import("react/jsx-runtime").JSX.Element;
export default GeographyLoader;
//# sourceMappingURL=GeographyLoader.d.ts.map