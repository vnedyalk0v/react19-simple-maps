import { useState, memo, Ref, useMemo, useCallback } from 'react';
import { GeographyProps, PreparedFeature, GeographyEventData } from '../types';
import {
  getGeographyCentroid,
  getGeographyBounds,
  getBestGeographyCoordinates,
} from '../utils/geography-utils';

function Geography({
  geography,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onMouseDown,
  onMouseUp,
  onFocus,
  onBlur,
  style = {},
  className = '',
  ref,
  ...restProps
}: GeographyProps & { ref?: Ref<SVGPathElement> }) {
  const [isPressed, setPressed] = useState(false);
  const [isHovered, setHovered] = useState(false);
  const [isFocused, setFocused] = useState(false);

  // Memoize geographic data calculation for performance
  const geographyEventData = useMemo((): GeographyEventData => {
    return {
      geography,
      centroid: getGeographyCentroid(geography),
      bounds: getGeographyBounds(geography),
      coordinates: getBestGeographyCoordinates(geography),
    };
  }, [geography]);

  // Enhanced event handlers with geographic data
  const handleClick = useCallback(
    (evt: React.MouseEvent<SVGPathElement>) => {
      if (onClick) onClick(evt, geographyEventData);
    },
    [onClick, geographyEventData],
  );

  const handleMouseEnter = useCallback(
    (evt: React.MouseEvent<SVGPathElement>) => {
      setHovered(true);
      if (onMouseEnter) onMouseEnter(evt, geographyEventData);
    },
    [onMouseEnter, geographyEventData],
  );

  const handleMouseLeave = useCallback(
    (evt: React.MouseEvent<SVGPathElement>) => {
      setHovered(false);
      if (isPressed) setPressed(false);
      if (onMouseLeave) onMouseLeave(evt, geographyEventData);
    },
    [onMouseLeave, geographyEventData, isPressed],
  );

  const handleFocus = useCallback(
    (evt: React.FocusEvent<SVGPathElement>) => {
      setFocused(true);
      if (onFocus) onFocus(evt, geographyEventData);
    },
    [onFocus, geographyEventData],
  );

  const handleBlur = useCallback(
    (evt: React.FocusEvent<SVGPathElement>) => {
      setFocused(false);
      if (isPressed) setPressed(false);
      if (onBlur) onBlur(evt, geographyEventData);
    },
    [onBlur, geographyEventData, isPressed],
  );

  const handleMouseDown = useCallback(
    (evt: React.MouseEvent<SVGPathElement>) => {
      setPressed(true);
      if (onMouseDown) onMouseDown(evt, geographyEventData);
    },
    [onMouseDown, geographyEventData],
  );

  const handleMouseUp = useCallback(
    (evt: React.MouseEvent<SVGPathElement>) => {
      setPressed(false);
      if (onMouseUp) onMouseUp(evt, geographyEventData);
    },
    [onMouseUp, geographyEventData],
  );

  const currentState = useMemo(() => {
    if (isPressed) return 'pressed' as const;
    if (isFocused) return 'focused' as const;
    if (isHovered) return 'hover' as const;
    return 'default' as const;
  }, [isPressed, isFocused, isHovered]);

  // Memoize the SVG path to prevent unnecessary recalculations
  const svgPath = useMemo(() => {
    return (geography as PreparedFeature).svgPath;
  }, [geography]);

  // Memoize the current style to prevent unnecessary style recalculations
  const currentStyle = useMemo(() => {
    return style[currentState];
  }, [style, currentState]);

  return (
    <path
      ref={ref}
      tabIndex={0}
      className={`rsm-geography ${className}`}
      d={svgPath}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={currentStyle}
      {...restProps}
    />
  );
}

Geography.displayName = 'Geography';

export default memo(Geography);
