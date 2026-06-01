---
'@vnedyalk0v/react19-simple-maps': patch
---

Prepared geographies now always expose a stable `rsmKey` value for React list keys.

- Existing `rsmKey` values are preserved, feature `id` values are used when available, and deterministic index keys are used as a fallback.
