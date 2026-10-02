---
'@vnedyalk0v/react19-simple-maps': patch
---

Fix geography security enforcement and map rendering and interaction behavior.

- Share security and integrity configuration across the main package and utilities imports.
- Validate redirects when generating integrity hashes, cancel unused redirect bodies, and enforce geography request timeouts through body completion.
- Refresh parsed and prepared geographies when their parser changes, and catch parser and render callback errors inside the enabled geography error boundary.
- Honor independent zoom and pan controls, reject unintended mouse gestures, and preserve requested map positioning after viewport or projection changes.
- Apply configured parallels to supported conic projections.
