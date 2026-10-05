---
'@vnedyalk0v/react19-simple-maps': patch
---

Reject invalid TopoJSON geometry metadata before it reaches feature parsers.

- Geography validation and secure fetching now reject non-object properties and identifiers other than strings or numbers, including in nested TopoJSON geometries.
- Optional properties, null properties, and valid identifiers remain supported.
