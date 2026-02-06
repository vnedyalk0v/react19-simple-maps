'use server';

import { cache } from 'react';
import { FeatureCollection } from 'geojson';
import { Topology } from 'topojson-specification';
import { fetchGeographiesCache } from '../utils/geography-fetching';
import { validateGeographyUrl } from '../utils/geography-validation';

/**
 * Load geography data from a submitted URL and return the parsed Topology or FeatureCollection.
 *
 * Validates that the FormData contains a `url` field, attempts to fetch and parse the geography data,
 * and returns either the parsed data or a standardized error message.
 *
 * @param formData - FormData containing a `url` field with the geography URL to load
 * @returns An object with `data` set to the parsed `Topology` or `FeatureCollection` on success, and `error` set to an error message on failure; one of `data` or `error` will be `null`
 */
export async function loadGeographyAction(
  _previousState: {
    data: Topology | FeatureCollection | null;
    error: string | null;
  },
  formData: FormData,
): Promise<{
  data: Topology | FeatureCollection | null;
  error: string | null;
}> {
  const url = formData.get('url') as string;

  if (!url) {
    return {
      data: null,
      error: 'URL is required',
    };
  }

  try {
    const data = await fetchGeographiesCache(url);
    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Cached server action for better performance
export const loadGeographyCached = cache(loadGeographyAction);

/**
 * Preloads geography data for the given URL to warm the server-side cache.
 *
 * @param url - The geography URL to preload into cache; ignored if falsy or not a string.
 *
 * Notes:
 * - Errors during preload are swallowed; in non-production environments a warning is logged to the console.
 */
export async function preloadGeographyAction(url: string): Promise<void> {
  if (!url || typeof url !== 'string') {
    return;
  }

  try {
    // Trigger the cached load to warm the cache
    const formData = new FormData();
    formData.append('url', url);
    await loadGeographyCached({ data: null, error: null }, formData);
  } catch (error) {
    // Silently fail for preloading in development only
    if (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV !== 'production'
    ) {
      // eslint-disable-next-line no-console
      console.warn('Failed to preload geography:', error);
    }
  }
}

/**
 * Validates a geography URL for use with the geography loader.
 *
 * @param url - The URL to validate
 * @returns An object with `valid: true` when the URL passes validation; otherwise `valid: false` and `error` containing a human-readable message
 */
export async function validateGeographyUrlAction(url: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  try {
    validateGeographyUrl(url);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid URL',
    };
  }
}