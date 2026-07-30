---
'@vnedyalk0v/react19-simple-maps': patch
---

Fixed a d3-zoom listener leak and restored the `sideEffects: false` contract.

- `useZoomBehavior` now detaches `.zoom` namespace listeners on effect cleanup, so pointer, wheel, and touch handlers no longer outlive the effect across Strict Mode re-runs and unmount.
- Removed a top-level `globalThis.__MAP_DEBUGGER__` write that ran at import time, violating the package's `sideEffects: false` declaration and blocking tree-shaking.
- The published bundle now preserves the `/* @vite-ignore */` annotation on the guarded `node:dns/promises` import, so downstream Vite projects no longer emit a dynamic-import warning.
