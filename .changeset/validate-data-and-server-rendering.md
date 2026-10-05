---
'@vnedyalk0v/react19-simple-maps': patch
---

Fix geography validation, initial server rendering, and custom integrity policies.

- Public data guards reject malformed GeoJSON and TopoJSON before consumers try to render them, while handling cyclic and deeply nested collections safely.
- `isGeoProjection` accepts projections without an inverse and rejects functions missing projection methods.
- `ZoomableGroup` renders its requested center and zoom on the server and initial client render.
- Geography preload hints are emitted for each server render instead of only the first request.
- Custom SRI entries keep separate integrity policies for paths with and without a trailing slash.
