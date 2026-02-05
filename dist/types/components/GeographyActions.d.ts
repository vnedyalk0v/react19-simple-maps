import { FeatureCollection } from 'geojson';
import { Topology } from 'topojson-specification';
export declare function loadGeographyAction(_previousState: {
    data: Topology | FeatureCollection | null;
    error: string | null;
}, formData: FormData): Promise<{
    data: Topology | FeatureCollection | null;
    error: string | null;
}>;
export declare const loadGeographyCached: typeof loadGeographyAction;
export declare function preloadGeographyAction(url: string): Promise<void>;
export declare function validateGeographyUrlAction(url: string): Promise<{
    valid: boolean;
    error?: string;
}>;
//# sourceMappingURL=GeographyActions.d.ts.map