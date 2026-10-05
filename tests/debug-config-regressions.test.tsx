import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ComposableMap, useMapContext, type ProjectionConfig } from '../src';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('debugging projection configuration', () => {
  it.each([
    Object.assign(Object.create(null), { scale: 200 }) as ProjectionConfig,
    { scale: 200, constructor: null } as ProjectionConfig,
  ])(
    'does not crash on a configuration without a constructor',
    (projectionConfig) => {
      for (const method of ['group', 'groupEnd', 'log'] as const) {
        vi.spyOn(console, method).mockImplementation(() => {});
      }
      function Probe() {
        return <text>{useMapContext().projection.scale()}</text>;
      }
      const view = render(
        <ComposableMap debug projectionConfig={projectionConfig}>
          <Probe />
        </ComposableMap>,
      );
      expect(view.getByText('200')).toBeDefined();
      expect(console.log).toHaveBeenCalledWith(
        'Props:',
        expect.objectContaining({ projectionConfig }),
      );
    },
  );
});
