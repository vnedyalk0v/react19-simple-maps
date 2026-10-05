import { StrictMode, createRef, act, useState } from 'react';
import { cleanup, render, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  geoConicEqualArea,
  geoMercator,
  type GeoProjection,
  type GeoConicProjection,
} from 'd3-geo';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import ComposableMap from '../src/components/ComposableMap';
import Geographies from '../src/components/Geographies';
import ZoomableGroup from '../src/components/ZoomableGroup';
import { useMapContext } from '../src/components/MapProvider';
import {
  createCoordinates,
  createParallels,
  createRotationAngles,
  type ProjectionConfig,
} from '../src/types';

const data: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'a',
      properties: {},
      geometry: { type: 'Point', coordinates: [0, 0] },
    },
    {
      type: 'Feature',
      id: 'b',
      properties: {},
      geometry: { type: 'Point', coordinates: [20, 10] },
    },
  ],
};
const selectA = (features: Feature<Geometry>[]) =>
  features.filter((feature) => feature.id === 'a');
const selectB = (features: Feature<Geometry>[]) =>
  features.filter((feature) => feature.id === 'b');
afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  // Let D3 remove its one-tick post-drag click suppression before the next test.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
});

function GeographyList({
  parser,
  label,
}: {
  parser: typeof selectA;
  label: string;
}) {
  return (
    <Geographies geography={data} parseGeographies={parser}>
      {({ geographies }) => (
        <g data-testid={label}>
          {geographies.map((feature) => (
            <path
              key={feature.id}
              data-id={feature.id}
              d={('svgPath' in feature ? feature.svgPath : '') as string}
            />
          ))}
        </g>
      )}
    </Geographies>
  );
}

describe('parser-aware prepared geographies', () => {
  it('updates features and paths when replacing a parser for the same data', () => {
    const view = render(
      <ComposableMap>
        <GeographyList parser={selectA} label="selected" />
      </ComposableMap>,
    );
    const pathA = view
      .getByTestId('selected')
      .querySelector('path')!
      .getAttribute('d');
    view.rerender(
      <ComposableMap>
        <GeographyList parser={selectB} label="selected" />
      </ComposableMap>,
    );
    const pathB = view.getByTestId('selected').querySelector('path')!;
    expect(pathB.getAttribute('data-id')).toBe('b');
    expect(pathB.getAttribute('d')).toBeTruthy();
    expect(pathB.getAttribute('d')).not.toBe(pathA);
  });
  it('isolates two consumers sharing data and projection with different parsers', () => {
    const view = render(
      <StrictMode>
        <ComposableMap>
          <GeographyList parser={selectA} label="a" />
          <GeographyList parser={selectB} label="b" />
        </ComposableMap>
      </StrictMode>,
    );
    expect(
      view.getByTestId('a').querySelector('path')!.getAttribute('data-id'),
    ).toBe('a');
    expect(
      view.getByTestId('b').querySelector('path')!.getAttribute('data-id'),
    ).toBe('b');
    expect(
      view.getByTestId('a').querySelector('path')!.getAttribute('d'),
    ).not.toBe(view.getByTestId('b').querySelector('path')!.getAttribute('d'));
  });
});

describe('geography processing boundary', () => {
  it.each(['parser', 'children'])(
    'catches %s errors and retries inside its own boundary',
    async (source) => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      let broken = true;
      const error = new Error(`${source} failed`);
      const onError = vi.fn();
      const parser = (features: Feature<Geometry>[]) => {
        if (source === 'parser' && broken) throw error;
        return features;
      };
      const ref = createRef<SVGGElement>();
      const view = render(
        <ComposableMap>
          <Geographies
            geography={data}
            parseGeographies={parser}
            errorBoundary
            onGeographyError={onError}
            ref={ref}
            data-testid="outer"
            className="custom"
            fallback={(received, retry) => (
              <text
                onClick={() => {
                  broken = false;
                  retry();
                }}
              >
                {received.message}
              </text>
            )}
          >
            {() => {
              if (source === 'children' && broken) throw error;
              return <text>Recovered</text>;
            }}
          </Geographies>
        </ComposableMap>,
      );
      expect(view.getByText(error.message)).toBeTruthy();
      expect(onError).toHaveBeenCalledWith(error);
      expect(ref.current).toBe(view.getByTestId('outer'));
      expect(ref.current?.classList.contains('custom')).toBe(true);
      fireEvent.click(view.getByText(error.message));
      await waitFor(() => expect(view.getByText('Recovered')).toBeTruthy());
    },
  );
});

function ProjectionProbe({
  observe,
}: {
  observe: (projection: GeoProjection) => void;
}) {
  observe(useMapContext().projection);
  return null;
}
describe('projection configuration', () => {
  it('applies parallels to conic projections', () => {
    let projection = geoConicEqualArea();
    render(
      <ComposableMap
        projection="geoConicEqualArea"
        projectionConfig={{ parallels: createParallels(20, 60) }}
      >
        <ProjectionProbe
          observe={(value) => {
            projection = value as GeoConicProjection;
          }}
        />
      </ComposableMap>,
    );
    expect(projection.parallels()[0]).toBeCloseTo(20);
    expect(projection.parallels()[1]).toBeCloseTo(60);
  });
  it('accepts parallels harmlessly on projections without that setter', () => {
    let projection = geoMercator();
    render(
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{ parallels: createParallels(20, 60) }}
      >
        <ProjectionProbe
          observe={(value) => {
            projection = value;
          }}
        />
      </ComposableMap>,
    );
    expect(projection([0, 0])).toEqual([400, 300]);
  });
});

function transform(view: ReturnType<typeof render>) {
  const outer = view.container.querySelector(
    '.rsm-zoomable-group',
  )!.parentElement!;
  return {
    outer,
    value: () => {
      const position = (
        outer as unknown as { __zoom: { x: number; y: number; k: number } }
      ).__zoom;
      expect(
        outer.querySelector('.rsm-zoomable-group')!.getAttribute('transform'),
      ).toBe(`translate(${position.x} ${position.y}) scale(${position.k})`);
      return position;
    },
  };
}
function drag(
  outer: Element,
  options: { button?: number; ctrlKey?: boolean } = {},
) {
  const view = outer.ownerDocument.defaultView!;
  const dispatch = (
    target: EventTarget,
    type: string,
    clientX: number,
    clientY: number,
  ) => {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
      ...options,
    });
    // Vitest wraps the jsdom Window; supply the view after construction.
    Object.defineProperty(event, 'view', { value: view });
    fireEvent(target, event);
  };
  dispatch(outer, 'mousedown', 100, 100);
  dispatch(view, 'mousemove', 150, 125);
  dispatch(view, 'mouseup', 150, 125);
}
function touch(
  outer: Element,
  event: string,
  points: [number, number][],
  ended: boolean | readonly number[] = false,
  changedIdentifiers?: number[],
  targets?: Element[],
) {
  const touches = points.map(([clientX, clientY], identifier) => ({
    identifier,
    clientX,
    clientY,
    pageX: clientX,
    pageY: clientY,
    target: targets?.[identifier] ?? outer,
  }));
  const touchEvent = new TouchEvent(event, {
    bubbles: true,
    cancelable: true,
    touches: (typeof ended === 'boolean'
      ? ended
        ? []
        : touches
      : touches.filter(
          ({ identifier }) => !ended.includes(identifier),
        )) as unknown as Touch[],
    changedTouches: touches.filter(
      ({ identifier }) =>
        !changedIdentifiers || changedIdentifiers.includes(identifier),
    ) as unknown as Touch[],
  });
  fireEvent(outer, touchEvent);
  return touchEvent;
}

describe('zoom and pan interaction controls', () => {
  it('leaves single-finger scrolling unconsumed without movement callbacks when pan is disabled', () => {
    const onMoveStart = vi.fn();
    const onMove = vi.fn();
    const onMoveEnd = vi.fn();
    const view = render(
      <StrictMode>
        <ComposableMap>
          <ZoomableGroup
            enablePan={false}
            onMoveStart={onMoveStart}
            onMove={onMove}
            onMoveEnd={onMoveEnd}
          />
        </ComposableMap>
      </StrictMode>,
    );
    const { outer, value } = transform(view);
    const before = { ...value() };
    touch(outer, 'touchstart', [[100, 100]]);
    expect(touch(outer, 'touchmove', [[150, 130]]).defaultPrevented).toBe(
      false,
    );
    touch(outer, 'touchend', [[150, 130]], true);
    expect(value()).toMatchObject(before);
    expect(onMoveStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(onMoveEnd).not.toHaveBeenCalled();
    view.unmount();
    touch(outer, 'touchstart', [[100, 100]]);
    expect(touch(outer, 'touchmove', [[150, 130]]).defaultPrevented).toBe(
      false,
    );
    touch(outer, 'touchend', [[150, 130]], true);
    expect(onMoveStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(onMoveEnd).not.toHaveBeenCalled();
  });

  it('rebases a pinch after single-finger scrolling and emits one movement lifecycle', () => {
    const onMoveStart = vi.fn();
    const onMove = vi.fn();
    const onMoveEnd = vi.fn();
    const view = render(
      <StrictMode>
        <ComposableMap>
          <ZoomableGroup
            enablePan={false}
            center={createCoordinates(20, 10)}
            zoom={2}
            onMoveStart={onMoveStart}
            onMove={onMove}
            onMoveEnd={onMoveEnd}
          />
        </ComposableMap>
      </StrictMode>,
    );
    const { outer, value } = transform(view);
    const before = { ...value() };
    const startEvent = touch(outer, 'touchstart', [[100, 100]]);
    expect(touch(outer, 'touchmove', [[200, 150]]).defaultPrevented).toBe(
      false,
    );
    touch(
      outer,
      'touchstart',
      [
        [200, 150],
        [300, 150],
      ],
      false,
      [1],
    );
    expect(onMoveStart).not.toHaveBeenCalled();
    expect(
      touch(
        outer,
        'touchmove',
        [
          [200, 150],
          [400, 150],
        ],
        false,
        [1],
      ).defaultPrevented,
    ).toBe(true);
    expect(onMoveStart).toHaveBeenCalledTimes(1);
    const [startPosition, receivedStartEvent] = onMoveStart.mock.calls[0]!;
    expect(startPosition.zoom).toBe(before.k);
    expect(startPosition.coordinates[0]).toBeCloseTo(20);
    expect(startPosition.coordinates[1]).toBeCloseTo(10);
    expect(receivedStartEvent).toBe(startEvent);
    const pinched = { ...value() };
    expect(pinched.k).toBeCloseTo(4);
    expect((400 - pinched.x) / pinched.k).toBeCloseTo(
      (400 - before.x) / before.k,
    );
    expect((300 - pinched.y) / pinched.k).toBeCloseTo(
      (300 - before.y) / before.k,
    );
    // Lift the second finger while the first remains on the map.
    const ended = new TouchEvent('touchend', {
      bubbles: true,
      cancelable: true,
      touches: [
        { identifier: 0, clientX: 200, clientY: 150 },
      ] as unknown as Touch[],
      changedTouches: [
        { identifier: 1, clientX: 400, clientY: 150 },
      ] as unknown as Touch[],
    });
    fireEvent(outer, ended);
    expect(touch(outer, 'touchmove', [[220, 170]]).defaultPrevented).toBe(
      false,
    );
    expect(value()).toMatchObject(pinched);
    touch(outer, 'touchend', [[220, 170]], true);
    expect(onMoveStart).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMoveEnd).toHaveBeenCalledTimes(1);
  });
  it.each(['outside-first', 'outside-second'])(
    'ignores an outside touch when scrolling with one map finger (%s)',
    (order) => {
      const onMoveStart = vi.fn();
      const onMove = vi.fn();
      const onMoveEnd = vi.fn();
      const filter = vi.fn(() => true);
      const view = render(
        <>
          <div data-testid="outside-touch" />
          <ComposableMap>
            <ZoomableGroup
              enablePan={false}
              zoom={2}
              filterZoomEvent={filter}
              onMoveStart={onMoveStart}
              onMove={onMove}
              onMoveEnd={onMoveEnd}
            />
          </ComposableMap>
        </>,
      );
      const { outer, value } = transform(view);
      const outside = view.getByTestId('outside-touch');
      const before = { ...value() };
      const outsideFirst = order === 'outside-first';
      const targets = outsideFirst ? [outside, outer] : [outer, outside];
      const mapId = outsideFirst ? 1 : 0;
      const outsideId = outsideFirst ? 0 : 1;
      const initial: [number, number][] = outsideFirst
        ? [
            [800, 100],
            [100, 100],
          ]
        : [
            [100, 100],
            [800, 100],
          ];
      let startEvent: TouchEvent;
      if (outsideFirst) {
        touch(outside, 'touchstart', [[800, 100]]);
        startEvent = touch(
          outer,
          'touchstart',
          initial,
          false,
          [mapId],
          targets,
        );
      } else {
        startEvent = touch(outer, 'touchstart', [[100, 100]]);
        touch(outside, 'touchstart', initial, false, [outsideId], targets);
      }
      const moved: [number, number][] = outsideFirst
        ? [
            [800, 100],
            [150, 130],
          ]
        : [
            [150, 130],
            [800, 100],
          ];
      expect(
        touch(outer, 'touchmove', moved, false, [mapId], targets)
          .defaultPrevented,
      ).toBe(false);
      touch(
        outer,
        outsideFirst ? 'touchend' : 'touchcancel',
        moved,
        [mapId],
        [mapId],
        targets,
      );
      touch(outside, 'touchend', moved, true, [outsideId], targets);
      expect(value()).toMatchObject(before);
      expect(onMoveStart).not.toHaveBeenCalled();
      expect(onMove).not.toHaveBeenCalled();
      expect(onMoveEnd).not.toHaveBeenCalled();
      expect(filter.mock.calls).toEqual([[startEvent]]);
    },
  );

  it('keeps a rejected second map touch from consuming scrolling or emitting callbacks', () => {
    const onMoveStart = vi.fn();
    const onMove = vi.fn();
    const onMoveEnd = vi.fn();
    const filter = vi.fn(
      (event: Event) =>
        event.type === 'touchstart' &&
        (event as TouchEvent).touches.length === 1,
    );
    const view = render(
      <ComposableMap>
        <ZoomableGroup
          enablePan={false}
          zoom={2}
          filterZoomEvent={filter}
          onMoveStart={onMoveStart}
          onMove={onMove}
          onMoveEnd={onMoveEnd}
        >
          <path data-testid="first-touch" d="M0,0 L10,10" />
          <path data-testid="second-touch" d="M20,0 L30,10" />
        </ZoomableGroup>
      </ComposableMap>,
    );
    const { value } = transform(view);
    const first = view.getByTestId('first-touch');
    const second = view.getByTestId('second-touch');
    const targets = [first, second];
    const before = { ...value() };
    const startEvent = touch(first, 'touchstart', [[100, 100]]);
    const secondStart = touch(
      second,
      'touchstart',
      [
        [100, 100],
        [200, 100],
      ],
      false,
      [1],
      targets,
    );
    expect(
      touch(
        first,
        'touchmove',
        [
          [150, 130],
          [200, 100],
        ],
        false,
        [0],
        targets,
      ).defaultPrevented,
    ).toBe(false);
    expect(
      touch(
        second,
        'touchmove',
        [
          [150, 130],
          [300, 100],
        ],
        false,
        [1],
        targets,
      ).defaultPrevented,
    ).toBe(false);
    touch(
      first,
      'touchend',
      [
        [150, 130],
        [300, 100],
      ],
      [0],
      [0],
      targets,
    );
    touch(
      second,
      'touchend',
      [
        [150, 130],
        [300, 100],
      ],
      true,
      [1],
      targets,
    );
    expect(value()).toMatchObject(before);
    expect(onMoveStart).not.toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
    expect(onMoveEnd).not.toHaveBeenCalled();
    expect(filter.mock.calls).toEqual([[startEvent], [secondStart]]);
  });

  it.each([false, true])(
    'pinches across distinct SVG children and preserves accepted touch ownership (removed target=%s)',
    (removeTarget) => {
      const onMoveStart = vi.fn();
      const onMove = vi.fn();
      const onMoveEnd = vi.fn();
      const filter = vi.fn(() => true);
      const view = render(
        <ComposableMap>
          <ZoomableGroup
            enablePan={false}
            zoom={2}
            filterZoomEvent={filter}
            onMoveStart={onMoveStart}
            onMove={onMove}
            onMoveEnd={onMoveEnd}
          >
            <path data-testid="first-touch" d="M0,0 L10,10" />
            <path data-testid="second-touch" d="M20,0 L30,10" />
          </ZoomableGroup>
        </ComposableMap>,
      );
      const { value } = transform(view);
      const first = view.getByTestId('first-touch');
      const second = view.getByTestId('second-touch');
      const targets = [first, second];
      const startEvent = touch(first, 'touchstart', [[100, 100]]);
      if (removeTarget) first.remove();
      const secondStart = touch(
        second,
        'touchstart',
        [
          [100, 100],
          [200, 100],
        ],
        false,
        [1],
        targets,
      );
      const moveEvent = touch(
        second,
        'touchmove',
        [
          [100, 100],
          [300, 100],
        ],
        false,
        [1],
        targets,
      );
      const endEvent = touch(
        second,
        'touchend',
        [
          [100, 100],
          [300, 100],
        ],
        true,
        undefined,
        targets,
      );
      expect(moveEvent.defaultPrevented).toBe(true);
      expect(value().k).toBeCloseTo(4);
      expect(onMoveStart).toHaveBeenCalledTimes(1);
      expect(onMoveStart.mock.calls[0]![0].zoom).toBe(2);
      expect(onMoveStart.mock.calls[0]![1]).toBe(startEvent);
      expect(onMove).toHaveBeenCalledTimes(1);
      expect(onMove.mock.calls[0]![1]).toBe(moveEvent);
      expect(onMoveEnd).toHaveBeenCalledTimes(1);
      expect(onMoveEnd.mock.calls[0]![1]).toBe(endEvent);
      expect(filter.mock.calls).toEqual([[startEvent], [secondStart]]);
    },
  );

  it('continues an active pinch across parent rerenders with inline callbacks', () => {
    const onMoveStart = vi.fn();
    const onMove = vi.fn();
    const onMoveEnd = vi.fn();
    function RerenderingMap() {
      const [moves, setMoves] = useState(0);
      return (
        <ComposableMap>
          <ZoomableGroup
            enablePan={false}
            zoom={2}
            onMoveStart={(position, event) => onMoveStart(position, event)}
            onMove={(position, event) => {
              onMove(position, event);
              setMoves((count) => count + 1);
            }}
            onMoveEnd={(position, event) => onMoveEnd(position, event)}
          >
            <text data-testid="move-count">{moves}</text>
          </ZoomableGroup>
        </ComposableMap>
      );
    }
    const view = render(
      <StrictMode>
        <RerenderingMap />
      </StrictMode>,
    );
    const { outer, value } = transform(view);
    const startEvent = touch(outer, 'touchstart', [[100, 100]]);
    touch(
      outer,
      'touchstart',
      [
        [100, 100],
        [200, 100],
      ],
      false,
      [1],
    );
    const firstMove = touch(
      outer,
      'touchmove',
      [
        [100, 100],
        [300, 100],
      ],
      false,
      [1],
    );
    expect(value().k).toBeCloseTo(4);
    expect(view.getByTestId('move-count').textContent).toBe('1');
    const secondMove = touch(
      outer,
      'touchmove',
      [
        [100, 100],
        [350, 100],
      ],
      false,
      [1],
    );
    expect(value().k).toBeCloseTo(5);
    expect(view.getByTestId('move-count').textContent).toBe('2');
    const endEvent = touch(
      outer,
      'touchend',
      [
        [100, 100],
        [350, 100],
      ],
      true,
    );
    expect(onMoveStart).toHaveBeenCalledTimes(1);
    expect(onMoveStart.mock.calls[0]![0].zoom).toBe(2);
    expect(onMoveStart.mock.calls[0]![1]).toBe(startEvent);
    expect(onMove).toHaveBeenCalledTimes(2);
    expect(onMove.mock.calls[0]![1]).toBe(firstMove);
    expect(onMove.mock.calls[1]![1]).toBe(secondMove);
    expect(onMoveEnd).toHaveBeenCalledTimes(1);
    expect(onMoveEnd.mock.calls[0]![1]).toBe(endEvent);
  });

  it.each([
    { enablePan: true, enableZoom: true },
    { enablePan: false, enableZoom: false },
  ])(
    'clears touch ownership when leaving pan-disabled zoom ($enablePan/$enableZoom)',
    (controls) => {
      const onMoveStart = vi.fn();
      const onMove = vi.fn();
      const onMoveEnd = vi.fn();
      const map = (enablePan: boolean, enableZoom: boolean) => (
        <>
          <div data-testid="outside-touch" />
          <ComposableMap>
            <ZoomableGroup
              enablePan={enablePan}
              enableZoom={enableZoom}
              zoom={2}
              onMoveStart={onMoveStart}
              onMove={onMove}
              onMoveEnd={onMoveEnd}
            />
          </ComposableMap>
        </>
      );
      const view = render(map(false, true));
      const { outer, value } = transform(view);
      touch(outer, 'touchstart', [[100, 100]]);
      view.rerender(map(controls.enablePan, controls.enableZoom));
      touch(outer, 'touchend', [[100, 100]], true);
      view.rerender(map(false, true));
      const before = { ...value() };
      const outside = view.getByTestId('outside-touch');
      const targets = [outside, outer];
      // The identifier formerly owned by the map is now used by an outside touch.
      touch(outside, 'touchstart', [[800, 100]]);
      touch(
        outer,
        'touchstart',
        [
          [800, 100],
          [100, 100],
        ],
        false,
        [1],
        targets,
      );
      expect(
        touch(
          outer,
          'touchmove',
          [
            [800, 100],
            [150, 130],
          ],
          false,
          [1],
          targets,
        ).defaultPrevented,
      ).toBe(false);
      touch(
        outer,
        'touchend',
        [
          [800, 100],
          [150, 130],
        ],
        [1],
        [1],
        targets,
      );
      touch(outside, 'touchend', [[800, 100]], true);
      expect(value()).toMatchObject(before);
      expect(onMoveStart).not.toHaveBeenCalled();
      expect(onMove).not.toHaveBeenCalled();
      expect(onMoveEnd).not.toHaveBeenCalled();
    },
  );

  it('permits panning but keeps wheel and pinch scale fixed when zoom is disabled', () => {
    const view = render(
      <ComposableMap>
        <ZoomableGroup enableZoom={false} zoom={2} />
      </ComposableMap>,
    );
    const { outer, value } = transform(view);
    const before = { ...value() };
    fireEvent.wheel(outer, { deltaY: -100, clientX: 100, clientY: 100 });
    expect(value()).toMatchObject(before);
    drag(outer);
    expect(value().x).toBeCloseTo(before.x + 50);
    expect(value().k).toBe(2);
    touch(outer, 'touchstart', [
      [100, 100],
      [200, 100],
    ]);
    touch(outer, 'touchmove', [
      [100, 100],
      [300, 100],
    ]);
    expect(value().k).toBe(2);
    touch(
      outer,
      'touchend',
      [
        [100, 100],
        [300, 100],
      ],
      true,
    );
    view.rerender(
      <ComposableMap>
        <ZoomableGroup enableZoom={false} zoom={3} />
      </ComposableMap>,
    );
    expect(value().k).toBe(3);
    touch(outer, 'touchstart', [
      [100, 100],
      [200, 100],
    ]);
    touch(outer, 'touchmove', [
      [100, 100],
      [350, 100],
    ]);
    expect(value().k).toBe(3);
    touch(
      outer,
      'touchend',
      [
        [100, 100],
        [350, 100],
      ],
      true,
    );
  });

  it('zooms around the viewport center while rejecting drag and single-touch pan', () => {
    const view = render(
      <ComposableMap>
        <ZoomableGroup
          enablePan={false}
          center={createCoordinates(20, 10)}
          zoom={2}
        />
      </ComposableMap>,
    );
    const { outer, value } = transform(view);
    const before = { ...value() };
    drag(outer);
    expect(value()).toMatchObject(before);
    touch(outer, 'touchstart', [[100, 100]]);
    touch(outer, 'touchmove', [[150, 130]]);
    touch(outer, 'touchend', [[150, 130]], true);
    expect(value()).toMatchObject(before);
    fireEvent.wheel(outer, { deltaY: -100, clientX: 100, clientY: 100 });
    const zoomed = { ...value() };
    expect(zoomed.k).toBeGreaterThan(before.k);
    expect((400 - zoomed.x) / zoomed.k).toBeCloseTo(
      (400 - before.x) / before.k,
    );
    expect((300 - zoomed.y) / zoomed.k).toBeCloseTo(
      (300 - before.y) / before.k,
    );
    touch(outer, 'touchstart', [
      [100, 100],
      [200, 100],
    ]);
    touch(outer, 'touchmove', [
      [200, 150],
      [400, 150],
    ]);
    const pinched = { ...value() };
    expect(pinched.k).toBeGreaterThan(zoomed.k);
    expect((400 - pinched.x) / pinched.k).toBeCloseTo(
      (400 - before.x) / before.k,
    );
    expect((300 - pinched.y) / pinched.k).toBeCloseTo(
      (300 - before.y) / before.k,
    );
    touch(
      outer,
      'touchend',
      [
        [200, 150],
        [400, 150],
      ],
      true,
    );
  });

  it.each([true, false])(
    'recognizes double-tap zoom when enablePan=%s while preserving the center',
    async (enablePan) => {
      const onMoveStart = vi.fn();
      const onMove = vi.fn();
      const onMoveEnd = vi.fn();
      const view = render(
        <ComposableMap>
          <ZoomableGroup
            enablePan={enablePan}
            onMoveStart={onMoveStart}
            onMove={onMove}
            onMoveEnd={onMoveEnd}
            center={createCoordinates(20, 10)}
            zoom={2}
          />
        </ComposableMap>,
      );
      const { outer, value } = transform(view);
      const before = { ...value() };
      touch(outer, 'touchstart', [[100, 100]]);
      touch(outer, 'touchend', [[100, 100]], true);
      touch(outer, 'touchstart', [[100, 100]]);
      touch(outer, 'touchend', [[100, 100]], true);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
      });
      const zoomed = { ...value() };
      expect(zoomed.k).toBeCloseTo(4);
      if (!enablePan) {
        expect(onMoveStart).toHaveBeenCalledTimes(1);
        expect(onMove).toHaveBeenCalled();
        expect(onMoveEnd).toHaveBeenCalledTimes(1);
        expect((400 - zoomed.x) / zoomed.k).toBeCloseTo(
          (400 - before.x) / before.k,
        );
        expect((300 - zoomed.y) / zoomed.k).toBeCloseTo(
          (300 - before.y) / before.k,
        );
      }
    },
  );

  it('blocks double-tap zoom while retaining single-touch pan when zoom is disabled', async () => {
    const view = render(
      <ComposableMap>
        <ZoomableGroup enableZoom={false} />
      </ComposableMap>,
    );
    const { outer, value } = transform(view);
    touch(outer, 'touchstart', [[100, 100]]);
    touch(outer, 'touchend', [[100, 100]], true);
    touch(outer, 'touchstart', [[100, 100]]);
    touch(outer, 'touchend', [[100, 100]], true);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(value().k).toBe(1);
    touch(outer, 'touchstart', [[100, 100]]);
    touch(outer, 'touchmove', [[150, 125]]);
    expect(value().x).toBe(50);
    expect(value().y).toBe(25);
    touch(outer, 'touchend', [[150, 125]], true);
  });

  it('blocks both controls even with a permissive custom filter, while allowing programmatic position', () => {
    const filter = () => true;
    const view = render(
      <ComposableMap>
        <ZoomableGroup
          enablePan={false}
          enableZoom={false}
          filterZoomEvent={filter}
        />
      </ComposableMap>,
    );
    const { outer, value } = transform(view);
    const before = { ...value() };
    drag(outer);
    fireEvent.wheel(outer, { deltaY: -100 });
    touch(outer, 'touchstart', [
      [100, 100],
      [200, 100],
    ]);
    touch(outer, 'touchmove', [
      [100, 100],
      [300, 100],
    ]);
    touch(
      outer,
      'touchend',
      [
        [100, 100],
        [300, 100],
      ],
      true,
    );
    expect(value()).toMatchObject(before);
    view.rerender(
      <ComposableMap>
        <ZoomableGroup
          enablePan={false}
          enableZoom={false}
          center={createCoordinates(20, 10)}
          zoom={3}
          filterZoomEvent={filter}
        />
      </ComposableMap>,
    );
    expect(value().k).toBe(3);
    expect(value().x).not.toBe(before.x);
  });

  it('freezes the current interactive zoom when zoom is subsequently disabled', () => {
    const view = render(
      <ComposableMap>
        <ZoomableGroup />
      </ComposableMap>,
    );
    const { outer, value } = transform(view);
    fireEvent.wheel(outer, { deltaY: -500 });
    const interactive = { ...value() };
    expect(interactive.k).toBeGreaterThan(1);
    view.rerender(
      <ComposableMap>
        <ZoomableGroup enableZoom={false} />
      </ComposableMap>,
    );
    touch(outer, 'touchstart', [
      [100, 100],
      [200, 100],
    ]);
    touch(outer, 'touchmove', [
      [100, 100],
      [300, 100],
    ]);
    expect(value().k).toBe(interactive.k);
    touch(
      outer,
      'touchend',
      [
        [100, 100],
        [300, 100],
      ],
      true,
    );
    drag(outer);
    expect(value().k).toBe(interactive.k);
  });

  it('rejects right-button and Ctrl drags but permits Ctrl-wheel and normal drag', () => {
    const view = render(
      <ComposableMap>
        <ZoomableGroup />
      </ComposableMap>,
    );
    const { outer, value } = transform(view);
    const before = { ...value() };
    drag(outer, { button: 2 });
    expect(value()).toMatchObject(before);
    drag(outer, { ctrlKey: true });
    expect(value()).toMatchObject(before);
    drag(outer);
    expect(value().x).toBeCloseTo(before.x + 50);
    fireEvent.wheel(outer, { ctrlKey: true, deltaY: -20 });
    expect(value().k).toBeGreaterThan(1);
  });

  it('passes the actual DOM event to custom filters', () => {
    const filter = vi.fn((event: Event) => event.type === 'mousedown');
    const view = render(
      <ComposableMap>
        <ZoomableGroup filterZoomEvent={filter} />
      </ComposableMap>,
    );
    const { outer, value } = transform(view);
    fireEvent.wheel(outer, { deltaY: -100 });
    expect(value().k).toBe(1);
    expect(filter.mock.calls[0][0]).toBeInstanceOf(WheelEvent);
    drag(outer, { button: 2 });
    expect(value().x).toBe(50);
  });
});

describe('requested position synchronization', () => {
  it.each(['scale', 'rotate', 'center', 'parallels', 'width', 'height'])(
    'preserves interactive pan for equivalent inline config and reapplies positioning on %s changes',
    (changed) => {
      const center = createCoordinates(20, 10);
      let currentProjection: GeoProjection = geoConicEqualArea();
      const renderMap = (modify = false) => {
        const config: ProjectionConfig = {
          scale: modify && changed === 'scale' ? 180 : 147,
          center: createCoordinates(modify && changed === 'center' ? 10 : 0, 0),
          rotate: createRotationAngles(
            modify && changed === 'rotate' ? 20 : 0,
            0,
            0,
          ),
          parallels: createParallels(
            modify && changed === 'parallels' ? 30 : 20,
            60,
          ),
        };
        return (
          <ComposableMap
            projection="geoConicEqualArea"
            width={modify && changed === 'width' ? 1000 : 800}
            height={modify && changed === 'height' ? 700 : 600}
            projectionConfig={config}
          >
            <ProjectionProbe
              observe={(projection) => {
                currentProjection = projection;
              }}
            />
            <ZoomableGroup center={center} zoom={2} />
          </ComposableMap>
        );
      };
      const view = render(renderMap());
      const { outer, value } = transform(view);
      const originalProjection = currentProjection;
      drag(outer);
      const panned = { ...value() };
      view.rerender(renderMap());
      expect(currentProjection).toBe(originalProjection);
      expect(value()).toMatchObject(panned);
      view.rerender(renderMap(true));
      expect(currentProjection).not.toBe(originalProjection);
      const projected = currentProjection(center)!;
      expect(value().x + projected[0] * 2).toBeCloseTo(
        changed === 'width' ? 500 : 400,
      );
      expect(value().y + projected[1] * 2).toBeCloseTo(
        changed === 'height' ? 350 : 300,
      );
      if (changed === 'scale') expect(currentProjection.scale()).toBe(180);
      if (changed === 'center')
        expect(currentProjection.center()[0]).toBeCloseTo(10);
      if (changed === 'rotate')
        expect(currentProjection.rotate()[0]).toBeCloseTo(20);
      if (changed === 'parallels')
        expect(
          (currentProjection as GeoConicProjection).parallels()[0],
        ).toBeCloseTo(30);
    },
  );

  it('validates malformed config on rerender even when its extracted scalars match absent config', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const view = render(
      <ComposableMap>
        <ZoomableGroup />
      </ComposableMap>,
    );
    expect(() =>
      view.rerender(
        <ComposableMap
          projectionConfig={{ center: [] } as unknown as ProjectionConfig}
        >
          <ZoomableGroup />
        </ComposableMap>,
      ),
    ).toThrow(/Coordinates must be an array of exactly 2 numbers/);
  });

  it('reapplies the center on resize and projection changes, while preserving pan on ordinary rerenders', () => {
    const center = createCoordinates(20, 10);
    const projectionA = geoMercator().translate([400, 300]);
    const projectionB = geoMercator().scale(200).translate([500, 300]);
    const view = render(
      <ComposableMap width={800} projection={projectionA}>
        <ZoomableGroup center={center} zoom={2} />
      </ComposableMap>,
    );
    const { outer, value } = transform(view);
    const requestedA = projectionA(center)!;
    expect(value().x + requestedA[0] * 2).toBeCloseTo(400);
    drag(outer);
    const panned = { ...value() };
    view.rerender(
      <ComposableMap width={800} projection={projectionA}>
        <ZoomableGroup
          center={createCoordinates(20, 10)}
          zoom={2}
          className="updated"
        />
      </ComposableMap>,
    );
    expect(value()).toMatchObject(panned);
    view.rerender(
      <ComposableMap width={1000} projection={projectionA}>
        <ZoomableGroup center={center} zoom={2} />
      </ComposableMap>,
    );
    expect(value().x + requestedA[0] * 2).toBeCloseTo(500);
    view.rerender(
      <ComposableMap width={1000} projection={projectionB}>
        <ZoomableGroup center={center} zoom={2} />
      </ComposableMap>,
    );
    const requestedB = projectionB(center)!;
    expect(value().x + requestedB[0] * 2).toBeCloseTo(500);
    expect(value().y + requestedB[1] * 2).toBeCloseTo(300);
  });
});
