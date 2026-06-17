import React, { useEffect, useCallback } from 'react';

// React 19 debugging utilities

/**
 * Safely capture owner stack - only available in React development builds.
 * This function is NOT exported in production builds, so we access it
 * conditionally via React namespace with proper type checking.
 *
 * @see https://react.dev/reference/react/captureOwnerStack
 */
function safeCaptureOwnerStack(): string | null {
  // captureOwnerStack is only available in development builds of React 19
  // It's not a stable export - must be accessed conditionally
  if (
    process.env.NODE_ENV !== 'production' &&
    typeof React === 'object' &&
    React !== null &&
    'captureOwnerStack' in React &&
    typeof (React as unknown as { captureOwnerStack?: () => string })
      .captureOwnerStack === 'function'
  ) {
    try {
      return (
        React as unknown as { captureOwnerStack: () => string }
      ).captureOwnerStack();
    } catch {
      // Silently fail if captureOwnerStack throws
      return null;
    }
  }
  return null;
}

interface DebugInfo {
  componentName: string;
  ownerStack?: string | null;
  timestamp: number;
  props?: Record<string, unknown> | undefined;
  state?: Record<string, unknown> | undefined;
  error?: Error;
}

/**
 * Debug logger for React Simple Maps components
 */
export class MapDebugger {
  private static instance: MapDebugger;
  private debugLogs: DebugInfo[] = [];
  private isEnabled: boolean = this.getDebugMode();

  /**
   * Determine if debug mode should be enabled
   * Priority: Environment variable > explicit prop > default (false)
   */
  private getDebugMode(): boolean {
    // Check environment variable first
    if (typeof process !== 'undefined') {
      const envDebug = process.env.REACT_SIMPLE_MAPS_DEBUG;
      if (envDebug === 'true' || envDebug === '1') {
        return true;
      }
      if (envDebug === 'false' || envDebug === '0') {
        return false;
      }
    }

    // Default to quiet (false) - opt-in debugging only
    return false;
  }

  /**
   * Enable or disable debugging at runtime
   */
  setDebugMode(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  static getInstance(): MapDebugger {
    if (!MapDebugger.instance) {
      MapDebugger.instance = new MapDebugger();
    }
    return MapDebugger.instance;
  }

  /**
   * Log component render with owner stack information
   */
  logRender(
    componentName: string,
    props?: Record<string, unknown>,
    state?: Record<string, unknown>,
  ): void {
    if (!this.isEnabled) return;

    const ownerStack = safeCaptureOwnerStack();

    const debugInfo: DebugInfo = {
      componentName,
      ownerStack,
      timestamp: Date.now(),
      ...(props && { props: this.sanitizeProps(props) }),
      ...(state && { state: this.sanitizeState(state) }),
    };

    this.debugLogs.push(debugInfo);

    // Keep only last 100 logs to prevent memory leaks
    if (this.debugLogs.length > 100) {
      this.debugLogs.shift();
    }

    if (this.isEnabled) {
      // eslint-disable-next-line no-console
      console.group(`🗺️ ${componentName} Render`);
      // eslint-disable-next-line no-console
      console.log('Owner Stack:', ownerStack);
      // eslint-disable-next-line no-console
      if (props) console.log('Props:', props);
      // eslint-disable-next-line no-console
      if (state) console.log('State:', state);
      // eslint-disable-next-line no-console
      console.groupEnd();
    }
  }

  /**
   * Get all debug logs
   */
  getAllLogs(): DebugInfo[] {
    return [...this.debugLogs];
  }

  /**
   * Clear all debug data
   */
  clear(): void {
    this.debugLogs.length = 0;
  }

  private sanitizeProps(
    props?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!props) return undefined;

    // Remove functions and complex objects for cleaner logging
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(props)) {
      if (typeof value === 'function') {
        sanitized[key] = '[Function]';
      } else if (
        value &&
        typeof value === 'object' &&
        value.constructor !== Object &&
        value.constructor !== Array
      ) {
        sanitized[key] = `[${value.constructor.name}]`;
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private sanitizeState(
    state?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    return this.sanitizeProps(state);
  }
}

/**
 * Hook for component debugging with opt-in support
 */
export function useMapDebugger(componentName: string, debug?: boolean) {
  const mapDebugger = MapDebugger.getInstance();

  useEffect(() => {
    if (debug !== undefined) {
      mapDebugger.setDebugMode(debug);
    }
  }, [debug, mapDebugger]);

  const logRender = useCallback(
    (props?: Record<string, unknown>, state?: Record<string, unknown>) =>
      mapDebugger.logRender(componentName, props, state),
    [componentName, mapDebugger],
  );

  return { logRender };
}

/**
 * Development-only debugging utilities
 */
export const devTools = {
  /**
   * Debug geography loading
   */
  debugGeographyLoading: (
    url: string,
    status: 'start' | 'success' | 'error',
    data?: unknown,
  ) => {
    if (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV !== 'production'
    ) {
      try {
        const ownerStack = safeCaptureOwnerStack();
        // eslint-disable-next-line no-console
        console.group(`🌍 Geography Loading: ${url}`);
        // eslint-disable-next-line no-console
        console.log('Status:', status);
        // eslint-disable-next-line no-console
        console.log('Owner Stack:', ownerStack);
        // eslint-disable-next-line no-console
        if (data) console.log('Data:', data);
        // eslint-disable-next-line no-console
        console.groupEnd();
      } catch {
        // eslint-disable-next-line no-console
        console.log(`🌍 Geography Loading: ${url} - Status: ${status}`);
        // eslint-disable-next-line no-console
        if (data) console.log('Data:', data);
      }
    }
  },
};
