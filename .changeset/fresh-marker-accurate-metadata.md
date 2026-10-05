---
'@vnedyalk0v/react19-simple-maps': patch
---

Reset marker interaction styles after leaving a projection and remove inaccurate fixed geographic metadata.

- Markers that reappear after being outside a projection start without stale focus, hover, or pressed styles.
- Map metadata no longer assigns every map a world location and coordinates of zero latitude and longitude.
