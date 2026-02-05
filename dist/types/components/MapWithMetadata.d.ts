import { ComposableMapProps } from '../types';
import { mapMetadataPresets } from './MapMetadata';
interface MapWithMetadataProps extends ComposableMapProps {
    metadata: Required<NonNullable<ComposableMapProps['metadata']>>;
    enableSEO?: boolean;
    enableOpenGraph?: boolean;
    enableTwitterCards?: boolean;
    enableJsonLd?: boolean;
    preset?: keyof typeof mapMetadataPresets;
}
declare function MapWithMetadata({ metadata, enableSEO, enableOpenGraph, enableTwitterCards, enableJsonLd, preset, children, ...mapProps }: MapWithMetadataProps): import("react/jsx-runtime").JSX.Element;
declare namespace MapWithMetadata {
    var displayName: string;
}
declare const _default: import("react").MemoExoticComponent<typeof MapWithMetadata>;
export default _default;
export type { MapWithMetadataProps };
export declare const metadataPresets: Array<keyof typeof mapMetadataPresets>;
export declare function createMapMetadata(title: string, description: string, options?: {
    keywords?: string[];
    author?: string;
    canonicalUrl?: string;
}): Required<NonNullable<ComposableMapProps['metadata']>>;
export declare function createMetadataFromPreset(preset: keyof typeof mapMetadataPresets, overrides?: Partial<Required<NonNullable<ComposableMapProps['metadata']>>>): Required<NonNullable<ComposableMapProps['metadata']>>;
//# sourceMappingURL=MapWithMetadata.d.ts.map