---
'@vnedyalk0v/react19-simple-maps': patch
---

Reject malformed GeoJSON lines and polygon rings before processing fetched geography data.

- Require at least two positions in nonempty lines and four positions with matching endpoints in polygon rings, while preserving supported empty geometries.
