---
'@vnedyalk0v/react19-simple-maps': patch
---

Handle missing geometries and empty multipart members without losing usable geography data.

- Exclude GeoJSON features with null geometry before calling `parseGeographies`, while preserving the original downloaded data.
- Make `getGeographyCoordinates` find the first available coordinate after empty members of a MultiLineString or MultiPolygon.
