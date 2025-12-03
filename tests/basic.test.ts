import { describe, it, expect } from 'vitest';
import {
  createCoordinates,
  createLongitude,
  createLatitude,
} from '../src/types';

describe('Basic functionality', () => {
  it('should create branded coordinates', () => {
    const longitude = createLongitude(-74.006);
    const latitude = createLatitude(40.7128);
    const coordinates = createCoordinates(-74.006, 40.7128);

    expect(longitude).toBe(-74.006);
    expect(latitude).toBe(40.7128);
    expect(coordinates).toEqual([-74.006, 40.7128]);
  });

  it('should export main components', async () => {
    const { ComposableMap, Geographies, Geography, Marker } =
      await import('../src/index');

    expect(ComposableMap).toBeDefined();
    expect(Geographies).toBeDefined();
    expect(Geography).toBeDefined();
    expect(Marker).toBeDefined();
  });

  it('should export utility functions', async () => {
    const { createGeographyFetchError } =
      await import('../src/utils/error-utils');

    expect(createGeographyFetchError).toBeDefined();
    expect(typeof createGeographyFetchError).toBe('function');
  });
});
