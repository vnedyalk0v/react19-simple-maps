import React from 'react';
interface DebugInfo {
    componentName: string;
    ownerStack?: string | null;
    timestamp: number;
    props?: Record<string, unknown> | undefined;
    state?: Record<string, unknown> | undefined;
    error?: Error;
}
interface PerformanceMetrics {
    renderTime: number;
    componentCount: number;
    updateCount: number;
}
/**
 * Debug logger for React Simple Maps components
 */
export declare class MapDebugger {
    private static instance;
    private debugLogs;
    private performanceMetrics;
    private isEnabled;
    /**
     * Determine if debug mode should be enabled
     * Priority: Environment variable > explicit prop > default (false)
     */
    private getDebugMode;
    /**
     * Enable or disable debugging at runtime
     */
    setDebugMode(enabled: boolean): void;
    static getInstance(): MapDebugger;
    /**
     * Log component render with owner stack information
     */
    logRender(componentName: string, props?: Record<string, unknown>, state?: Record<string, unknown>): void;
    /**
     * Log component errors with debugging context
     */
    logError(componentName: string, error: Error, props?: Record<string, unknown>): void;
    /**
     * Track performance metrics for components
     */
    trackPerformance(componentName: string, renderTime: number): void;
    /**
     * Get debug logs for a specific component
     */
    getLogsForComponent(componentName: string): DebugInfo[];
    /**
     * Get all debug logs
     */
    getAllLogs(): DebugInfo[];
    /**
     * Get performance metrics
     */
    getPerformanceMetrics(): Map<string, PerformanceMetrics>;
    /**
     * Clear all debug data
     */
    clear(): void;
    /**
     * Enable or disable debugging
     */
    setEnabled(enabled: boolean): void;
    /**
     * Export debug data for analysis
     */
    exportDebugData(): {
        logs: DebugInfo[];
        performance: Record<string, PerformanceMetrics>;
        timestamp: number;
    };
    private sanitizeProps;
    private sanitizeState;
}
/**
 * Hook for component debugging with opt-in support
 */
export declare function useMapDebugger(componentName: string, debug?: boolean): {
    logRender: (props?: Record<string, unknown>, state?: Record<string, unknown>) => void;
    logError: (error: Error, props?: Record<string, unknown>) => void;
    trackPerformance: (renderTime: number) => void;
};
/**
 * Higher-order component for automatic debugging
 */
export declare function withMapDebugging<P extends object>(Component: React.ComponentType<P>, componentName?: string): (props: P) => React.ReactElement<P, string | React.JSXElementConstructor<any>>;
/**
 * Development-only debugging utilities
 */
export declare const devTools: {
    /**
     * Log component hierarchy with owner stack
     */
    logComponentHierarchy: (componentName: string) => void;
    /**
     * Measure component render time
     */
    measureRenderTime: <T>(componentName: string, renderFn: () => T) => T;
    /**
     * Debug geography loading
     */
    debugGeographyLoading: (url: string, status: "start" | "success" | "error", data?: unknown) => void;
};
export declare const mapDebugger: MapDebugger;
export {};
//# sourceMappingURL=debugging.d.ts.map