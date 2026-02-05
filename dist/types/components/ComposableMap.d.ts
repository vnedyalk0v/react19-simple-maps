import { Ref } from 'react';
import { ComposableMapProps } from '../types';
declare function ComposableMap({ width, height, projection, projectionConfig, className, debug, children, ref, ...restProps }: Omit<ComposableMapProps, 'metadata'> & {
    ref?: Ref<SVGSVGElement>;
}): import("react/jsx-runtime").JSX.Element;
declare namespace ComposableMap {
    var displayName: string;
}
declare const _default: import("react").MemoExoticComponent<typeof ComposableMap>;
export default _default;
//# sourceMappingURL=ComposableMap.d.ts.map