export interface ConcurrentTask {
    id: string;
    priority: 'urgent' | 'normal' | 'background';
    task: () => void | Promise<void>;
    dependencies?: string[];
    timeout?: number;
}
export interface ConcurrentBatch {
    tasks: ConcurrentTask[];
    batchId: string;
    maxConcurrency: number;
    onComplete?: () => void;
    onError?: (error: Error, taskId: string) => void;
}
export declare class ConcurrentRenderingOptimizer {
    private taskQueue;
    private runningTasks;
    private completedTasks;
    private maxConcurrentTasks;
    private performanceMetrics;
    constructor(maxConcurrentTasks?: number);
    scheduleTask(task: ConcurrentTask): void;
    scheduleBatch(batch: ConcurrentBatch): void;
    private processQueue;
    private executeTask;
    private monitorBatchCompletion;
    getMetrics(): Record<string, number>;
    cleanup(): void;
}
export declare function useOptimizedTransition(): readonly [boolean, (callback: () => void) => void];
export declare function useOptimizedDeferredValue<T>(value: T, initialValue?: T, options?: {
    timeoutMs?: number;
    priority?: 'low' | 'normal' | 'high';
}): T;
export declare function useOptimizedOptimistic<T>(state: T, updateFn: (currentState: T, optimisticValue: T) => T, options?: {
    validateFn?: (value: T) => boolean;
    rollbackDelay?: number;
}): [T, (optimisticValue: T) => void];
export declare const globalConcurrentOptimizer: ConcurrentRenderingOptimizer;
export declare const concurrentUtils: {
    batchGeographyLoads: (urls: string[]) => void;
    optimizeZoomPan: (operations: Array<() => void>) => void;
};
export default ConcurrentRenderingOptimizer;
//# sourceMappingURL=concurrentOptimizer.d.ts.map