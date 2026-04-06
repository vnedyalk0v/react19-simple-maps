---
'@vnedyalk0v/react19-simple-maps': patch
---

Removed the built-in `ZoomableGroup` zoom and pan indicator, pinned the example geography URLs to exact world-atlas versions, removed React 19 optimistic update warnings during zoom interactions, and fixed projection changes in the example maps.

- Stops showing the built-in top-left zoom and pan indicator during map interactions so direct manipulation stays visually clean.
- Avoids redirect-related fetch failures in the README and example apps by using direct `https://unpkg.com/world-atlas@2.0.2/...` geography URLs.
- Replaces transition-incompatible optimistic zoom state updates with immediate local state so browser zoom and pan interactions no longer spam React console errors.
- Keeps map projection and path caching aligned with the active projection so changing projections updates rendered geography shapes correctly and unrelated hover rerenders no longer recreate projection state.
- Updates the interactive example to keep hover details from shifting page layout and to render shared country borders separately, reducing flicker when moving across country edges.
- Applies the same shared-border rendering approach to the basic example, renders selected countries in a top overlay layer so their outlines stay visually consistent, and refreshes the example app dependency ranges to current React 19 and Vite patch lines.
