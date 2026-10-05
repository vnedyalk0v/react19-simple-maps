---
'@vnedyalk0v/react19-simple-maps': patch
---

Fix zoom target updates, malformed polygon loading, and SVG ref prop compatibility.

- Initialize zoom and pan when a descendant mounts or replaces the hook target, and cancel active gestures when it removes the target.
- Reject downloaded polygons with empty or single-position rings during validation so they report loading errors instead of crashing map rendering.
- Allow exported component props to be spread into their components with `exactOptionalPropertyTypes` enabled, including optional SVG refs.
