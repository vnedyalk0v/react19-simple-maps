import { ReactNode } from 'react';
interface MapMetadataProps {
    title?: string;
    description?: string;
    keywords?: string[];
    author?: string;
    viewport?: string;
    canonicalUrl?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogUrl?: string;
    twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    jsonLd?: object;
    children?: ReactNode;
}
/**
 * MapMetadata component using React 19 native metadata tags
 * Provides SEO and social media optimization for map components
 */
export declare function MapMetadata({ title, description, keywords, author, viewport, canonicalUrl, ogTitle, ogDescription, ogImage, ogUrl, twitterCard, twitterTitle, twitterDescription, twitterImage, jsonLd, children, }: MapMetadataProps): import("react/jsx-runtime").JSX.Element;
/**
 * Predefined metadata configurations for common map types
 */
export declare const mapMetadataPresets: {
    worldMap: {
        title: string;
        description: string;
        keywords: string[];
        author: string;
        ogTitle: string;
        ogDescription: string;
        twitterTitle: string;
        twitterDescription: string;
        jsonLd: {
            '@context': string;
            '@type': string;
            name: string;
            description: string;
            mapType: string;
        };
    };
    countryMap: (countryName: string) => {
        title: string;
        description: string;
        keywords: string[];
        author: string;
        ogTitle: string;
        ogDescription: string;
        twitterTitle: string;
        twitterDescription: string;
        jsonLd: {
            '@context': string;
            '@type': string;
            name: string;
            description: string;
            mapType: string;
            about: {
                '@type': string;
                name: string;
            };
        };
    };
    cityMap: (cityName: string, countryName?: string) => {
        title: string;
        description: string;
        keywords: string[];
        author: string;
        ogTitle: string;
        ogDescription: string;
        twitterTitle: string;
        twitterDescription: string;
        jsonLd: {
            '@context': string;
            '@type': string;
            name: string;
            description: string;
            mapType: string;
            about: {
                containedInPlace?: {
                    '@type': string;
                    name: string;
                };
                '@type': string;
                name: string;
            };
        };
    };
    dataVisualization: (dataType: string) => {
        title: string;
        description: string;
        keywords: string[];
        author: string;
        ogTitle: string;
        ogDescription: string;
        twitterTitle: string;
        twitterDescription: string;
        jsonLd: {
            '@context': string;
            '@type': string;
            name: string;
            description: string;
            distribution: {
                '@type': string;
                encodingFormat: string;
            };
        };
    };
};
/**
 * Hook for dynamic metadata management
 */
export declare function useMapMetadata(config: MapMetadataProps): MapMetadataProps;
/**
 * Higher-order component for automatic metadata injection
 */
export declare function withMapMetadata<P extends object>(Component: React.ComponentType<P>, metadataConfig: MapMetadataProps | ((props: P) => MapMetadataProps)): (props: P) => import("react/jsx-runtime").JSX.Element;
export default MapMetadata;
//# sourceMappingURL=MapMetadata.d.ts.map