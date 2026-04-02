import { Ref, ReactNode, memo, useCallback, useEffect } from 'react';
import { GeographiesProps, ErrorBoundaryFallback } from '../types';
import { useMapContext } from './MapProvider';
import useGeographies from './useGeographies';
import GeographyErrorBoundary from './GeographyErrorBoundary';

const LOADING_FALLBACK = (
  <text className="rsm-loading-text" x="50%" y="50%" textAnchor="middle">
    Loading...
  </text>
);

const GEOGRAPHIES_KNOWN_PROP_KEYS = new Set([
  'geography',
  'children',
  'parseGeographies',
  'className',
  'errorBoundary',
  'onGeographyError',
  'fallback',
  'ref',
]);

function areGeographiesPropsEqual(
  prev: Readonly<GeographiesProps<boolean> & { ref?: Ref<SVGGElement> }>,
  next: Readonly<GeographiesProps<boolean> & { ref?: Ref<SVGGElement> }>,
): boolean {
  if (prev.geography !== next.geography) return false;
  if (prev.className !== next.className) return false;
  if (prev.errorBoundary !== next.errorBoundary) return false;
  if (prev.children !== next.children) return false;
  if (prev.parseGeographies !== next.parseGeographies) return false;
  if (prev.onGeographyError !== next.onGeographyError) return false;
  if (prev.fallback !== next.fallback) return false;
  if (prev.ref !== next.ref) return false;

  const prevRec = prev as Record<string, unknown>;
  const nextRec = next as Record<string, unknown>;
  const restKeys = new Set([...Object.keys(prevRec), ...Object.keys(nextRec)]);
  for (const key of restKeys) {
    if (GEOGRAPHIES_KNOWN_PROP_KEYS.has(key)) continue;
    if (prevRec[key] !== nextRec[key]) return false;
  }
  return true;
}

function Geographies({
  geography,
  children,
  parseGeographies,
  className = '',
  errorBoundary = false,
  onGeographyError,
  fallback,
  ref,
  ...restProps
}: GeographiesProps<boolean> & { ref?: Ref<SVGGElement> }) {
  const { path, projection } = useMapContext();

  const geographyData = useGeographies({
    geography,
    ...(parseGeographies && { parseGeographies }),
  });

  const { geographies, outline, borders, isLoading, error, refetch } =
    geographyData;

  useEffect(() => {
    if (error && onGeographyError) {
      onGeographyError(error);
    }
  }, [error, onGeographyError]);

  const renderChildren = useCallback(() => {
    if (!geographies || geographies.length === 0) {
      return null;
    }
    return children({ geographies, outline, borders, path, projection });
  }, [geographies, outline, borders, children, path, projection]);

  if (isLoading) {
    return (
      <g ref={ref} className={`rsm-geographies ${className}`} {...restProps}>
        {LOADING_FALLBACK}
      </g>
    );
  }

  if (error) {
    if (fallback && typeof fallback === 'function') {
      return (
        <g ref={ref} className={`rsm-geographies ${className}`} {...restProps}>
          {(fallback as ErrorBoundaryFallback)(error, refetch ?? (() => {}))}
        </g>
      );
    }
    return (
      <g ref={ref} className={`rsm-geographies ${className}`} {...restProps}>
        <text
          className="rsm-error-text"
          x="50%"
          y="50%"
          textAnchor="middle"
          fill="currentColor"
        >
          Failed to load geography data
        </text>
      </g>
    );
  }

  const content = renderChildren();

  if (errorBoundary) {
    const errorBoundaryProps: {
      onError?: (error: Error) => void;
      fallback?: (error: Error, retry: () => void) => ReactNode;
    } = {};

    if (onGeographyError) {
      errorBoundaryProps.onError = onGeographyError;
    }

    if (fallback) {
      errorBoundaryProps.fallback = fallback;
    }

    return (
      <g ref={ref} className={`rsm-geographies ${className}`} {...restProps}>
        <GeographyErrorBoundary {...errorBoundaryProps}>
          {content}
        </GeographyErrorBoundary>
      </g>
    );
  }

  return (
    <g ref={ref} className={`rsm-geographies ${className}`} {...restProps}>
      {content}
    </g>
  );
}

Geographies.displayName = 'Geographies';

export default memo(Geographies, areGeographiesPropsEqual);
