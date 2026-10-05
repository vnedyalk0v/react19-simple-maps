---
'@vnedyalk0v/react19-simple-maps': patch
---

Fix geography event handling, TopoJSON parser inputs, and custom integrity URL matching.

- Geography keyboard clicks preserve modifier keys and the originating window, and propagate through shadow DOM boundaries.
- Canceled taps no longer trigger double-tap zoom, and rejected touches cannot end an active wheel gesture.
- Inline error callbacks can update parent state without repeatedly reporting the same failed request; subsequent failures still notify.
- TopoJSON conversion removes null geometries before passing features to typed parsers.
- Custom SRI policies keep encoded reserved characters distinct while recognizing equivalent percent escapes in paths and queries, preventing integrity checks from being skipped.
