---
'@vnedyalk0v/react19-simple-maps': patch
---

Fix map target lifecycle, touch ownership, and debug configuration handling.

- Initialize gestures and the requested viewport when a hook target mounts late or is replaced, and cancel gestures when it is removed.
- Keep outside and rejected touches from influencing map gestures.
- Stop pending gesture work when a move callback synchronously unmounts or reconfigures the map.
- Accept valid projection configurations without a constructor when debug logging is enabled.
