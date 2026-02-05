interface PerformanceMetrics {
    renderTime: number;
    interactionTime: number;
    memoryUsage: number | undefined;
    frameDrops: number;
    transitionDuration: number;
    frameCount?: number;
    averageFrameTime?: number;
    concurrentRenderTime?: number;
    suspenseBoundaryCount?: number;
    actionPendingTime?: number;
    optimisticUpdateTime?: number;
    deferredValueLatency?: number;
    serverActionTime?: number;
    resourcePreloadTime?: number;
    hydrationTime?: number;
}
interface PerformanceTestResult {
    testName: string;
    metrics: PerformanceMetrics;
    timestamp: number;
    passed: boolean;
    details?: string;
}
export declare const PERFORMANCE_THRESHOLDS: {
    readonly MAX_RENDER_TIME: 16;
    readonly MAX_INTERACTION_TIME: 100;
    readonly MAX_TRANSITION_DURATION: 1000;
    readonly MAX_FRAME_DROPS: 5;
    readonly MAX_MEMORY_INCREASE: number;
    readonly MAX_CONCURRENT_RENDER_TIME: 50;
    readonly MAX_ACTION_PENDING_TIME: 200;
    readonly MAX_OPTIMISTIC_UPDATE_TIME: 20;
    readonly MAX_DEFERRED_VALUE_LATENCY: 50;
    readonly MAX_SERVER_ACTION_TIME: 1000;
    readonly MAX_RESOURCE_PRELOAD_TIME: 100;
    readonly MAX_HYDRATION_TIME: 500;
    readonly MAX_SUSPENSE_BOUNDARY_COUNT: 10;
};
export declare class PerformanceMonitor {
    private startTime;
    private rafId;
    private frameCount;
    private droppedFrames;
    private lastFrameTime;
    private isMonitoring;
    private observers;
    private concurrentRenderStart;
    private suspenseBoundaryCount;
    private actionPendingStart;
    private optimisticUpdateStart;
    private deferredValueStart;
    private serverActionStart;
    private resourcePreloadStart;
    private hydrationStart;
    private performanceMarks;
    constructor();
    private initializeObservers;
    private frameCallback;
    startMonitoring(): void;
    stopMonitoring(): PerformanceMetrics;
    private getMemoryUsage;
    private getEmptyMetrics;
    markConcurrentRenderStart(): void;
    markConcurrentRenderEnd(): number;
    markActionPendingStart(): void;
    markActionPendingEnd(): number;
    markOptimisticUpdateStart(): void;
    markOptimisticUpdateEnd(): number;
    markDeferredValueStart(): void;
    markDeferredValueEnd(): number;
    markServerActionStart(): void;
    markServerActionEnd(): number;
    markResourcePreloadStart(): void;
    markResourcePreloadEnd(): number;
    markHydrationStart(): void;
    markHydrationEnd(): number;
    incrementSuspenseBoundary(): void;
    getReact19Metrics(): {
        concurrentRenderTime?: number;
        suspenseBoundaryCount?: number;
        actionPendingTime?: number;
        optimisticUpdateTime?: number;
        deferredValueLatency?: number;
        serverActionTime?: number;
        resourcePreloadTime?: number;
        hydrationTime?: number;
    };
    destroy(): void;
}
export declare function testConcurrentFeatures(): Promise<PerformanceTestResult[]>;
export declare function generatePerformanceReport(results: PerformanceTestResult[]): string;
declare const _default: {
    PerformanceMonitor: typeof PerformanceMonitor;
    testConcurrentFeatures: typeof testConcurrentFeatures;
    generatePerformanceReport: typeof generatePerformanceReport;
    PERFORMANCE_THRESHOLDS: {
        readonly MAX_RENDER_TIME: 16;
        readonly MAX_INTERACTION_TIME: 100;
        readonly MAX_TRANSITION_DURATION: 1000;
        readonly MAX_FRAME_DROPS: 5;
        readonly MAX_MEMORY_INCREASE: number;
        readonly MAX_CONCURRENT_RENDER_TIME: 50;
        readonly MAX_ACTION_PENDING_TIME: 200;
        readonly MAX_OPTIMISTIC_UPDATE_TIME: 20;
        readonly MAX_DEFERRED_VALUE_LATENCY: 50;
        readonly MAX_SERVER_ACTION_TIME: 1000;
        readonly MAX_RESOURCE_PRELOAD_TIME: 100;
        readonly MAX_HYDRATION_TIME: 500;
        readonly MAX_SUSPENSE_BOUNDARY_COUNT: 10;
    };
};
export default _default;
//# sourceMappingURL=performance.d.ts.map