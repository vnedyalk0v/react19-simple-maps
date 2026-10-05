import { useState, Ref, memo, useMemo, useCallback } from 'react';
import { MarkerProps } from '../types';
import { useMapContext } from './MapProvider';

type MarkerComponentProps = MarkerProps & {
  ref?: Ref<SVGGElement> | undefined;
};

function MarkerContent({
  projectedCoords,
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
}: Omit<MarkerComponentProps, 'coordinates'> & {
  projectedCoords: [number, number];
}) {
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
    const [x, y] = projectedCoords;
    return `translate(${x}, ${y})`;
  }, [projectedCoords]);

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

function Marker({ coordinates, ...props }: MarkerComponentProps) {
  const { projection } = useMapContext();
  const projectedCoords = useMemo(() => {
    const projected = projection(coordinates);
    return projected?.every(Number.isFinite) ? projected : null;
  }, [projection, coordinates]);

  return projectedCoords ? (
    <MarkerContent {...props} projectedCoords={projectedCoords} />
  ) : null;
}

Marker.displayName = 'Marker';

export default memo(Marker);
