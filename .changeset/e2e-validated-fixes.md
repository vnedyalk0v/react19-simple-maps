---
'@vnedyalk0v/react19-simple-maps': patch
---

Fix several rendering, interaction, packaging, and geography-loading defects found during end-to-end validation.

- `MapWithMetadata` no longer crashes when JSON-LD is enabled (the default), forwards `ref` to the map's `<svg>`, accepts partial `metadata` with preset fallbacks, and no longer preloads a nonexistent font file.
- Inline TopoJSON or GeoJSON passed to `Geographies` now renders during server rendering and on the first client render instead of appearing only after hydration.
- Controlled `ZoomableGroup` maps no longer freeze or skip `onMoveEnd` when `center` or `zoom` changes during a drag or wheel gesture, and `onMoveStart`/`onMoveEnd` always use the latest callbacks.
- `Annotation` draws its connector line again, using the `curve` prop.
- `Geography` elements with `onClick` expose `role="button"` and activate with Enter or Space.
- `ComposableMap` no longer forwards `onGeographyError` and `fallback` to the `<svg>` element; both props are deprecated there and have no effect.
- The `debug` prop and `REACT_SIMPLE_MAPS_DEBUG` produce console output in the published build again, apply per map, and no longer crash when no global `process` exists.
- The package output is now split per module so bundlers can tree-shake unused components and utilities, and source maps include their original sources.
- Type definitions now resolve without extra installs: the `@types` packages used by the public types are dependencies, and the `Geographies` render prop exposes `PreparedFeature` items with `rsmKey`.
- `fetchGeographiesCache` now shares in-flight and successful requests per URL outside React Server Components, so preloading and rendering the same URL downloads it once; failed requests are retried on the next call.
- Hostnames that merely start with private-range digits (for example `10.cdn.example.com`) are no longer rejected, while `localhost.` and `*.localhost` are now blocked in production.
- Known-source integrity checks also apply to equivalent URL variants (query strings, percent-encoded `@`), and custom SRI entries with `enforceIntegrity: false` are no longer enforced.
- `configureGeographySecurity` now rejects non-integer, non-positive, or out-of-range `TIMEOUT_MS` and `MAX_RESPONSE_SIZE` values with a `CONFIGURATION_ERROR`.
- The request timeout now also covers server-side hostname resolution, failed responses release their connection, and data validation errors keep their `VALIDATION_ERROR` type and include the requested URL.
