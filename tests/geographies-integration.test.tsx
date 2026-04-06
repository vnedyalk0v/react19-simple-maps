import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FeatureCollection, Geometry } from 'geojson';
import ComposableMap from '../src/components/ComposableMap';
import Geographies from '../src/components/Geographies';
import Geography from '../src/components/Geography';

const featureCollection: FeatureCollection<Geometry> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Squareland' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [20, 0],
            [20, 20],
            [0, 20],
            [0, 0],
          ],
        ],
      },
    },
  ],
};

describe('Geographies integration', () => {
  it('prepares object geographies and renders SVG paths without fetching', async () => {
    const { container } = render(
      <ComposableMap>
        <Geographies geography={featureCollection}>
          {({ geographies }) => (
            <>
              {geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  data-testid="integration-geography"
                />
              ))}
            </>
          )}
        </Geographies>
      </ComposableMap>,
    );

    await waitFor(() => {
      expect(container.querySelectorAll('path.rsm-geography')).toHaveLength(1);
    });

    const renderedPath = container.querySelector('path.rsm-geography');
    expect(renderedPath?.getAttribute('d')).toBeTruthy();
  });

  it('recomputes prepared SVG paths when the projection changes', async () => {
    const { container, rerender } = render(
      <ComposableMap projection="geoEqualEarth">
        <Geographies geography={featureCollection}>
          {({ geographies }) => (
            <>
              {geographies.map((geo) => (
                <Geography key={geo.rsmKey} geography={geo} />
              ))}
            </>
          )}
        </Geographies>
      </ComposableMap>,
    );

    await waitFor(() => {
      expect(
        container.querySelector('path.rsm-geography')?.getAttribute('d'),
      ).toBeTruthy();
    });

    const equalEarthPath = container
      .querySelector('path.rsm-geography')
      ?.getAttribute('d');

    rerender(
      <ComposableMap projection="geoMercator">
        <Geographies geography={featureCollection}>
          {({ geographies }) => (
            <>
              {geographies.map((geo) => (
                <Geography key={geo.rsmKey} geography={geo} />
              ))}
            </>
          )}
        </Geographies>
      </ComposableMap>,
    );

    await waitFor(() => {
      expect(
        container.querySelector('path.rsm-geography')?.getAttribute('d'),
      ).toBeTruthy();
    });

    const mercatorPath = container
      .querySelector('path.rsm-geography')
      ?.getAttribute('d');

    expect(equalEarthPath).toBeTruthy();
    expect(mercatorPath).toBeTruthy();
    expect(mercatorPath).not.toBe(equalEarthPath);
  });
});
