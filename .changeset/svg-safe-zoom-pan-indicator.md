---
'@vnedyalk0v/react19-simple-maps': patch
---

Made the `ZoomableGroup` pending indicator SVG-safe, pinned the example geography URLs to exact world-atlas versions, and removed React 19 optimistic update warnings during zoom interactions.

- Prevents invalid HTML from being rendered inside `<svg>` / `<g>` content during pending zoom and pan transitions.
- Avoids redirect-related fetch failures in the README and example apps by using direct `https://unpkg.com/world-atlas@2.0.2/...` geography URLs.
- Replaces transition-incompatible optimistic zoom state updates with immediate local state so browser zoom and pan interactions no longer spam React console errors.
