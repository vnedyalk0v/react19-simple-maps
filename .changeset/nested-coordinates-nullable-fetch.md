---
'@vnedyalk0v/react19-simple-maps': patch
---

Handle nested geography coordinates and accurately type nullable fetched geometries.

- Coordinate extraction finds the first valid coordinate beyond ten nested GeometryCollections while safely handling cycles.
- Raw geography fetch results correctly expose nullable GeoJSON geometries. TypeScript consumers should check for null or pass fetched data through `getFeatures`, which continues to return only features with geometry.
