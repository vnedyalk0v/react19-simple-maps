---
'@vnedyalk0v/react19-simple-maps': patch
---

Fix additional map interaction, metadata, coordinate extraction, and integrity-checking defects.

- Inline `filterZoomEvent` callbacks no longer interrupt controlled drag and wheel gestures.
- Overlapping accepted mouse-button drags restore the page's original text-selection behavior when they finish or unmount.
- Disabling Open Graph or Twitter cards removes every tag in the corresponding group.
- `getGeographyCoordinates` searches later GeometryCollection members when earlier members are empty or invalid.
- Custom SRI configuration recognizes equivalent URL keys and captures independent integrity entries, so later caller mutations cannot change an active policy or request.
- SHA-256 and SHA-512 integrity checks use correct base64 padding in runtimes without `btoa`.
- `generateSRIHash` releases unread response bodies when an HTTP request fails.
