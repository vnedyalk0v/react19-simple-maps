---
'@vnedyalk0v/react19-simple-maps': patch
---

Made the `ZoomableGroup` pending indicator SVG-safe and pinned the example geography URLs to exact world-atlas versions so the example maps load reliably in browsers.

- Prevents invalid HTML from being rendered inside `<svg>` / `<g>` content during pending zoom and pan transitions.
- Avoids redirect-related fetch failures in the README and example apps by using direct `https://unpkg.com/world-atlas@2.0.2/...` geography URLs.
