import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { FeatureCollection, Geometry } from 'geojson';
import { geoPath } from 'd3-geo';
import ComposableMap from '../src/components/ComposableMap';
import Geographies from '../src/components/Geographies';
import Geography from '../src/components/Geography';
import { prepareFeatures } from '../src/utils/geography-processing';

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
                  data-rsm-key={geo.rsmKey}
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
    expect(renderedPath?.getAttribute('data-rsm-key')).toBe('geo-0');
  });

  it('assigns stable prepared feature keys from rsmKey, id, then index', () => {
    const keyedFeatures = [
      {
        ...featureCollection.features[0],
        id: 'ignored-id',
        rsmKey: 'existing-key',
      },
      {
        ...featureCollection.features[0],
        id: 'feature-id',
      },
      featureCollection.features[0],
    ];

    const prepared = prepareFeatures(keyedFeatures, geoPath());

    expect(prepared.map((geo) => geo.rsmKey)).toEqual([
      'existing-key',
      'feature-id',
      'geo-2',
    ]);
  });

  it('disambiguates fallback keys from existing feature keys', () => {
    const keyedFeatures = [
      {
        ...featureCollection.features[0],
        rsmKey: 'geo-1',
      },
      featureCollection.features[0],
      {
        ...featureCollection.features[0],
        id: 'geo-2',
      },
      featureCollection.features[0],
    ];

    const prepared = prepareFeatures(keyedFeatures, geoPath());
    const rsmKeys = prepared.map((geo) => geo.rsmKey);

    expect(rsmKeys).toEqual(['geo-1', 'geo-1-1', 'geo-2', 'geo-3']);
    expect(new Set(rsmKeys).size).toBe(rsmKeys.length);
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
      const nextPath = container
        .querySelector('path.rsm-geography')
        ?.getAttribute('d');

      expect(nextPath).toBeTruthy();
      expect(nextPath).not.toBe(equalEarthPath);
    });

    expect(equalEarthPath).toBeTruthy();
  });
});
