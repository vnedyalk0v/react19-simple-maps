---
'@vnedyalk0v/react19-simple-maps': patch
---

Hardened geography validation and cache isolation.

- Blocks prototype-mutation payloads during object validation and avoids inherited-value reads in projection and security config parsing.
- Replaces collision-prone geography cache keys with object-identity-based keys so different datasets or parsing functions do not reuse the wrong cached results.
- Applies the hardened geography URL validation pipeline to `generateSRIHash`.
- Adds safer default geography error messaging.
- Fails more predictably on malformed nested geography input.
