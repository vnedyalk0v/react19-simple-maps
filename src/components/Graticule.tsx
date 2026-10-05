import { memo, Ref } from 'react';
import { geoGraticule } from 'd3-geo';
import { GraticuleProps, createGraticuleStep } from '../types';
import { useMapContext } from './MapProvider';

function Graticule({
  fill = 'transparent',
  stroke = 'currentcolor',
  step = createGraticuleStep(10, 10),
  className = '',
  ref,
  ...restProps
}: GraticuleProps & { ref?: Ref<SVGPathElement> | undefined }) {
  const { path } = useMapContext();
  const graticule = geoGraticule().step(step)();

  return (
    <path
      ref={ref}
      d={path(graticule) || ''}
      fill={fill}
      stroke={stroke}
      className={`rsm-graticule ${className}`}
      {...restProps}
    />
  );
}

Graticule.displayName = 'Graticule';

export default memo(Graticule);
