import { ReactNode } from 'react';
interface GeographyErrorBoundaryProps {
    children: ReactNode;
    fallback?: (error: Error, retry: () => void) => ReactNode;
    onError?: (error: Error) => void;
}
export declare function GeographyErrorBoundary({ children, fallback, onError, }: GeographyErrorBoundaryProps): import("react/jsx-runtime").JSX.Element;
export default GeographyErrorBoundary;
//# sourceMappingURL=GeographyErrorBoundary.d.ts.map