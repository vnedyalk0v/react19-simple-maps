# Changelog

## 2.0.12

### Patch Changes

- Fix additional map interaction, metadata, coordinate extraction, and integrity-checking defects.
  - Inline `filterZoomEvent` callbacks no longer interrupt controlled drag and wheel gestures.
  - Overlapping accepted mouse-button drags restore the page's original text-selection behavior when they finish or unmount.
  - Disabling Open Graph or Twitter cards removes every tag in the corresponding group.
  - `getGeographyCoordinates` searches later GeometryCollection members when earlier members are empty or invalid.
  - Custom SRI configuration recognizes equivalent URL keys and captures independent integrity entries, so later caller mutations cannot change an active policy or request.
  - SHA-256 and SHA-512 integrity checks use correct base64 padding in runtimes without `btoa`.
  - `generateSRIHash` releases unread response bodies when an HTTP request fails.
- Fix several rendering, interaction, packaging, and geography-loading defects found during end-to-end validation.
  - `MapWithMetadata` no longer crashes when JSON-LD is enabled (the default), forwards `ref` to the map's `<svg>`, and no longer preloads a nonexistent font file.
  - `MapWithMetadata` accepts a new optional `presetArgs` prop, typed for the selected preset, so `countryMap`, `cityMap`, and `dataVisualization` describe the given subject (for example `preset="countryMap" presetArgs={['France']}`). Without `presetArgs`, these presets no longer emit placeholder JSON-LD and text about "Default".
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
- Fix zoom target updates, malformed polygon loading, and SVG ref prop compatibility.
  - Initialize zoom and pan when a descendant mounts or replaces the hook target, and cancel active gestures when it removes the target.
  - Reject downloaded polygons with empty or single-position rings during validation so they report loading errors instead of crashing map rendering.
  - Allow exported component props to be spread into their components with `exactOptionalPropertyTypes` enabled, including optional SVG refs.
- Keep geography error fallbacks and retry controls working when children throw a value other than an Error. Error callbacks now consistently receive an Error, while existing Error objects retain their identity.
- Fix geography event handling, TopoJSON parser inputs, and custom integrity URL matching.
  - Geography keyboard clicks preserve modifier keys and the originating window, and propagate through shadow DOM boundaries.
  - Canceled taps no longer trigger double-tap zoom, and rejected touches cannot end an active wheel gesture.
  - Inline error callbacks can update parent state without repeatedly reporting the same failed request; subsequent failures still notify.
  - TopoJSON conversion removes null geometries before passing features to typed parsers.
  - Custom SRI policies keep encoded reserved characters distinct while recognizing equivalent percent escapes in paths and queries, preventing integrity checks from being skipped.
- Fix keyboard navigation cancellation, gesture cleanup, redirect integrity checks, and TypeScript 5.0 compatibility.
  - `Geography` keyboard activation respects `onClick` handlers that cancel hyperlink navigation.
  - Disposing or reconfiguring a zoomable map releases active gestures without firing stale movement callbacks.
  - Geography redirects preserve the original integrity requirement and enforce hashes configured for redirected sources.
  - `MapWithMetadata` remains usable in JSX with TypeScript 5.0.
- Fix map target lifecycle, touch ownership, and debug configuration handling.
  - Initialize gestures and the requested viewport when a hook target mounts late or is replaced, and cancel gestures when it is removed.
  - Keep outside and rejected touches from influencing map gestures.
  - Stop pending gesture work when a move callback synchronously unmounts or reconfigures the map.
  - Accept valid projection configurations without a constructor when debug logging is enabled.
- Handle missing geometries and empty multipart members without losing usable geography data.
  - Exclude GeoJSON features with null geometry before calling `parseGeographies`, while preserving the original downloaded data.
  - Make `getGeographyCoordinates` find the first available coordinate after empty members of a MultiLineString or MultiPolygon.
- Handle coordinates their projection cannot represent without emitting invalid SVG transforms.
  - Hide unprojectable markers and annotations.
  - Keep initial zoom groups at their default transform and preserve the current position when a requested center cannot be projected.
- Reset marker interaction styles after leaving a projection and remove inaccurate fixed geographic metadata.
  - Markers that reappear after being outside a projection start without stale focus, hover, or pressed styles.
  - Map metadata no longer assigns every map a world location and coordinates of zero latitude and longitude.
- Handle nested geography coordinates and accurately type nullable fetched geometries.
  - Coordinate extraction finds the first valid coordinate beyond ten nested GeometryCollections while safely handling cycles.
  - Raw geography fetch results correctly expose nullable GeoJSON geometries. TypeScript consumers should check for null or pass fetched data through `getFeatures`, which continues to return only features with geometry.
- Reject malformed downloaded geography data during loading so invalid features, coordinates, and topology arcs produce a validation error instead of failing during map rendering.
- Prevent zoom and pan callbacks from receiving non-finite coordinates when a custom projection cannot invert the current map center. Valid movement callbacks resume when the center returns to the projection's domain.
- Fix geography validation, initial server rendering, and custom integrity policies.
  - Public data guards reject malformed GeoJSON and TopoJSON before consumers try to render them, while handling cyclic and deeply nested collections safely.
  - `isGeoProjection` accepts projections without an inverse and rejects functions missing projection methods.
  - `ZoomableGroup` renders its requested center and zoom on the server and initial client render.
  - Geography preload hints are emitted for each server render instead of only the first request.
  - Custom SRI entries keep separate integrity policies for paths with and without a trailing slash.
- Reject malformed GeoJSON lines and polygon rings before processing fetched geography data.
  - Require at least two positions in nonempty lines and four positions with matching endpoints in polygon rings, while preserving supported empty geometries.
- Reject invalid TopoJSON geometry metadata before it reaches feature parsers.
  - Geography validation and secure fetching now reject non-object properties and identifiers other than strings or numbers, including in nested TopoJSON geometries.
  - Optional properties, null properties, and valid identifiers remain supported.

## 2.0.11

### Patch Changes

- Preserve touch scrolling when panning is disabled and improve geography request compatibility.
  - Allow one-finger page scrolling without movement callbacks while keeping pinch and double-tap zoom available.
  - Accept up to five validated redirects when redirect responses are inspectable; browsers still require final resource URLs.
  - Avoid unnecessary CORS preflight requests by sending only the geography Accept header.
- Fix geography security enforcement and map rendering and interaction behavior.
  - Share security and integrity configuration across the main package and utilities imports.
  - Validate redirects when generating integrity hashes, preserve security error classifications, cancel unused redirect bodies, and enforce geography request timeouts through body completion.
  - Refresh parsed and prepared geographies when their parser changes, and catch parser and render callback errors inside the enabled geography error boundary.
  - Honor independent zoom and pan controls, including double-tap zoom, reject unintended mouse gestures, and preserve requested map positioning after viewport or projection changes while retaining user pan for equivalent projection settings.
  - Apply configured parallels to supported conic projections.
- Raise the minimum d3-geo dependency version to 3.1.1.

## 2.0.10

### Patch Changes

- Fixed a d3-zoom listener leak and restored the `sideEffects: false` contract.
  - `useZoomBehavior` now detaches `.zoom` namespace listeners on effect cleanup, so pointer, wheel, and touch handlers no longer outlive the effect across Strict Mode re-runs and unmount.
  - Removed a top-level `globalThis.__MAP_DEBUGGER__` write that ran at import time, violating the package's `sideEffects: false` declaration and blocking tree-shaking.
  - The published bundle now preserves the `/* @vite-ignore */` annotation on the guarded `node:dns/promises` import, so downstream Vite projects no longer emit a dynamic-import warning.

## 2.0.9

### Patch Changes

- Prepared geographies now always expose a stable `rsmKey` value for React list keys.
  - Existing `rsmKey` values are preserved, feature `id` values are used when available, and deterministic index keys are used as a fallback.
- Synthesized prepared geography keys now avoid collisions with existing feature keys.
  - Fallback `rsmKey` values keep React list keys unique when a GeoJSON `id` or existing `rsmKey` already uses the same `geo-*` shape.
  - Duplicate explicit `rsmKey` and GeoJSON `id` values are also disambiguated with stable suffixes.

## 2.0.8

### Patch Changes

- Hardened geography validation and cache isolation.
  - Blocks prototype-mutation payloads during object validation and avoids inherited-value reads in projection and security config parsing.
  - Replaces collision-prone geography cache keys with object-identity-based keys so different datasets or parsing functions do not reuse the wrong cached results.
  - Applies the hardened geography URL validation pipeline to `generateSRIHash`.
  - Adds safer default geography error messaging.
  - Fails more predictably on malformed nested geography input.

## 2.0.7

### Patch Changes

- Hardened geography validation and cache isolation.
  - Blocks prototype-mutation payloads during object validation and avoids inherited-value reads in projection and security config parsing.
  - Replaces collision-prone geography cache keys with object-identity-based keys so different datasets or parsing functions do not reuse the wrong cached results.
  - Applies the hardened geography URL validation pipeline to `generateSRIHash`.
  - Adds safer default geography error messaging.
  - Fails more predictably on malformed nested geography input.

## [2.0.6] - 2026-04-06

### Changed

- Removed GitHub Packages as a distribution target for this package.
  - The package now publishes only to the npm registry.
  - The installation and release documentation now reflects npm as the supported distribution channel.

## [2.0.5] - 2026-04-06

### Changed

- Clarified the supported Node.js version for development and build workflows.
  - CI now validates the package on Node.js 20 and Node.js 22.
  - The repository documentation now reflects the current toolchain requirement of Node.js 20.19.0 or newer for development and build tasks.

## [2.0.4] - 2026-04-06

### Fixed

- Fixed `useDeferredPosition` so controlled zoom values are no longer clamped to an internal `0.1..10` range.
  - Preserves caller-provided zoom levels so `scaleExtent`, `minZoom`, and `maxZoom` continue to control the valid range.
  - Prevents controlled zoom state from drifting away from d3-zoom when applications intentionally allow values above `10`.

### Security

- Hardened geography fetching and validation in server environments.
  - Blocks geography hostnames that resolve to private IP addresses during server-side fetch validation, reducing SSRF exposure from hostile DNS.
  - Keeps production fetch security on hardened defaults for HTTPS-only geography loading and known-source integrity enforcement, while preserving custom security limits and custom SRI entries across partial configuration updates.
  - Tightens content-type validation to match exact MIME types and rejects malformed URL input, including embedded control characters, instead of sanitizing it into different accepted values.

### Changed

- Updated example rendering behavior, geography URLs, and interaction handling across the examples.
  - Avoids redirect-related fetch failures in the README and example apps by using direct `https://unpkg.com/world-atlas@2.0.2/...` geography URLs.
  - Replaces transition-incompatible optimistic zoom state updates with immediate local state so browser zoom and pan interactions no longer spam React console errors.
  - Keeps map projection and path caching aligned with the active projection so changing projections updates rendered geography shapes correctly and unrelated hover rerenders no longer recreate projection state.
  - Updates the interactive example to keep hover details from shifting page layout and to render shared country borders separately, reducing flicker when moving across country edges.
  - Applies the same shared-border rendering approach to the basic example, renders selected countries in a top overlay layer so their outlines stay visually consistent, and refreshes the example app dependency ranges to current React 19 and Vite patch lines.

### Removed

- Removed the built-in `ZoomableGroup` zoom and pan indicator.
  - Stops showing the built-in top-left zoom and pan indicator during map interactions so direct manipulation stays visually clean.

## [2.0.3] - 2026-04-02

### Fixed

- Resolved the confirmed React 19 audit findings across geography loading, memoization, focus handling, zoom bounds, validation messages, debug render purity, and SVG-safe error fallbacks.
- Fixed stale async updates in `useGeographies` and added retry support for string URL geography loads.
- Restored targeted memoization where safe without blocking updates to forwarded DOM props.
- Regenerated `package-lock.json` so it matches package version `2.0.2`.

### Changed

- Production builds now set `NODE_ENV=production` so Rollup applies Terser optimizations consistently.
- Bundle monitor optimization status now reports `0%` completion as `not_started`.
- Bundle report schema now uses numeric utilization and completion-rate values, with parallel formatted string fields for display output.

### Security

- Fixed an IPv6 private-address bypass in URL validation, including IPv4-mapped IPv6 handling and broader reserved-range coverage.
- Validated geography URLs before DNS prefetch, preconnect, or preload work begins.
- Canonicalized URLs before SRI lookup and custom SRI registration to prevent bypasses through trivial URL variants.
- Redacted `git.branch` in persisted bundle reports by default and added `BUNDLE_REPORT_REDACT_GIT` to omit git metadata entirely when needed.

## [2.0.2] - 2026-02-06

### Deprecated

- Deprecated `fetchGeographies`; it now delegates to the hardened `fetchGeographiesCache` pipeline.

### Fixed

- Escaped script-breaking characters in JSON-LD metadata rendering to prevent script-breakout XSS in `MapMetadata`.
- Enforced streaming response-size limits even when `Content-Length` is missing or inaccurate.
- Aligned `GeographyActions` with the shared secure URL validation and fetch pipeline.

### Security

- Switched redirect handling to `redirect: 'manual'` and validated every redirect hop against the URL security policy.
- Added clear dev-only labeling and production CSP guidance across examples and `SECURITY.md`.
- Standardized `X-XSS-Protection: 0` guidance across examples and documentation.

## [2.0.1] - 2026-02-06

### Fixed

- Removed a deprecated `/* eslint-env browser */` comment that would fail under ESLint v10.
- Excluded intermediate `dist/types/` artifacts from the published package to reduce package size.
- Quoted lint script glob patterns for better cross-platform shell compatibility.
- Updated TypeScript `moduleResolution` from `node` to `bundler` to match the ESM `exports` map.
- Raised the Vitest esbuild target from `node18` to `node22` to match the supported Node.js baseline.

## [2.0.0] - 2026-02-06

### Added

- Added a `./utils` subpath export for direct utility imports.

### Changed

- Switched the published package to an ESM-only distribution.

### Removed

- Removed CommonJS (`require`) and UMD builds.

## [1.2.1] - 2025-12-03

### Fixed

- Prevented build failures caused by importing `captureOwnerStack` from React 19 stable builds by gating access to the API behind a development-only wrapper.
- Updated development dependencies and adjusted Rollup TypeScript plugin compatibility to match the refreshed toolchain.

## [1.2.0] - 2025-09-03

### Added

- Added an opt-in `debug` prop on `ComposableMap` for per-map debugging control.
- Added the `REACT_SIMPLE_MAPS_DEBUG` environment variable for global debug activation.

### Changed

- Debug logging is now disabled by default and only enabled explicitly through the prop or environment variable.

## [1.1.1] - 2025-09-03

### Fixed

- Stopped forwarding internal `ZoomableGroup` props to DOM elements, eliminating React DOM warnings for `minZoom`, `maxZoom`, `scaleExtent`, `enableZoom`, `translateExtent`, and `enablePan`.

## [1.1.0] - 2025-09-03

### Added

- Added helper functions for zoom and pan configuration: `createZoomConfig()`, `createPanConfig()`, and `createZoomPanConfig()`.
- Added richer geographic utility helpers, including centroid, bounds, and coordinate extraction helpers.
- Added migration guidance and updated examples to support migration from `react-simple-maps`.

### Changed

- Simplified `ZoomableGroup` configuration while preserving backward compatibility with existing usage patterns.
- Enhanced `Geography` event handlers so they can provide richer geographic data to consumers.

## [1.0.6] - 2025-09-03

### Fixed

- Fixed broken UMD exports that caused module resolution failures in Turbopack and other modern bundlers.
- Corrected Terser settings that were breaking UMD export behavior.

### Changed

- Pointed the `browser` field at the working ES module build as a fallback while UMD stability was restored.
- Added build verification scripts and stronger release-time build checks to catch export regressions earlier.

## [1.0.5] - 2025-09-03

### Changed

- Simplified the `basic-map` example and improved example-specific ESLint and publishing configuration.
- Updated package publishing defaults for public npm releases and more consistent registry metadata.

### Fixed

- Improved root element checks in the examples.
- Removed unused marker hover behavior and related event handling from examples.
- Cleaned up Content Security Policy meta tags and example package linkage.

### Security

- Added Subresource Integrity support and strengthened example security validation.

## [1.0.4] - 2025-09-03

### Added

- Added branded coordinate types, runtime type guards, and initial test infrastructure for the React 19 rewrite.

### Changed

- Refined conditional types, modularized validation utilities, and simplified the dependency and script surface in `package.json`.
- Improved build configuration for cleaner output and faster builds.

### Fixed

- Eliminated TypeScript and ESLint errors across the codebase.
- Removed non-null assertions by replacing them with explicit null handling.
- Fixed React Hook ordering issues and control-character regex warnings.

### Security

- Strengthened input validation, protocol validation, CSS sanitization, and Subresource Integrity support.

## [1.0.3] - 2025-09-02

### Fixed

- Included `README.md`, `LICENSE`, and `CHANGELOG.md` in the published npm package so package metadata and documentation render correctly on npm.

## [1.0.2] - 2025-09-02

### Added

- Added a richer interactive example with zoom, pan, click interactions, markers, and reset controls.

### Changed

- Updated examples to use inline geography data so they work without CORS issues.
- Refined example styling and interaction feedback for a clearer demo experience.

## [1.0.1] - 2025-09-02

### Fixed

- Moved the React `use()` call to the top level of `useGeographies` so the hook follows the Rules of Hooks.
- Updated example geography loading to use a working TopoJSON source.
- Fixed branded coordinate typing issues and dependency alignment in the example apps.

## [1.0.0] - 2025-09-02

### Added

- Initial release of `@vnedyalk0v/react19-simple-maps`, a React 19-focused fork of `react-simple-maps`.
- Core map primitives including `ComposableMap`, `Geographies`, `Geography`, `Marker`, `Annotation`, `Graticule`, `Sphere`, and `ZoomableGroup`.
- TypeScript-first package output with bundled type definitions and source maps.
- Modern test and build tooling based on Rollup, Vitest, ESLint, and Prettier.
- React 19-oriented behaviors such as Suspense-aware geography loading, preloading support, and concurrent rendering compatibility work.
