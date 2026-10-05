---
'@vnedyalk0v/react19-simple-maps': patch
---

Prevent zoom and pan callbacks from receiving non-finite coordinates when a custom projection cannot invert the current map center. Valid movement callbacks resume when the center returns to the projection's domain.
