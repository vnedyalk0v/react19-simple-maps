---
'@vnedyalk0v/react19-simple-maps': patch
---

Made the `ZoomableGroup` pending indicator SVG-safe so zoom and pan status UI renders correctly inside map SVG trees.

- Prevents invalid HTML from being rendered inside `<svg>` / `<g>` content during pending zoom and pan transitions.
