// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FeatureCollection } from 'geojson';
import ComposableMap from '../src/components/ComposableMap';
import Geographies from '../src/components/Geographies';
import Geography from '../src/components/Geography';

const square: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
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

describe('Geographies server rendering', () => {
  it.each([true, false])(
    'renders inline geography paths on the server (errorBoundary=%s)',
    (errorBoundary) => {
      const html = renderToString(
        <ComposableMap>
          <Geographies geography={square} errorBoundary={errorBoundary}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography key={geo.rsmKey} geography={geo} />
              ))
            }
          </Geographies>
        </ComposableMap>,
      );

      expect(html).toMatch(/<path[^>]*class="rsm-geography[^>]*d="M/);
    },
  );
});
