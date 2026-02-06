'use server';

import { cache } from 'react';
import { FeatureCollection } from 'geojson';
import { Topology } from 'topojson-specification';
import { fetchGeographiesCache } from '../utils/geography-fetching';
import { validateGeographyUrl } from '../utils/geography-validation';

/**
 * Server Action for secure geography data loading.
 * Delegates all URL validation, fetch security (redirect validation, size limits,
 * content-type checks, SRI) to the shared hardened pipeline.
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

// Server Action for preloading geography data
export async function preloadGeographyAction(url: string): Promise<void> {
  'use server';

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
 * Server Action for validating geography URLs.
 * Reuses the shared URL validator with HTTPS-only, private-IP blocking, etc.
 */
export async function validateGeographyUrlAction(url: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  'use server';

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
