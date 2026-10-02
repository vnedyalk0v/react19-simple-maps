---
'@vnedyalk0v/react19-simple-maps': patch
---

Preserve touch scrolling when panning is disabled and improve geography request compatibility.

- Allow one-finger page scrolling without movement callbacks while keeping pinch and double-tap zoom available.
- Accept up to five validated redirects when redirect responses are inspectable; browsers still require final resource URLs.
- Avoid unnecessary CORS preflight requests by sending only the geography Accept header.
