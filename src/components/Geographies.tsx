import { Ref, ReactNode, memo, useCallback, useEffect } from 'react';
import { GeographiesProps, ErrorBoundaryFallback } from '../types';
import { useMapContext } from './MapProvider';
import useGeographies from './useGeographies';
import GeographyErrorBoundary from './GeographyErrorBoundary';

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

  const { geographies, outline, borders, isLoading, error } = geographyData;

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

  const loadingFallback = (
    <text className="rsm-loading-text" x="50%" y="50%" textAnchor="middle">
      Loading...
    </text>
  );

  if (isLoading) {
    return (
      <g ref={ref} className={`rsm-geographies ${className}`} {...restProps}>
        {loadingFallback}
      </g>
    );
  }

  if (error) {
    if (fallback && typeof fallback === 'function') {
      return (
        <g ref={ref} className={`rsm-geographies ${className}`} {...restProps}>
          {(fallback as ErrorBoundaryFallback)(error, () => {
            /* retry is handled by changing the geography prop */
          })}
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

export default memo(Geographies);
