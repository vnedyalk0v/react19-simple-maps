interface ZoomPanIndicatorProps {
  isPending: boolean;
  className?: string;
}

// SVG-safe zoom/pan loading indicator for use inside <svg> / <g> trees
export function ZoomPanIndicator({
  isPending,
  className = '',
}: ZoomPanIndicatorProps) {
  if (!isPending) return null;

  return (
    <g
      className={`rsm-zoom-pan-indicator ${className}`}
      role="status"
      aria-busy="true"
    >
      <title>Updating map view</title>
      <g className="rsm-zoom-pan-spinner" transform="translate(10 10)">
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="#007acc"
          strokeWidth="2"
          opacity="0.3"
        />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="#007acc"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="12.566"
          strokeDashoffset="12.566"
        >
          <animate
            attributeName="stroke-dashoffset"
            dur="0.8s"
            values="12.566;0"
            repeatCount="indefinite"
          />
        </circle>
      </g>
    </g>
  );
}

export default ZoomPanIndicator;
