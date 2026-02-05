import { ReactNode } from 'react';
interface PendingIndicatorProps {
    isPending: boolean;
    children: ReactNode;
    fallback?: ReactNode;
    className?: string;
}
export declare function PendingIndicator({ isPending, children, fallback, className, }: PendingIndicatorProps): import("react/jsx-runtime").JSX.Element;
export default PendingIndicator;
//# sourceMappingURL=PendingIndicator.d.ts.map