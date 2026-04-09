# Changelog

## 2.0.7

### Changed

- Hardened geography validation and cache isolation.
  - Blocks prototype-mutation payloads during object validation and avoids inherited-value reads in projection and security config parsing.
  - Replaces collision-prone geography cache keys with object-identity-based keys so different datasets or parsing functions do not reuse the wrong cached results.
  - Applies the hardened geography URL validation pipeline to `generateSRIHash`.
  - Adds safer default geography error messaging.
  - Fails more predictably on malformed nested geography input.

## [Unreleased]

No unreleased user-facing or package-impacting changes.

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

All notable changes to `@vnedyalk0v/react19-simple-maps` are documented in this file.

This changelog follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and
the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
