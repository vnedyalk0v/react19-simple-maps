import {
  ReactNode,
  useCallback,
  useState,
  Component,
  ErrorInfo,
  KeyboardEvent,
} from 'react';

interface GeographyErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error) => void;
  /** A caught error is cleared when this value changes (compared with Object.is). */
  resetKey?: unknown;
}

interface MinimalErrorBoundaryProps {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  resetKey: unknown;
}

function DefaultErrorFallback(_error: Error, retry: () => void) {
  return (
    <g className="rsm-error-boundary" role="alert">
      <text
        className="rsm-error-text"
        x="50%"
        y="42%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
      >
        Failed to load geography data.
      </text>
      <text
        className="rsm-error-retry"
        x="50%"
        y="58%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        role="button"
        tabIndex={0}
        style={{ cursor: 'pointer' }}
        onClick={retry}
        onKeyDown={(e: KeyboardEvent<SVGTextElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            retry();
          }
        }}
      >
        Retry
      </text>
    </g>
  );
}

// Minimal class component for error boundary - React 19 still requires class components for error boundaries
// This is the smallest possible implementation to satisfy error boundary requirements
class MinimalErrorBoundary extends Component<
  MinimalErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: MinimalErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, resetKey: props.resetKey };
  }

  static getDerivedStateFromError(
    error: unknown,
  ): Pick<ErrorBoundaryState, 'hasError' | 'error'> {
    let normalizedError: Error;
    try {
      normalizedError =
        error instanceof Error ? error : new Error(String(error));
    } catch {
      normalizedError = new Error('Unknown geography rendering error');
    }
    return { hasError: true, error: normalizedError };
  }

  // Clear a caught error when the reset key changes, without remounting
  // healthy children.
  static getDerivedStateFromProps(
    props: MinimalErrorBoundaryProps,
    state: ErrorBoundaryState,
  ): Partial<ErrorBoundaryState> | null {
    if (Object.is(props.resetKey, state.resetKey)) return null;
    return { hasError: false, error: null, resetKey: props.resetKey };
  }

  override componentDidCatch(_error: unknown, errorInfo: ErrorInfo) {
    // React 19 compliance: Use improved error reporting
    if (this.props.onError && this.state.error) {
      this.props.onError(this.state.error, errorInfo);
    }
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }

    return this.props.children;
  }
}

// React 19-compliant function component wrapper with minimal class component usage
export function GeographyErrorBoundary({
  children,
  fallback = DefaultErrorFallback,
  onError,
  resetKey,
}: GeographyErrorBoundaryProps) {
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);

  const handleError = useCallback(
    (error: Error, errorInfo: ErrorInfo) => {
      if (onError) {
        onError(error);
      }
      // React 19 compliance: Enhanced error logging for development
      if (
        typeof process !== 'undefined' &&
        process.env.NODE_ENV !== 'production'
      ) {
        // eslint-disable-next-line no-console
        console.error(
          'GeographyErrorBoundary caught an error:',
          error,
          errorInfo,
        );
      }
    },
    [onError],
  );

  const retry = useCallback(() => {
    // Reset the error boundary by changing the key - React 19 compatible pattern
    setErrorBoundaryKey((prev) => prev + 1);
  }, []);

  const errorFallback = useCallback(
    (error: Error) => fallback(error, retry),
    [fallback, retry],
  );

  return (
    <MinimalErrorBoundary
      key={errorBoundaryKey}
      fallback={errorFallback}
      onError={handleError}
      resetKey={resetKey}
    >
      {children}
    </MinimalErrorBoundary>
  );
}

export default GeographyErrorBoundary;
