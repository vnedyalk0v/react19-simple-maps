import { Ref } from 'react';
import { Coordinates, LineProps, Longitude, Latitude } from '../types';
import { useMapContext } from './MapProvider';

// Accepts LineProps (both endpoints) or a coordinate list without endpoints.
type LineComponentProps =
  | LineProps
  | (Omit<LineProps, 'from' | 'to' | 'coordinates'> & {
      coordinates: Coordinates[];
      from?: Coordinates;
      to?: Coordinates;
    });

function Line({
  from = [0 as Longitude, 0 as Latitude],
  to = [0 as Longitude, 0 as Latitude],
  coordinates,
  stroke = 'currentcolor',
  strokeWidth = 3,
  fill = 'transparent',
  className = '',
  ref,
  ...restProps
}: LineComponentProps & { ref?: Ref<SVGPathElement> }) {
  const { path } = useMapContext();

  const lineData = {
    type: 'LineString' as const,
    coordinates: coordinates || [from, to],
  };

  return (
    <path
      ref={ref}
      d={path(lineData) || ''}
      className={`rsm-line ${className}`}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill={fill}
      {...restProps}
    />
  );
}

Line.displayName = 'Line';

export default Line;
