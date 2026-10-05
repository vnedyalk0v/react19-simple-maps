import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Geography, type PreparedFeature } from '../src';

const geography: PreparedFeature = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'Point', coordinates: [0, 0] },
  rsmKey: 'point',
  svgPath: 'M0,0h10v10h-10Z',
};

afterEach(cleanup);

describe('Geography keyboard click events', () => {
  it.each(['Enter', ' '])(
    'preserves modifiers and the event view for %j',
    (key) => {
      const click = vi.fn();
      const view = render(
        <svg>
          <Geography geography={geography} onClick={click} />
        </svg>,
      );
      const target = view.getByRole('button');
      const options = {
        key,
        ctrlKey: true,
        shiftKey: true,
        altKey: true,
        metaKey: true,
      };
      fireEvent.keyDown(target, options);
      if (key === ' ') fireEvent.keyUp(target, options);
      expect(click).toHaveBeenCalledTimes(1);
      const event = click.mock.calls[0]![0];
      expect(event).toMatchObject({
        ctrlKey: true,
        shiftKey: true,
        altKey: true,
        metaKey: true,
        view: window,
      });
      expect(event.nativeEvent.composed).toBe(true);
    },
  );

  it('propagates a keyboard click through a shadow host', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    document.body.append(host);
    const click = vi.fn();
    host.addEventListener('click', click);
    try {
      const view = render(
        <svg>
          <Geography geography={geography} onClick={() => {}} />
        </svg>,
        { container: shadow },
      );
      fireEvent.keyDown(view.getByRole('button'), { key: 'Enter' });
      expect(click).toHaveBeenCalledTimes(1);
    } finally {
      cleanup();
      host.remove();
    }
  });
});

it.each(['Enter', ' '])(
  'creates %j clicks in the target iframe realm',
  (key) => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    try {
      const click = vi.fn();
      const ownerWindow = frame.contentDocument!.defaultView!;
      const view = render(
        <svg>
          <Geography geography={geography} onClick={click} />
        </svg>,
        { container: frame.contentDocument!.body },
      );
      const target = view.getByRole('button');
      fireEvent.keyDown(target, { key, shiftKey: true });
      if (key === ' ') fireEvent.keyUp(target, { key, shiftKey: true });
      expect(click).toHaveBeenCalledTimes(1);
      const event = click.mock.calls[0]![0];
      expect(event.view).toBe(ownerWindow);
      expect(event.shiftKey).toBe(true);
      expect(event.nativeEvent).toBeInstanceOf(ownerWindow.MouseEvent);
    } finally {
      cleanup();
      frame.remove();
    }
  },
);
