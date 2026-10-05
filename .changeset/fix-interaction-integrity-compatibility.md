---
'@vnedyalk0v/react19-simple-maps': patch
---

Fix keyboard navigation cancellation, gesture cleanup, redirect integrity checks, and TypeScript 5.0 compatibility.

- `Geography` keyboard activation respects `onClick` handlers that cancel hyperlink navigation.
- Disposing or reconfiguring a zoomable map releases active gestures without firing stale movement callbacks.
- Geography redirects preserve the original integrity requirement and enforce hashes configured for redirected sources.
- `MapWithMetadata` remains usable in JSX with TypeScript 5.0.
