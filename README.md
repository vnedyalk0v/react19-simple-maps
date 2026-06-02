# @vnedyalk0v/react19-simple-maps

[![npm version](https://img.shields.io/npm/v/@vnedyalk0v/react19-simple-maps.svg)](https://www.npmjs.com/package/@vnedyalk0v/react19-simple-maps)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@vnedyalk0v/react19-simple-maps?color=%2328cb95&label=gzip)](https://bundlephobia.com/package/@vnedyalk0v/react19-simple-maps)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19%20Ready-61dafb.svg)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/vnedyalk0v/react19-simple-maps/actions/workflows/ci.yml/badge.svg?branch=dev&event=push)](https://github.com/vnedyalk0v/react19-simple-maps/actions/workflows/ci.yml)

Create interactive SVG maps in React with d3-geo and topojson using a TypeScript-first API for React 19+.

> Modernized fork of [react-simple-maps](https://github.com/zcreativelabs/react-simple-maps) with React 19 support and TypeScript-first tooling.

## Why this package?

- Built specifically for **React 19+** instead of preserving compatibility with older React release lines.
- Ships as a **modern ESM-only library** with explicit exports, tree-shakeable output, and TypeScript definitions.
- Provides a **TypeScript-first API** with branded coordinate helpers that reduce common map-coordinate mistakes.
- Includes **safer URL-based geography loading** with validation, HTTPS-first defaults, response-size checks, and optional SRI helpers.

## Key Features

- React 19+ only (peer dependencies)
- ESM-only build with tree-shaking and type definitions
- TypeScript-first API with branded coordinate helpers
- Core components: ComposableMap, Geographies, Geography, ZoomableGroup, Marker, Annotation, Line, Sphere, Graticule
- Optional error boundary + Suspense fallback for geography loading
- Geography fetching utilities with validation (HTTPS-only default, private IP blocking, content-type/size checks) and optional SRI helpers
- Opt-in debug logging via `debug` prop or `REACT_SIMPLE_MAPS_DEBUG`

## Quick Links

- [npm Package](https://www.npmjs.com/package/@vnedyalk0v/react19-simple-maps)
- [Examples](./examples/)
- [Support Policy](./docs/support.md)
- [CI/CD Architecture](./docs/ci-cd.md)
- [Changelog](./CHANGELOG.md)
- [Issues](https://github.com/vnedyalk0v/react19-simple-maps/issues)
- [Discussions](https://github.com/vnedyalk0v/react19-simple-maps/discussions)

## Installation

### From npm Registry (Recommended)

```bash
# npm
npm install @vnedyalk0v/react19-simple-maps

# yarn
yarn add @vnedyalk0v/react19-simple-maps

# pnpm
pnpm add @vnedyalk0v/react19-simple-maps
```

> **ESM-only:** This package only supports `import` syntax. `require(...)` is not supported.

### Requirements

- **React**: 19.0.0 or higher (peer dependency)
- **React DOM**: 19.0.0 or higher (peer dependency)
- **Node.js**: 20.19.0 or higher (development/build)
- **TypeScript**: 5.0.0 or higher (recommended)

For support expectations, compatibility boundaries, and release behavior, see the [Support Policy](./docs/support.md).

## Utilities Subpath

You can import helper utilities directly from the `./utils` subpath:

```tsx
import {
  validateGeographyUrl,
  configureSRI,
} from '@vnedyalk0v/react19-simple-maps/utils';
```

The `./utils` entry includes both recommended helpers and more advanced low-level utilities. Prefer the documented helpers below unless you have a specific integration need.

### Recommended `./utils` helpers

For most applications, start with these helpers:

- Geography loading and preparation: `fetchGeographiesCache`, `preloadGeography`, `getFeatures`, `getMesh`, `prepareFeatures`, `prepareMesh`, `createConnectorPath`
- Validation and security: `validateGeographyUrl`, `validateGeographyData`, `configureGeographySecurity`, `enableDevelopmentMode`
- Integrity helpers: `configureSRI`, `enableStrictSRI`, `disableSRI`, `addCustomSRI`, `getSRIForUrl`, `validateSRI`
- Data guards: `isTopology`, `isFeatureCollection`, `isFeature`, `isValidGeographyUrl`, `isValidGeographyData`

## Migration Notes (from react-simple-maps)

1. Replace package + import path: `react-simple-maps` → `@vnedyalk0v/react19-simple-maps`.
2. For TypeScript, use branded helpers like `createCoordinates()` (or an explicit cast) for `Coordinates`.
3. Geography event handlers receive `(event, data)` where `data` includes geography info (centroid, bounds, etc.).

## Quick Start

```tsx
import React from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  createCoordinates,
} from '@vnedyalk0v/react19-simple-maps';

const geoUrl = 'https://unpkg.com/world-atlas@2.0.2/countries-110m.json';

const MapChart = () => {
  return (
    <ComposableMap
      projection="geoEqualEarth"
      projectionConfig={{
        scale: 147,
        center: createCoordinates(0, 0),
      }}
      width={800}
      height={500}
    >
      <Geographies geography={geoUrl}>
        {({ geographies }) =>
          geographies.map((geo) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              style={{
                default: { fill: '#D6D6DA', outline: 'none' },
                hover: { fill: '#F53', outline: 'none' },
                pressed: { fill: '#E42', outline: 'none' },
              }}
            />
          ))
        }
      </Geographies>
    </ComposableMap>
  );
};

export default MapChart;
```

## Core Components

### ComposableMap

The main wrapper component that provides SVG context and projection setup.

**Common props:**

- `projection` - Map projection (string name or d3-geo projection function)
- `projectionConfig` - Configuration for built-in projections
- `width`, `height` - SVG dimensions
- `className` - CSS class name
- `debug` - Enable opt-in debug logging (default: `false`)

### Geographies

Renders geographic features from TopoJSON or GeoJSON data.

**Notable props:**

- `geography` - URL string, TopoJSON object, or GeoJSON FeatureCollection
- `parseGeographies` - Optional function to transform geography data
- `errorBoundary` - Enable built-in error boundary and Suspense fallback
- `onGeographyError`, `fallback` - Error handling hooks when `errorBoundary` is enabled

### Geography

Individual geographic feature component with enhanced event handlers.

All event handlers receive `(event, GeographyEventData)` where `GeographyEventData` includes:
`geography`, `centroid`, `bounds`, and `coordinates`.

### ZoomableGroup

Zoom and pan with both simple and advanced APIs.

```tsx
import {
  ZoomableGroup,
  createZoomConfig,
} from '@vnedyalk0v/react19-simple-maps';

<ZoomableGroup
  zoom={1}
  center={createCoordinates(0, 0)}
  {...createZoomConfig(0.5, 8)}
>
  {/* Content */}
</ZoomableGroup>;
```

### Marker & Annotation

Use `Marker` for custom points and `Annotation` for callouts.

### Additional Components

- `Line` - Draw lines between coordinates
- `Graticule` - Add coordinate grid lines
- `Sphere` - Add map outline/background
- `GeographyErrorBoundary` - Explicit error boundary wrapper
- `MapWithMetadata` - Wrapper that renders metadata and a `ComposableMap`

## TypeScript Support

Branded types help prevent coordinate mistakes:

```tsx
import {
  createCoordinates,
  createLongitude,
  createLatitude,
} from '@vnedyalk0v/react19-simple-maps';

const lon = createLongitude(-74.006);
const lat = createLatitude(40.7128);
const coords = createCoordinates(-74.006, 40.7128);
```

## Geography Utilities

Extract geographic data for interactions and labels:

```tsx
import {
  getGeographyCentroid,
  getGeographyBounds,
  getBestGeographyCoordinates,
} from '@vnedyalk0v/react19-simple-maps';
```

## Map Data Sources

- [Natural Earth](https://github.com/nvkelso/natural-earth-vector)
- [TopoJSON Collection](https://github.com/deldersveld/topojson)
- [World Atlas](https://github.com/topojson/world-atlas)
- [US Atlas](https://github.com/topojson/us-atlas)

## Security Utilities

The `./utils` subpath includes helpers for safer geography fetching. When you use URL-based geography data in `Geographies`, the internal fetch path applies URL validation, HTTPS-only defaults, resolved-hostname checks in server environments, response size checks, and optional SRI validation.

Prefer `fetchGeographiesCache` for direct utility-based loading. `fetchGeographies` remains available for compatibility but is deprecated.

```tsx
import {
  configureGeographySecurity,
  enableDevelopmentMode,
} from '@vnedyalk0v/react19-simple-maps/utils';

configureGeographySecurity({
  TIMEOUT_MS: 5000,
  MAX_RESPONSE_SIZE: 10 * 1024 * 1024,
});

if (process.env.NODE_ENV === 'development') {
  enableDevelopmentMode(true); // allow HTTP localhost
}
```

In production, the fetch path keeps HTTPS-only protections enabled and does not disable integrity checks for known geography sources.

## Debugging

Enable debug logging globally via environment variable or per map:

```bash
REACT_SIMPLE_MAPS_DEBUG=true
```

```tsx
<ComposableMap debug={true}>{/* Map content */}</ComposableMap>
```

## Development

```bash
npm install
npm run dev
npm run build
npm run test
npm run type-check
npm run lint
```

## Publishing

Changesets is configured for versioning, release pull requests, and npm publishing. The GitHub Actions workflow in `.github/workflows/publish.yml` opens or updates a release PR when unreleased changesets exist, validates the required checks for that release PR, and publishes to npm when a validated release is merged to `main` with the required token configured.

## License

MIT licensed. Original work Copyright (c) Richard Zimerman 2017.
Fork maintenance Copyright (c) Georgi Nedyalkov 2025.
See [LICENSE](./LICENSE) for details.
