---
'@vnedyalk0v/react19-simple-maps': patch
---

Synthesized prepared geography keys now avoid collisions with existing feature keys.

- Fallback `rsmKey` values keep React list keys unique when a GeoJSON `id` or existing `rsmKey` already uses the same `geo-*` shape.
- Duplicate explicit `rsmKey` and GeoJSON `id` values are also disambiguated with stable suffixes.
