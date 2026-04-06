import React, { useState, useEffect } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ComposableMap from '../src/components/ComposableMap';
import { useMapContext } from '../src/components/MapProvider';

function ProjectionObserver({
  onProjectionChange,
}: {
  onProjectionChange: (projection: object) => void;
}) {
  const { projection } = useMapContext();

  useEffect(() => {
    onProjectionChange(projection);
  }, [projection, onProjectionChange]);

  return null;
}

function Harness({
  onProjectionChange,
}: {
  onProjectionChange: (projection: object) => void;
}) {
  const [count, setCount] = useState(0);

  return (
    <>
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        rerender {count}
      </button>
      <ComposableMap>
        <ProjectionObserver onProjectionChange={onProjectionChange} />
      </ComposableMap>
    </>
  );
}

describe('MapProvider stability', () => {
  it('keeps the same projection instance across unrelated parent rerenders', () => {
    const onProjectionChange = vi.fn();

    const { getByRole } = render(
      <Harness onProjectionChange={onProjectionChange} />,
    );

    expect(onProjectionChange).toHaveBeenCalledTimes(1);

    fireEvent.click(getByRole('button', { name: /rerender/i }));

    expect(onProjectionChange).toHaveBeenCalledTimes(1);
  });
});
