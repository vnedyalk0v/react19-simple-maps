---
'@vnedyalk0v/react19-simple-maps': patch
---

Fixed `useDeferredPosition` so controlled zoom values are no longer clamped to an internal `0.1..10` range.

- Preserves caller-provided zoom levels so `scaleExtent`, `minZoom`, and `maxZoom` continue to control the valid range.
- Prevents controlled zoom state from drifting away from d3-zoom when applications intentionally allow values above `10`.
