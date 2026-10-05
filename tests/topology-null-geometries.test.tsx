import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Topology } from 'topojson-specification';
import ComposableMap from '../src/components/ComposableMap';
import Geographies from '../src/components/Geographies';
import { getFeatures } from '../src/utils';

const topology: Topology = {
  type: 'Topology',
  arcs: [],
  objects: {
    land: {
      type: 'GeometryCollection',
      geometries: [
        { type: null },
        { type: 'Point', coordinates: [10, 20], id: 'point' },
      ],
    },
  },
};

describe('TopoJSON null geometry preparation', () => {
  it('passes only non-null geometries to the typed parser', () => {
    const features = getFeatures(topology, (items) =>
      items.filter((item) => item.geometry.type === 'Point'),
    );
    expect(features).toHaveLength(1);
    expect(features[0]?.id).toBe('point');
    expect(getFeatures(topology)).toHaveLength(1);
  });

  it('renders a map with a parser that inspects each geometry', () => {
    const html = renderToString(
      <ComposableMap>
        <Geographies
          geography={topology}
          parseGeographies={(items) =>
            items.filter((item) => item.geometry.type === 'Point')
          }
        >
          {({ geographies }) =>
            geographies.map((item) => (
              <path key={item.rsmKey} d={item.svgPath} />
            ))
          }
        </Geographies>
      </ComposableMap>,
    );
    expect(html).toMatch(/<path[^>]*d="M/);
  });

  it('removes null children from nested converted GeometryCollections', () => {
    const nested: Topology = {
      ...topology,
      objects: {
        land: {
          type: 'GeometryCollection',
          geometries: [
            {
              type: 'GeometryCollection',
              geometries: [
                { type: null },
                {
                  type: 'GeometryCollection',
                  geometries: [
                    { type: null },
                    { type: 'Point', coordinates: [0, 0] },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    const features = getFeatures(nested);
    const geometry = features[0]?.geometry;
    expect(geometry?.type).toBe('GeometryCollection');
    if (geometry?.type !== 'GeometryCollection')
      throw new Error('missing collection');
    expect(geometry.geometries.map((item) => item.type)).toEqual([
      'GeometryCollection',
    ]);
    const child = geometry.geometries[0];
    if (child?.type !== 'GeometryCollection')
      throw new Error('missing nested collection');
    expect(child.geometries.map((item) => item.type)).toEqual(['Point']);
  });

  it('returns no features for a single null object', () => {
    expect(
      getFeatures({
        type: 'Topology',
        arcs: [],
        objects: { land: { type: null } },
      }),
    ).toEqual([]);
  });
});
