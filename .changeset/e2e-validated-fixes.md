---
'@vnedyalk0v/react19-simple-maps': patch
---

Fix several rendering, interaction, packaging, and geography-loading defects found during end-to-end validation.

- `MapWithMetadata` no longer crashes when JSON-LD is enabled (the default), forwards `ref` to the map's `<svg>`, and no longer preloads a nonexistent font file.
- Inline TopoJSON or GeoJSON passed to `Geographies` now renders during server rendering and on the first client render instead of appearing only after hydration.
- `Geographies` no longer briefly renders the previous URL's features or re-reports a previous URL's error after `geography` changes, and a URL reports `isLoading` from its first render.
- With `errorBoundary`, a caught error now clears when the `geography` URL changes. `GeographyErrorBoundary` accepts a new optional `resetKey` prop for the same behavior.
- Geography loading no longer logs to the console unless debug mode is enabled.
- Controlled `ZoomableGroup` maps no longer freeze or skip `onMoveEnd` when `center` or `zoom` changes during a drag or wheel gesture, and `onMoveStart`/`onMoveEnd` always use the latest callbacks.
- `Annotation` draws its connector line again, using the `curve` prop.
- `projectionConfig.scale` accepts any positive value, so city- and region-level maps are no longer rejected above 10000. `projectionConfig.rotate` accepts the two-element `[lambda, phi]` form, and `createRotationAngles` and the `RotationAngles` type are now exported.
- Projection names that are not d3-geo projections (such as `geoArea`) now throw a `PROJECTION_ERROR` instead of an unrelated TypeError.
- `Line` no longer requires `from` and `to` when `coordinates` is provided; it accepts either `coordinates` or both `from` and `to`.
- `getGeographyCentroid`, `getGeographyBounds`, and `getGeographyCoordinates` return `null` instead of throwing or returning out-of-range values for empty or invalid geometries, so `Geography` no longer crashes on them.
- TopoJSON whose first object is a single geometry (not a GeometryCollection) now renders its feature instead of nothing.
- `Geography` elements with `onClick` expose `role="button"`, activate on Enter, and activate on Space when the key is released, like native buttons.
- `ComposableMap` no longer forwards `onGeographyError` and `fallback` to the `<svg>` element; both props are deprecated there and have no effect.
- The `debug` prop and `REACT_SIMPLE_MAPS_DEBUG` produce console output in the published build again, apply per map, and no longer crash when no global `process` exists.
- The package output is now split per module so bundlers can tree-shake unused components and utilities, and source maps include their original sources.
- Type definitions now resolve without extra installs: the `@types` packages used by the public types are dependencies, and the `Geographies` render prop exposes `PreparedFeature` items with `rsmKey`.
- `fetchGeographiesCache` now shares concurrent requests for the same URL, so preloading and rendering a URL downloads it once. Requests are not reused once settled or after the security or SRI configuration changes, so `refetch()` and tightened policies always take effect.
- Hostnames that merely start with private-range digits (for example `10.cdn.example.com`) are no longer rejected, while `localhost.` and `*.localhost` are now blocked in production.
- Known-source integrity checks also apply to equivalent URL variants (query strings, percent-encoded `@`, a trailing dot in the hostname), and custom SRI entries with `enforceIntegrity: false` are no longer enforced.
- `configureGeographySecurity` now rejects non-integer, non-positive, or out-of-range `TIMEOUT_MS` and `MAX_RESPONSE_SIZE` values with a `CONFIGURATION_ERROR`.
- The request timeout now also covers server-side hostname resolution, including on redirects and in `generateSRIHash`. Failed responses release their connection, and data validation errors keep their `VALIDATION_ERROR` type and include the requested URL.
