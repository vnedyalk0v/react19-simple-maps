import { Ref } from 'react';
import {
  ZoomableGroupPropsUnion,
  SimpleZoomableGroupProps,
  createCoordinates,
  createScaleExtent,
  createTranslateExtent,
} from '../types';
import { useMapContext } from './MapProvider';
import { ZoomPanProvider } from './ZoomPanProvider';
import useZoomPan from './useZoomPan';
import { ZoomPanIndicator } from './LoadingStates';

// Type guard to check if props are SimpleZoomableGroupProps
function isSimpleProps(
  props: ZoomableGroupPropsUnion,
): props is SimpleZoomableGroupProps {
  return (
    'enableZoom' in props ||
    'enablePan' in props ||
    ('minZoom' in props && 'maxZoom' in props && !('scaleExtent' in props))
  );
}

function ZoomableGroup(
  props: ZoomableGroupPropsUnion & { ref?: Ref<SVGGElement> },
) {
  const {
    center = createCoordinates(0, 0),
    zoom = 1,
    filterZoomEvent,
    onMoveStart,
    onMove,
    onMoveEnd,
    className = '',
    children,
    ref,
    // Extract ZoomableGroup-specific props to prevent React DOM warnings
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    minZoom,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    maxZoom,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    enableZoom,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    enablePan,
    scaleExtent,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    translateExtent,
    ...restProps
  } = props;

  const { width, height } = useMapContext();

  // Handle both simple and complex API
  let finalMinZoom = 1;
  let finalMaxZoom = 8;
  let finalTranslateExtent;

  if (isSimpleProps(props)) {
    // Simple API - use provided values or defaults
    finalMinZoom = props.minZoom ?? 1;
    finalMaxZoom = props.maxZoom ?? 8;
    finalTranslateExtent =
      props.translateExtent ??
      (props.enablePan !== false
        ? createTranslateExtent(
            createCoordinates(-Infinity, -Infinity),
            createCoordinates(Infinity, Infinity),
          )
        : undefined);
  } else {
    // Complex API - extract from conditional types
    const complexProps = props as {
      minZoom?: number;
      maxZoom?: number;
      translateExtent?: typeof finalTranslateExtent;
    };
    finalMinZoom = complexProps.minZoom ?? 1;
    finalMaxZoom = complexProps.maxZoom ?? 8;
    finalTranslateExtent = complexProps.translateExtent;
  }

  const finalScaleExtent =
    scaleExtent ?? createScaleExtent(finalMinZoom, finalMaxZoom);

  const { mapRef, transformString, position, isPending } = useZoomPan({
    center,
    ...(filterZoomEvent && { filterZoomEvent }),
    ...(onMoveStart && { onMoveStart }),
    ...(onMove && { onMove }),
    ...(onMoveEnd && { onMoveEnd }),
    scaleExtent: finalScaleExtent,
    ...(finalTranslateExtent && { translateExtent: finalTranslateExtent }),
    zoom,
  });

  return (
    <ZoomPanProvider
      value={{ x: position.x, y: position.y, k: position.k, transformString }}
    >
      <g ref={mapRef}>
        <rect width={width} height={height} fill="transparent" />
        <g
          ref={ref}
          transform={transformString}
          className={`rsm-zoomable-group ${className}`}
          {...restProps}
        >
          {children}
        </g>
        {/* Show pending indicator during zoom/pan transitions */}
        <ZoomPanIndicator
          isPending={isPending}
          className="rsm-zoom-pan-overlay"
        />
      </g>
    </ZoomPanProvider>
  );
}

ZoomableGroup.displayName = 'ZoomableGroup';

export default ZoomableGroup;
