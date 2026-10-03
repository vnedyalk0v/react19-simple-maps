import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

describe('Geography keyboard activation', () => {
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
