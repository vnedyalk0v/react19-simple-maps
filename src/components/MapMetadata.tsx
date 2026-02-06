import { ReactNode } from 'react';

/**
 * Produce a JSON string of `data` that is safe to embed inside a <script type="application/ld+json"> element.
 *
 * Escapes characters that can terminate or break out of script content to help prevent script-injection issues.
 *
 * @returns The escaped JSON string suitable for inclusion in an HTML script block
 * @see https://html.spec.whatwg.org/multipage/scripting.html#restrictions-for-contents-of-script-elements
 */
function safeJsonLdSerialize(data: object): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

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
 * Renders document metadata (title, meta tags, Open Graph, Twitter Card, JSON-LD, and map-specific tags) for map pages.
 *
 * Renders appropriate <title>, <meta>, <link>, <script type="application/ld+json"> (with JSON-LD safely serialized and escaped), and resource preload tags based on provided props.
 *
 * @param jsonLd - Structured data object to embed as JSON-LD; it will be safely serialized and escaped to prevent script-breakout XSS.
 * @param keywords - List of keywords; when non-empty they are joined with commas into a meta `keywords` tag.
 * @param children - Additional elements to render after the generated metadata.
 * @returns The metadata elements to include in the document head for the current page.
 */
export function MapMetadata({
  title,
  description,
  keywords = [],
  author,
  viewport = 'width=device-width, initial-scale=1',
  canonicalUrl,
  ogTitle,
  ogDescription,
  ogImage,
  ogUrl,
  twitterCard = 'summary_large_image',
  twitterTitle,
  twitterDescription,
  twitterImage,
  jsonLd,
  children,
}: MapMetadataProps) {
  return (
    <>
      {/* Basic metadata */}
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      {author && <meta name="author" content={author} />}
      <meta name="viewport" content={viewport} />

      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph metadata */}
      {ogTitle && <meta property="og:title" content={ogTitle} />}
      {ogDescription && (
        <meta property="og:description" content={ogDescription} />
      )}
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogUrl && <meta property="og:url" content={ogUrl} />}
      <meta property="og:type" content="website" />

      {/* Twitter Card metadata */}
      <meta name="twitter:card" content={twitterCard} />
      {twitterTitle && <meta name="twitter:title" content={twitterTitle} />}
      {twitterDescription && (
        <meta name="twitter:description" content={twitterDescription} />
      )}
      {twitterImage && <meta name="twitter:image" content={twitterImage} />}

      {/* JSON-LD structured data (safely escaped to prevent script-breakout XSS) */}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdSerialize(jsonLd) }}
        />
      )}

      {/* Map-specific metadata */}
      <meta name="geo.region" content="world" />
      <meta name="geo.placename" content="World Map" />
      <meta name="ICBM" content="0, 0" />

      {/* Preload critical resources */}
      <link
        rel="preload"
        href="/fonts/map-font.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />

      {children}
    </>
  );
}

/**
 * Predefined metadata configurations for common map types
 */
export const mapMetadataPresets = {
  worldMap: {
    title: 'Interactive World Map',
    description:
      'Explore the world with our interactive map featuring countries, cities, and geographic data.',
    keywords: [
      'world map',
      'interactive map',
      'geography',
      'countries',
      'atlas',
    ],
    author: 'React Simple Maps',
    ogTitle: 'Interactive World Map',
    ogDescription:
      'Explore the world with our interactive map featuring countries, cities, and geographic data.',
    twitterTitle: 'Interactive World Map',
    twitterDescription:
      'Explore the world with our interactive map featuring countries, cities, and geographic data.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Map',
      name: 'Interactive World Map',
      description:
        'An interactive world map showing countries and geographic features',
      mapType: 'https://schema.org/VenueMap',
    },
  },

  countryMap: (countryName: string) => ({
    title: `${countryName} Map - Interactive Geographic Data`,
    description: `Explore ${countryName} with detailed geographic information, cities, and regional data.`,
    keywords: [
      countryName.toLowerCase(),
      'map',
      'geography',
      'interactive',
      'regions',
    ],
    author: 'React Simple Maps',
    ogTitle: `${countryName} Interactive Map`,
    ogDescription: `Explore ${countryName} with detailed geographic information, cities, and regional data.`,
    twitterTitle: `${countryName} Interactive Map`,
    twitterDescription: `Explore ${countryName} with detailed geographic information, cities, and regional data.`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Map',
      name: `${countryName} Map`,
      description: `Interactive map of ${countryName} with geographic features`,
      mapType: 'https://schema.org/VenueMap',
      about: {
        '@type': 'Country',
        name: countryName,
      },
    },
  }),

  cityMap: (cityName: string, countryName?: string) => ({
    title: `${cityName} Map${countryName ? ` - ${countryName}` : ''} - Interactive City Guide`,
    description: `Explore ${cityName} with our interactive map featuring neighborhoods, landmarks, and local information.`,
    keywords: [
      cityName.toLowerCase(),
      'city map',
      'urban planning',
      'neighborhoods',
      'interactive',
    ],
    author: 'React Simple Maps',
    ogTitle: `${cityName} Interactive City Map`,
    ogDescription: `Explore ${cityName} with our interactive map featuring neighborhoods, landmarks, and local information.`,
    twitterTitle: `${cityName} Interactive City Map`,
    twitterDescription: `Explore ${cityName} with our interactive map featuring neighborhoods, landmarks, and local information.`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Map',
      name: `${cityName} City Map`,
      description: `Interactive map of ${cityName} with city features`,
      mapType: 'https://schema.org/VenueMap',
      about: {
        '@type': 'City',
        name: cityName,
        ...(countryName && {
          containedInPlace: {
            '@type': 'Country',
            name: countryName,
          },
        }),
      },
    },
  }),

  dataVisualization: (dataType: string) => ({
    title: `${dataType} Data Visualization - Interactive Map`,
    description: `Visualize ${dataType} data on an interactive map with real-time updates and detailed analytics.`,
    keywords: [
      dataType.toLowerCase(),
      'data visualization',
      'analytics',
      'interactive map',
      'statistics',
    ],
    author: 'React Simple Maps',
    ogTitle: `${dataType} Data Visualization`,
    ogDescription: `Visualize ${dataType} data on an interactive map with real-time updates and detailed analytics.`,
    twitterTitle: `${dataType} Data Visualization`,
    twitterDescription: `Visualize ${dataType} data on an interactive map with real-time updates and detailed analytics.`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `${dataType} Geographic Dataset`,
      description: `Geographic visualization of ${dataType} data`,
      distribution: {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
      },
    },
  }),
};

/**
 * Hook for dynamic metadata management
 */
export function useMapMetadata(config: MapMetadataProps) {
  // In a real application, this could update document metadata
  // For now, it returns the configuration for use with MapMetadata component
  return config;
}

/**
 * Higher-order component for automatic metadata injection
 */
export function withMapMetadata<P extends object>(
  Component: React.ComponentType<P>,
  metadataConfig: MapMetadataProps | ((props: P) => MapMetadataProps),
) {
  return function WrappedComponent(props: P) {
    const metadata =
      typeof metadataConfig === 'function'
        ? metadataConfig(props)
        : metadataConfig;

    return (
      <>
        <MapMetadata {...metadata} />
        <Component {...props} />
      </>
    );
  };
}

export default MapMetadata;