import { memo, useMemo } from 'react';
import { ComposableMapProps } from '../types';
import ComposableMap from './ComposableMap';
import { MapMetadata, mapMetadataPresets } from './MapMetadata';

// Enhanced metadata props for the wrapper component
interface MapWithMetadataProps extends ComposableMapProps {
  // Override metadata to make it required for this component
  metadata: Required<NonNullable<ComposableMapProps['metadata']>>;

  // Additional metadata options
  enableSEO?: boolean;
  enableOpenGraph?: boolean;
  enableTwitterCards?: boolean;
  enableJsonLd?: boolean;

  // Custom metadata presets
  preset?: keyof typeof mapMetadataPresets;
}

function MapWithMetadata({
  metadata,
  enableSEO = true,
  enableOpenGraph = true,
  enableTwitterCards = true,
  enableJsonLd = true,
  preset = 'worldMap',
  children,
  ...mapProps
}: MapWithMetadataProps) {
  // Memoize the processed metadata to prevent unnecessary recalculations
  const processedMetadata = useMemo(() => {
    const presetData = mapMetadataPresets[preset];

    // Handle function presets (like countryMap)
    const resolvedPresetData =
      typeof presetData === 'function'
        ? presetData('Default') // Provide a default parameter for function presets
        : presetData;

    return {
      title: metadata.title || resolvedPresetData.title,
      description: metadata.description || resolvedPresetData.description,
      keywords: metadata.keywords || resolvedPresetData.keywords,
      author: metadata.author || resolvedPresetData.author || '',
      canonicalUrl: metadata.canonicalUrl || '',
      ogTitle: enableOpenGraph
        ? metadata.title || resolvedPresetData.ogTitle
        : undefined,
      ogDescription: enableOpenGraph
        ? metadata.description || resolvedPresetData.ogDescription
        : undefined,
      twitterTitle: enableTwitterCards
        ? metadata.title || resolvedPresetData.twitterTitle
        : undefined,
      twitterDescription: enableTwitterCards
        ? metadata.description || resolvedPresetData.twitterDescription
        : undefined,
      jsonLd: enableJsonLd ? resolvedPresetData.jsonLd : undefined,
    };
  }, [metadata, preset, enableOpenGraph, enableTwitterCards, enableJsonLd]);

  // Memoize the metadata component to prevent unnecessary re-renders
  const metadataComponent = useMemo(() => {
    if (!enableSEO) return null;

    return (
      <MapMetadata
        title={processedMetadata.title}
        description={processedMetadata.description}
        keywords={processedMetadata.keywords}
        {...(processedMetadata.author && { author: processedMetadata.author })}
        {...(processedMetadata.canonicalUrl && {
          canonicalUrl: processedMetadata.canonicalUrl,
        })}
        {...(processedMetadata.ogTitle && {
          ogTitle: processedMetadata.ogTitle,
        })}
        {...(processedMetadata.ogDescription && {
          ogDescription: processedMetadata.ogDescription,
        })}
        {...(processedMetadata.twitterTitle && {
          twitterTitle: processedMetadata.twitterTitle,
        })}
        {...(processedMetadata.twitterDescription && {
          twitterDescription: processedMetadata.twitterDescription,
        })}
        {...(processedMetadata.jsonLd && { jsonLd: processedMetadata.jsonLd })}
      />
    );
  }, [processedMetadata, enableSEO]);

  return (
    <>
      {metadataComponent}
      <ComposableMap {...mapProps}>{children}</ComposableMap>
    </>
  );
}

MapWithMetadata.displayName = 'MapWithMetadata';

export default memo(MapWithMetadata);

// Export the props type for external use
export type { MapWithMetadataProps };

// Export preset options for convenience
export const metadataPresets = Object.keys(mapMetadataPresets) as Array<
  keyof typeof mapMetadataPresets
>;

// Helper function to create metadata objects
export function createMapMetadata(
  title: string,
  description: string,
  options?: {
    keywords?: string[];
    author?: string;
    canonicalUrl?: string;
  },
): Required<NonNullable<ComposableMapProps['metadata']>> {
  return {
    title,
    description,
    keywords: options?.keywords || [],
    author: options?.author || '',
    canonicalUrl: options?.canonicalUrl || '',
  };
}

// Helper function to create metadata from preset
export function createMetadataFromPreset(
  preset: keyof typeof mapMetadataPresets,
  overrides?: Partial<Required<NonNullable<ComposableMapProps['metadata']>>>,
): Required<NonNullable<ComposableMapProps['metadata']>> {
  const presetData = mapMetadataPresets[preset];

  // Handle function presets
  const resolvedPresetData =
    typeof presetData === 'function'
      ? presetData('Default') // Provide a default parameter for function presets
      : presetData;

  return {
    title: overrides?.title || resolvedPresetData.title,
    description: overrides?.description || resolvedPresetData.description,
    keywords: overrides?.keywords || resolvedPresetData.keywords,
    author: overrides?.author || resolvedPresetData.author,
    canonicalUrl: overrides?.canonicalUrl || '',
  };
}
