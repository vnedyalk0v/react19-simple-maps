import { ReactNode } from 'react';
interface OptimizedSuspenseProps {
    children: ReactNode;
    fallback?: ReactNode;
    fallbackDelay?: number;
    expectedLoadTime?: number;
    priority?: 'low' | 'normal' | 'high';
    retryCount?: number;
    onRetry?: () => void;
    onLoadStart?: () => void;
    onLoadEnd?: (duration: number) => void;
}
export declare function OptimizedSuspense({ children, fallback, fallbackDelay, // React 19 default with optimization
expectedLoadTime, priority, retryCount, onRetry, onLoadStart, onLoadEnd, }: OptimizedSuspenseProps): import("react/jsx-runtime").JSX.Element;
export declare function GeographyOptimizedSuspense({ children, geographyUrl, ...props }: OptimizedSuspenseProps & {
    geographyUrl?: string;
}): import("react/jsx-runtime").JSX.Element;
export declare function BatchedSuspense({ children, batchSize: _batchSize, // Prefix with underscore to indicate intentionally unused
...props }: OptimizedSuspenseProps & {
    batchSize?: number;
}): import("react/jsx-runtime").JSX.Element;
export default OptimizedSuspense;
//# sourceMappingURL=OptimizedSuspense.d.ts.map