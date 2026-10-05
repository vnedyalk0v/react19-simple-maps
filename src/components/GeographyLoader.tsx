'use client';

import { useActionState, useOptimistic, ReactNode, useEffect } from 'react';
import { FeatureCollection, Geometry } from 'geojson';
import { Topology } from 'topojson-specification';
import {
  loadGeographyAction,
  preloadGeographyAction,
} from './GeographyActions';

interface GeographyLoaderProps {
  url: string;
  onLoad?: (data: Topology | FeatureCollection<Geometry | null>) => void;
  onError?: (error: string) => void;
  children?: (props: {
    data: Topology | FeatureCollection<Geometry | null> | null;
    isLoading: boolean;
    error: string | null;
    reload: () => void;
  }) => ReactNode;
  fallback?: ReactNode;
  preload?: boolean;
}

interface GeographyState {
  data: Topology | FeatureCollection<Geometry | null> | null;
  error: string | null;
}

export function GeographyLoader({
  url,
  onLoad,
  onError,
  children,
  fallback,
  preload = true,
}: GeographyLoaderProps) {
  const initialState: GeographyState = {
    data: null,
    error: null,
  };

  const [state, submitAction, isPending] = useActionState(
    loadGeographyAction,
    initialState,
  );

  // Optimistic updates for immediate feedback
  const [optimisticState, setOptimisticState] = useOptimistic(
    state,
    (currentState, optimisticUpdate: Partial<GeographyState>) => ({
      ...currentState,
      ...optimisticUpdate,
    }),
  );

  // Load geography data when URL changes
  useEffect(() => {
    if (!url) return;

    // Optimistically set loading state
    setOptimisticState({ error: null });

    const formData = new FormData();
    formData.append('url', url);
    submitAction(formData);
  }, [url, submitAction, setOptimisticState]);

  // Preload geography data if requested
  useEffect(() => {
    if (preload && url) {
      preloadGeographyAction(url).catch(() => {
        // Silently handle preload errors
      });
    }
  }, [url, preload]);

  // Call callbacks when state changes
  useEffect(() => {
    if (optimisticState.data && onLoad) {
      onLoad(optimisticState.data);
    }
  }, [optimisticState.data, onLoad]);

  useEffect(() => {
    if (optimisticState.error && onError) {
      onError(optimisticState.error);
    }
  }, [optimisticState.error, onError]);

  const reload = () => {
    setOptimisticState({ error: null });

    const formData = new FormData();
    formData.append('url', url);
    submitAction(formData);
  };

  // Show fallback during initial loading
  if (isPending && !optimisticState.data && !optimisticState.error) {
    return <>{fallback || <div>Loading geography data...</div>}</>;
  }

  if (children) {
    return (
      <>
        {children({
          data: optimisticState.data,
          isLoading: isPending,
          error: optimisticState.error,
          reload,
        })}
      </>
    );
  }

  // Default rendering
  if (optimisticState.error) {
    return (
      <div role="alert" style={{ color: 'red', padding: '1rem' }}>
        <h3>Failed to load geography data</h3>
        <p>{optimisticState.error}</p>
        <button onClick={reload} type="button">
          Retry
        </button>
      </div>
    );
  }

  if (optimisticState.data) {
    return <div>Geography data loaded successfully</div>;
  }

  return <>{fallback || <div>No geography data</div>}</>;
}

export default GeographyLoader;
