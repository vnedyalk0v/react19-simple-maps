import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Geography from '../src/components/Geography';
import type { PreparedFeature } from '../src/types';

const feature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'Point', coordinates: [0, 0] },
  rsmKey: 'geo-0',
  svgPath: 'M0,0L10,0L10,10Z',
} as PreparedFeature;

function renderClickable(props: Partial<Parameters<typeof Geography>[0]>) {
  const onClick = vi.fn();
  const view = render(
    <svg>
      <Geography geography={feature} onClick={onClick} {...props} />
    </svg>,
  );
  return { onClick, path: view.container.querySelector('path')! };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.history.replaceState(null, '', window.location.pathname);
});

describe('Geography keyboard activation', () => {
  it.each(['Enter', ' '])(
    'lets onClick prevent hyperlink navigation activated with %s',
    (key) => {
      vi.useFakeTimers();
      const onClick = vi.fn((event: React.MouseEvent<SVGPathElement>) => {
        event.preventDefault();
      });
      const { container } = render(
        <a href="#unwanted">
          <svg>
            <Geography geography={feature} onClick={onClick} />
          </svg>
        </a>,
      );
      const path = container.querySelector('path')!;

      fireEvent.click(path);
      act(() => vi.runOnlyPendingTimers());
      expect(window.location.hash).toBe('');

      fireEvent.keyDown(path, { key });
      fireEvent.keyUp(path, { key });
      act(() => vi.runOnlyPendingTimers());
      expect(onClick).toHaveBeenCalledTimes(2);
      expect(window.location.hash).toBe('');
    },
  );

  it('activates Space once on key release, like a native button', () => {
    const { onClick, path } = renderClickable({
      style: { pressed: { fill: 'red' } },
    });

    const keyDown = fireEvent.keyDown(path, { key: ' ' });
    expect(keyDown).toBe(false); // default prevented, so the page does not scroll
    fireEvent.keyDown(path, { key: ' ', repeat: true });
    expect(onClick).not.toHaveBeenCalled();
    expect(path.style.fill).toBe('red');

    fireEvent.keyUp(path, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(path.style.fill).toBe('');
  });

  it('activates Enter on key press', () => {
    const { onClick, path } = renderClickable({});
    fireEvent.keyDown(path, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.keyUp(path, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not activate on a Space release that did not start on the element', () => {
    const { onClick, path } = renderClickable({});
    fireEvent.keyUp(path, { key: ' ' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('cancels a pending Space activation on blur', () => {
    const { onClick, path } = renderClickable({});
    fireEvent.keyDown(path, { key: ' ' });
    fireEvent.blur(path);
    fireEvent.keyUp(path, { key: ' ' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('lets a user onKeyUp cancel Space activation', () => {
    const onKeyUp = vi.fn((event: { preventDefault: () => void }) =>
      event.preventDefault(),
    );
    const { onClick, path } = renderClickable({ onKeyUp });
    fireEvent.keyDown(path, { key: ' ' });
    fireEvent.keyUp(path, { key: ' ' });
    expect(onKeyUp).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('leaves Space alone when there is no onClick', () => {
    const view = render(
      <svg>
        <Geography geography={feature} />
      </svg>,
    );
    const path = view.container.querySelector('path')!;
    expect(fireEvent.keyDown(path, { key: ' ' })).toBe(true);
  });
});
