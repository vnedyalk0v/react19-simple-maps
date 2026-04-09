import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PreparedFeature, GeographyData } from '../src/types';

const { mockUseGeographies, mockUseZoomPan } = vi.hoisted(() => ({
  mockUseGeographies: vi.fn(),
  mockUseZoomPan: vi.fn(),
}));

vi.mock('../src/components/useGeographies', () => ({
  default: mockUseGeographies,
}));

vi.mock('../src/components/useZoomPan', () => ({
  default: mockUseZoomPan,
}));

import ComposableMap from '../src/components/ComposableMap';
import Geographies from '../src/components/Geographies';
import Geography from '../src/components/Geography';
import ZoomableGroup from '../src/components/ZoomableGroup';
import GeographyErrorBoundary from '../src/components/GeographyErrorBoundary';

const preparedFeature: PreparedFeature = {
  type: 'Feature',
  properties: { name: 'Testland' },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
        [0, 0],
      ],
    ],
  },
  svgPath: 'M0,0L10,0L10,10L0,10Z',
  rsmKey: 'geo-testland',
};

const pointPreparedFeature: PreparedFeature = {
  type: 'Feature',
  properties: { name: 'Pointland' },
  geometry: {
    type: 'Point',
    coordinates: [5, 5],
  },
  svgPath: 'M0,0L10,0L10,10L0,10Z',
  rsmKey: 'geo-pointland',
};

const baseGeographyData: GeographyData = {
  geographies: [preparedFeature],
  outline: '',
  borders: '',
  isLoading: false,
  error: null,
  refetch: vi.fn(),
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('Geographies component behavior', () => {
  it('renders an SVG-safe loading fallback while geographies load', () => {
    mockUseGeographies.mockReturnValue({
      ...baseGeographyData,
      geographies: [],
      isLoading: true,
    });

    const { container } = render(
      <ComposableMap>
        <Geographies geography="https://example.com/world.json">
          {() => null}
        </Geographies>
      </ComposableMap>,
    );

    expect(screen.getByText('Loading...')).toBeTruthy();
    expect(
      container.querySelector('svg .rsm-loading-text')?.tagName.toLowerCase(),
    ).toBe('text');
    expect(container.querySelector('svg div')).toBeNull();
  });

  it('renders the provided fallback and reports geography loading errors', async () => {
    const onGeographyError = vi.fn();
    const error = new Error('Network failed');
    const refetch = vi.fn();

    mockUseGeographies.mockReturnValue({
      ...baseGeographyData,
      geographies: [],
      error,
      refetch,
    });

    render(
      <ComposableMap>
        <Geographies
          geography="https://example.com/world.json"
          onGeographyError={onGeographyError}
          fallback={(receivedError, retry) => (
            <text data-testid="geo-error-fallback" onClick={retry}>
              {receivedError.message}
            </text>
          )}
        >
          {() => null}
        </Geographies>
      </ComposableMap>,
    );

    expect(screen.getByTestId('geo-error-fallback').textContent).toBe(
      'Network failed',
    );

    fireEvent.click(screen.getByTestId('geo-error-fallback'));
    expect(refetch).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(onGeographyError).toHaveBeenCalledWith(error);
    });
  });

  it('renders child content when prepared geographies are available', () => {
    mockUseGeographies.mockReturnValue(baseGeographyData);

    render(
      <ComposableMap>
        <Geographies geography="https://example.com/world.json">
          {({ geographies }) => (
            <g data-testid="geographies-children">
              {geographies.map((geo) => (
                <path
                  key={geo.rsmKey}
                  data-testid="rendered-prepared-geo"
                  d={geo.svgPath}
                />
              ))}
            </g>
          )}
        </Geographies>
      </ComposableMap>,
    );

    expect(screen.getByTestId('geographies-children')).toBeTruthy();
    expect(screen.getAllByTestId('rendered-prepared-geo')).toHaveLength(1);
  });
});

describe('GeographyErrorBoundary behavior', () => {
  it('default fallback keeps detailed error messages out of the UI', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const Thrower = () => {
      throw new Error('https://internal.example.com/secret-topology.json');
    };

    try {
      render(
        <svg>
          <GeographyErrorBoundary>
            <Thrower />
          </GeographyErrorBoundary>
        </svg>,
      );

      expect(screen.getByText('Failed to load geography data.')).toBeTruthy();
      expect(
        screen.queryByText(/https:\/\/internal\.example\.com/i),
      ).toBeNull();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});

describe('Geography component behavior', () => {
  it('applies interaction styles and passes geography event data to handlers', () => {
    const handleMouseEnter = vi.fn();
    const handleFocus = vi.fn();
    const handleClick = vi.fn();

    const { container } = render(
      <svg>
        <Geography
          geography={pointPreparedFeature}
          style={{
            default: { fill: '#cccccc' },
            hover: { fill: '#ff0000' },
            focused: { fill: '#0000ff' },
          }}
          onMouseEnter={handleMouseEnter}
          onFocus={handleFocus}
          onClick={handleClick}
        />
      </svg>,
    );

    const geographyPath = container.querySelector('path.rsm-geography');
    expect(geographyPath).toBeTruthy();

    fireEvent.mouseEnter(geographyPath as Element);
    expect((geographyPath as SVGPathElement).style.fill).toBe('rgb(255, 0, 0)');
    expect(handleMouseEnter).toHaveBeenCalledTimes(1);
    const mouseEnterData = handleMouseEnter.mock.calls[0]?.[1];
    expect(mouseEnterData?.geography).toBe(pointPreparedFeature);
    expect(mouseEnterData?.coordinates?.[0]).toBeCloseTo(5);
    expect(mouseEnterData?.coordinates?.[1]).toBeCloseTo(5);
    expect(mouseEnterData?.centroid?.[0]).toBeCloseTo(5);
    expect(mouseEnterData?.centroid?.[1]).toBeCloseTo(5);
    expect(mouseEnterData?.bounds).toEqual([
      [5, 5],
      [5, 5],
    ]);

    fireEvent.focus(geographyPath as Element);
    expect((geographyPath as SVGPathElement).style.fill).toBe('rgb(0, 0, 255)');
    expect(handleFocus).toHaveBeenCalledTimes(1);

    fireEvent.click(geographyPath as Element);
    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick.mock.calls[0]?.[1]?.geography).toBe(
      pointPreparedFeature,
    );
  });
});

describe('ZoomableGroup component behavior', () => {
  it('does not render a zoom or pan pending indicator', () => {
    mockUseZoomPan.mockReturnValue({
      mapRef: { current: null },
      position: { x: 0, y: 0, k: 1 },
      transformString: 'translate(0 0) scale(1)',
      isPending: true,
    });

    const { container } = render(
      <ComposableMap>
        <ZoomableGroup>
          <circle data-testid="zoomable-child" cx="10" cy="10" r="4" />
        </ZoomableGroup>
      </ComposableMap>,
    );

    expect(screen.getByTestId('zoomable-child')).toBeTruthy();
    expect(container.querySelector('.rsm-zoom-pan-indicator')).toBeNull();
    expect(container.querySelector('svg div')).toBeNull();
  });
});
