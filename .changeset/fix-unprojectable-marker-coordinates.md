---
'@vnedyalk0v/react19-simple-maps': patch
---

Handle coordinates their projection cannot represent without emitting invalid SVG transforms.

- Hide unprojectable markers and annotations.
- Keep initial zoom groups at their default transform and preserve the current position when a requested center cannot be projected.
