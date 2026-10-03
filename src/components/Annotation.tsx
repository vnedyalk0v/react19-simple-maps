import { Ref, SVGProps } from 'react';
import { AnnotationProps } from '../types';
import { useMapContext } from './MapProvider';

function Annotation({
  subject,
  children,
  connectorProps,
  dx = 30,
  dy = 30,
  curve = 0,
  className = '',
  ref,
  ...restProps
}: AnnotationProps & { ref?: Ref<SVGGElement> }) {
  const { projection } = useMapContext();
  const projectedCoords = projection(subject);

  if (!projectedCoords) {
    return null;
  }

  const [x, y] = projectedCoords;
  // Connector from the label origin back to the subject, in the group's local coordinates
  const connectorPath = `M0,0 Q${-dx / 2 - (dx / 2) * curve},${-dy / 2 + (dy / 2) * curve} ${-dx},${-dy}`;

  return (
    <g
      ref={ref}
      transform={`translate(${x + dx}, ${y + dy})`}
      className={`rsm-annotation ${className}`}
      {...restProps}
    >
      <path
        d={connectorPath}
        fill="transparent"
        stroke="#000"
        {...(connectorProps as SVGProps<SVGPathElement>)}
      />
      {children}
    </g>
  );
}

Annotation.displayName = 'Annotation';

export default Annotation;
