---
'@vnedyalk0v/react19-simple-maps': patch
---

Hardened geography validation, cache isolation, and security utilities.

- Blocks prototype-mutation payloads during object validation and avoids inherited-value reads in projection and security config parsing.
- Replaces collision-prone geography cache keys with object-identity-based keys so different datasets or parsing functions do not reuse the wrong cached results.
- Applies the hardened geography URL validation pipeline to `generateSRIHash`, adds safer default geography error messaging, and fails more predictably on malformed nested geography input.
