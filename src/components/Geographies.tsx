import { Ref, memo, useEffect, useRef } from 'react';
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
  prev: Readonly<
    GeographiesProps<boolean> & { ref?: Ref<SVGGElement> | undefined }
  >,
  next: Readonly<
    GeographiesProps<boolean> & { ref?: Ref<SVGGElement> | undefined }
  >,
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

function GeographiesContent({
  geography,
  children,
  parseGeographies,
  onGeographyError,
  fallback,
}: Pick<
  GeographiesProps<true>,
  'geography' | 'children' | 'parseGeographies'
> & {
  onGeographyError?: (error: Error) => void;
  fallback?: ErrorBoundaryFallback;
}) {
  const { path, projection } = useMapContext();

  const geographyData = useGeographies({
    geography,
    ...(parseGeographies && { parseGeographies }),
  });

  const { geographies, outline, borders, isLoading, error, refetch } =
    geographyData;

  const reportedError = useRef<Error | null>(null);
  useEffect(() => {
    if (!error) {
      reportedError.current = null;
    } else if (onGeographyError && reportedError.current !== error) {
      // Report each failure once, even if its handler updates parent state.
      reportedError.current = error;
      onGeographyError(error);
    }
  }, [error, onGeographyError]);

  if (isLoading) return LOADING_FALLBACK;

  if (error) {
    if (fallback && typeof fallback === 'function') {
      return (fallback as ErrorBoundaryFallback)(error, refetch ?? (() => {}));
    }
    return (
      <text
        className="rsm-error-text"
        x="50%"
        y="50%"
        textAnchor="middle"
        fill="currentColor"
      >
        Failed to load geography data
      </text>
    );
  }

  return geographies.length
    ? children({ geographies, outline, borders, path, projection })
    : null;
}

function Geographies({
  className = '',
  errorBoundary = false,
  ref,
  geography,
  children,
  parseGeographies,
  onGeographyError,
  fallback,
  ...restProps
}: GeographiesProps<boolean> & { ref?: Ref<SVGGElement> | undefined }) {
  const content = (
    <GeographiesContent
      geography={geography}
      {...(parseGeographies && { parseGeographies })}
      {...(onGeographyError && { onGeographyError })}
      {...(fallback && { fallback })}
    >
      {children}
    </GeographiesContent>
  );

  return (
    <g ref={ref} className={`rsm-geographies ${className}`} {...restProps}>
      {errorBoundary ? (
        // A new URL clears a caught error. Inline objects are not used as the
        // reset signal: a parent that recreates its data on every render
        // would otherwise reset, re-throw and loop. Give inline data a
        // `key` to reset it explicitly.
        <GeographyErrorBoundary
          resetKey={typeof geography === 'string' ? geography : undefined}
          {...(onGeographyError && { onError: onGeographyError })}
          {...(fallback && { fallback })}
        >
          {content}
        </GeographyErrorBoundary>
      ) : (
        content
      )}
    </g>
  );
}

Geographies.displayName = 'Geographies';

export default memo(Geographies, areGeographiesPropsEqual);
