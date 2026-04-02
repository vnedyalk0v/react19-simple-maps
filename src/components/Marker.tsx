import { useState, Ref, memo, useMemo, useCallback } from 'react';
import { MarkerProps } from '../types';
import { useMapContext } from './MapProvider';

function Marker({
  coordinates,
  children,
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
}: MarkerProps & { ref?: Ref<SVGGElement> }) {
  const { projection } = useMapContext();
  const [isPressed, setPressed] = useState(false);
  const [isHovered, setHovered] = useState(false);
  const [isFocused, setFocused] = useState(false);

  const handleMouseEnter = useCallback(
    (evt: React.MouseEvent<SVGGElement>) => {
      setHovered(true);
      if (onMouseEnter) onMouseEnter(evt);
    },
    [onMouseEnter],
  );

  const handleMouseLeave = useCallback(
    (evt: React.MouseEvent<SVGGElement>) => {
      setHovered(false);
      if (isPressed) setPressed(false);
      if (onMouseLeave) onMouseLeave(evt);
    },
    [onMouseLeave, isPressed],
  );

  const handleFocus = useCallback(
    (evt: React.FocusEvent<SVGGElement>) => {
      setFocused(true);
      if (onFocus) onFocus(evt);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (evt: React.FocusEvent<SVGGElement>) => {
      setFocused(false);
      if (isPressed) setPressed(false);
      if (onBlur) onBlur(evt);
    },
    [onBlur, isPressed],
  );

  const handleMouseDown = useCallback(
    (evt: React.MouseEvent<SVGGElement>) => {
      setPressed(true);
      if (onMouseDown) onMouseDown(evt);
    },
    [onMouseDown],
  );

  const handleMouseUp = useCallback(
    (evt: React.MouseEvent<SVGGElement>) => {
      setPressed(false);
      if (onMouseUp) onMouseUp(evt);
    },
    [onMouseUp],
  );

  // Memoize projection calculation to prevent unnecessary recalculations
  const projectedCoords = useMemo(() => {
    return projection(coordinates);
  }, [projection, coordinates]);

  const currentState = useMemo(() => {
    if (isPressed) return 'pressed' as const;
    if (isFocused) return 'focused' as const;
    if (isHovered) return 'hover' as const;
    return 'default' as const;
  }, [isPressed, isFocused, isHovered]);

  // Memoize current style to prevent unnecessary style recalculations
  const currentStyle = useMemo(() => {
    return style?.[currentState];
  }, [style, currentState]);

  // Memoize transform string (only if coordinates exist)
  const transform = useMemo(() => {
    if (!projectedCoords) return '';
    const [x, y] = projectedCoords;
    return `translate(${x}, ${y})`;
  }, [projectedCoords]);

  if (!projectedCoords) {
    return null;
  }

  return (
    <g
      ref={ref}
      transform={transform}
      className={`rsm-marker ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      style={currentStyle}
      {...restProps}
    >
      {children}
    </g>
  );
}

Marker.displayName = 'Marker';

export default memo(Marker);
