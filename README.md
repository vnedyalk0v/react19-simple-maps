# @vnedyalk0v/react19-simple-maps

[![npm version](https://img.shields.io/npm/v/@vnedyalk0v/react19-simple-maps.svg)](https://www.npmjs.com/package/@vnedyalk0v/react19-simple-maps)
[![GitHub Package Registry](https://img.shields.io/badge/GitHub%20Packages-Available-blue.svg)](https://github.com/vnedyalk0v/react19-simple-maps/packages)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@vnedyalk0v/react19-simple-maps?color=%2328cb95&label=gzip)](https://bundlephobia.com/package/@vnedyalk0v/react19-simple-maps)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19%20Ready-61dafb.svg)](https://reactjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/vnedyalk0v/react19-simple-maps/actions/workflows/ci.yml/badge.svg)](https://github.com/vnedyalk0v/react19-simple-maps/actions/workflows/ci.yml)

Create beautiful, interactive SVG maps in React with d3-geo and topojson using a declarative, TypeScript-first API built exclusively for React 19+.

> **🍴 This is a modernized fork** of the original [react-simple-maps](https://github.com/zcreativelabs/react-simple-maps) by Richard Zimerman, completely rewritten with full TypeScript support, React 19 compatibility, and modern development practices by [Georgi Nedyalkov](mailto:vnedyalk0v@proton.me).

## ✨ Key Features

- 🔒 **Zero Security Vulnerabilities** - Completely secure dependencies with built-in security features
- 📝 **Full TypeScript Support** - Strict typing with comprehensive type definitions and branded types
- ⚛️ **React 19+ Exclusive** - Built exclusively for React 19+ with cutting-edge features and patterns
- 🚀 **Modern Build System** - ESM-only build with tree-shaking and type definitions
- 🧪 **Comprehensive Testing** - 100% test coverage with 159 tests using Vitest
- 📦 **Optimized Bundle** - Smaller bundle size with better performance than alternatives
- 🛡️ **Enterprise Security** - Built-in SRI validation, HTTPS enforcement, and content validation
- 🎯 **Developer Experience** - Excellent IntelliSense, error boundaries, and debugging support

## 📋 Quick Links

- 📦 [npm Package](https://www.npmjs.com/package/@vnedyalk0v/react19-simple-maps) - Primary distribution
- 📦 [GitHub Packages](https://github.com/vnedyalk0v/react19-simple-maps/packages) - Also available
- 📚 [Live Examples](./examples/) - Interactive demos with source code
- 📝 [**Changelog**](https://github.com/vnedyalk0v/react19-simple-maps/blob/main/CHANGELOG.md) - See what's new!
- 🐛 [Issues](https://github.com/vnedyalk0v/react19-simple-maps/issues) - Report bugs or request features
- 💬 [Discussions](https://github.com/vnedyalk0v/react19-simple-maps/discussions) - Community support and ideas

## Why @vnedyalk0v/react19-simple-maps?

`@vnedyalk0v/react19-simple-maps` makes working with SVG maps in React effortless. It handles complex tasks like panning, zooming, projections, and rendering optimization while leveraging the power of [d3-geo](https://github.com/d3/d3-geo) and topojson-client without requiring the entire d3 library.

Since the library leaves DOM work to React, it integrates seamlessly with other React libraries like [react-spring](https://github.com/react-spring/react-spring) for animations and [react-annotation](https://github.com/susielu/react-annotation/) for enhanced annotations.

**Why Choose This Package:**

- 🎯 **Declarative API** - Build complex maps with simple React components
- 🔧 **TypeScript First** - Full type safety with branded types and comprehensive IntelliSense
- 🎨 **Highly Customizable** - Style with CSS-in-JS, regular CSS, or styled-components
- 📱 **Touch & Mobile Ready** - Built-in pan, zoom, and touch interactions
- 🌍 **Universal Map Data** - Works with any valid TopoJSON, GeoJSON, or custom data
- ⚡ **Performance Optimized** - Efficient rendering, updates, and memory management
- 🛡️ **Enterprise Security** - Built-in security features for production applications
- 🔄 **React 19 Native** - Leverages latest React features like the `use` API and enhanced error boundaries

## 📦 Installation

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

### From GitHub Packages (Alternative)

```bash
# Configure npm to use GitHub Packages for @vnedyalk0v scope
echo "@vnedyalk0v:registry=https://npm.pkg.github.com" >> ~/.npmrc

# Install from GitHub Packages
npm install @vnedyalk0v/react19-simple-maps
```

### Requirements

- **React**: 19.0.0 or higher (React 19+ exclusive - no backward compatibility)
- **TypeScript**: 5.0.0 or higher (strongly recommended for best developer experience)
- **Node.js**: 18.0.0 or higher (for development and build tools)

### Utilities Subpath

You can import utility helpers directly from the `./utils` subpath:

```tsx
import {
  validateGeographyUrl,
  configureSRI,
} from '@vnedyalk0v/react19-simple-maps/utils';
```

## 🔄 Migration from react-simple-maps

Migrating from the original `react-simple-maps`? We've got you covered!

**Quick Migration:**

1. `npm uninstall react-simple-maps && npm install @vnedyalk0v/react19-simple-maps`
2. Update imports: `from "react-simple-maps"` → `from "@vnedyalk0v/react19-simple-maps"`
3. Convert coordinates: `[lon, lat]` → `createCoordinates(lon, lat)`
4. Update event handlers to use enhanced data parameter

**📖 [Complete Migration Guide](./docs/MIGRATION.md)** - Detailed step-by-step instructions, breaking changes, and troubleshooting tips.

### Peer Dependencies

The package automatically includes these dependencies:

- `d3-geo` ^3.1.0 - Geographic projections and utilities
- `d3-zoom` ^3.0.0 - Zoom and pan behavior
- `d3-selection` ^3.0.0 - DOM selection utilities
- `d3-color` ^3.1.0 - Color manipulation
- `d3-interpolate` ^3.0.1 - Value interpolation
- `topojson-client` ^3.1.0 - TopoJSON parsing and processing

## 🚀 Quick Start

`react19-simple-maps` provides a set of composable React components for creating interactive SVG maps. You can combine these components to build everything from simple world maps to complex interactive visualizations.

### Basic World Map (JavaScript)

```jsx
import React from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
} from '@vnedyalk0v/react19-simple-maps';

// URL to a valid TopoJSON file
const geoUrl = 'https://unpkg.com/world-atlas@2/countries-110m.json';

const MapChart = () => {
  return (
    <ComposableMap
      projection="geoEqualEarth"
      projectionConfig={{
        scale: 147,
        center: [0, 0],
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

### Interactive Map with TypeScript

```tsx
import React, { useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
  createCoordinates,
  createScaleExtent,
  createTranslateExtent,
} from '@vnedyalk0v/react19-simple-maps';
import type { Feature, Geometry } from 'geojson';

const geoUrl = 'https://unpkg.com/world-atlas@2/countries-50m.json';

const InteractiveMap: React.FC = () => {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const handleGeographyClick = (geography: Feature<Geometry>) => {
    const countryName = geography.properties?.name || 'Unknown';
    setSelectedCountry(countryName);
  };

  return (
    <div>
      {selectedCountry && <p>Selected: {selectedCountry}</p>}

      <ComposableMap projection="geoEqualEarth" width={800} height={500}>
        <ZoomableGroup
          zoom={1}
          center={createCoordinates(0, 0)}
          minZoom={0.5}
          maxZoom={8}
          scaleExtent={createScaleExtent(0.5, 8)}
          translateExtent={createTranslateExtent(
            createCoordinates(-2000, -1000),
            createCoordinates(2000, 1000),
          )}
        >
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => handleGeographyClick(geo)}
                  style={{
                    default: {
                      fill:
                        selectedCountry === geo.properties?.name
                          ? '#1976d2'
                          : '#D6D6DA',
                      outline: 'none',
                      stroke: '#FFFFFF',
                      strokeWidth: 0.5,
                    },
                    hover: { fill: '#F53', cursor: 'pointer' },
                    pressed: { fill: '#E42' },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Add a marker for New York */}
          <Marker coordinates={createCoordinates(-74.006, 40.7128)}>
            <circle r={5} fill="#F53" stroke="#fff" strokeWidth={2} />
            <text
              textAnchor="middle"
              y={-10}
              style={{ fontSize: '12px', fill: '#333' }}
            >
              New York
            </text>
          </Marker>
        </ZoomableGroup>
      </ComposableMap>
    </div>
  );
};

export default InteractiveMap;
```

### 🎯 Live Examples

Check out our comprehensive examples in the [`examples/`](./examples/) directory:

- **[Basic Map](./examples/basic-map/)** - Simple world map with click interactions
- **[Interactive Map](./examples/interactive-map/)** - Advanced features with zoom, pan, and markers

The examples use the [Equal Earth projection](https://observablehq.com/@d3/equal-earth), which provides an accurate representation of land areas. Learn more about this projection on [Shaded Relief](http://shadedrelief.com/ee_proj/) and [Wikipedia](https://en.wikipedia.org/wiki/Equal_Earth_projection).

## 🧩 Core Components

### ComposableMap

The main wrapper component that provides the SVG context and projection system.

**Props:**

- `projection` - Map projection (string name or d3-geo projection function)
- `projectionConfig` - Configuration for built-in projections
- `width`, `height` - SVG dimensions
- `className` - CSS class name
- `debug` - Enable debug logging (default: false, opt-in only)
- `metadata` - Optional metadata for SEO and accessibility

```tsx
import {
  ComposableMap,
  createCoordinates,
} from '@vnedyalk0v/react19-simple-maps';

<ComposableMap
  projection="geoEqualEarth"
  projectionConfig={{
    scale: 147,
    center: createCoordinates(0, 0),
    rotate: [0, 0, 0],
  }}
  width={800}
  height={600}
  className="my-map"
>
  {/* Map content */}
</ComposableMap>;
```

### Geographies

Renders geographic features from TopoJSON or GeoJSON data with built-in error handling.

**Props:**

- `geography` - URL string, TopoJSON object, or GeoJSON FeatureCollection
- `parseGeographies` - Optional function to transform geography data
- `className` - CSS class name

```tsx
import { Geographies, Geography } from '@vnedyalk0v/react19-simple-maps';

<Geographies geography="https://unpkg.com/world-atlas@2/countries-110m.json">
  {({ geographies, outline, borders }) =>
    geographies.map((geo) => (
      <Geography
        key={geo.rsmKey}
        geography={geo}
        onClick={(event) => console.log('Clicked:', geo.properties?.name)}
        onMouseEnter={(event) => console.log('Hover:', geo.properties?.name)}
      />
    ))
  }
</Geographies>;
```

### Geography

Individual geographic feature component with enhanced interaction support.

**Enhanced Event Handlers:**

All event handlers now receive geographic data as a second parameter:

```tsx
<Geography
  geography={geo}
  onClick={(event, data) => {
    console.log('Country:', data.geography.properties?.name);
    console.log('Centroid:', data.centroid);
    console.log('Bounds:', data.bounds);
    console.log('Coordinates:', data.coordinates);
  }}
  onMouseEnter={(event, data) => {
    // Access to rich geographic data
  }}
/>
```

**Props:**

- `geography` - GeoJSON feature object
- `style` - Conditional styling object with `default`, `hover`, `pressed` states
- Enhanced event handlers: `onClick`, `onMouseEnter`, `onMouseLeave`, `onFocus`, `onBlur`
  - All handlers receive `(event, GeographyEventData)` parameters

### ZoomableGroup

Provides zoom and pan functionality with configurable constraints. Supports both simple and advanced APIs.

**Simple API (Recommended):**

```tsx
import { ZoomableGroup, createZoomConfig, createPanConfig } from '@vnedyalk0v/react19-simple-maps';

// Easy zoom configuration
<ZoomableGroup
  zoom={1}
  center={createCoordinates(0, 0)}
  {...createZoomConfig(0.5, 8)} // minZoom, maxZoom
>
  {/* Content */}
</ZoomableGroup>

// Or use direct props
<ZoomableGroup
  zoom={1}
  center={createCoordinates(0, 0)}
  minZoom={0.5}
  maxZoom={8}
  enableZoom={true}
>
  {/* Content */}
</ZoomableGroup>
```

**Props:**

- `zoom` - Current zoom level
- `center` - Center coordinates
- `minZoom`, `maxZoom` - Zoom level constraints (simple API)
- `enableZoom`, `enablePan` - Enable/disable behaviors (simple API)
- `scaleExtent` - Alternative to minZoom/maxZoom using branded types
- `translateExtent` - Pan boundaries
- `filterZoomEvent` - Custom zoom event filtering
- `onMoveStart`, `onMove`, `onMoveEnd` - Movement event handlers

```tsx
import {
  ZoomableGroup,
  createCoordinates,
  createScaleExtent,
  createTranslateExtent,
} from '@vnedyalk0v/react19-simple-maps';

// Approach 1: Using enableZoom/enablePan with explicit constraints
<ZoomableGroup
  zoom={1}
  center={createCoordinates(0, 0)}
  enableZoom={true}
  minZoom={0.5}
  maxZoom={8}
  scaleExtent={createScaleExtent(0.5, 8)}
  enablePan={true}
  translateExtent={createTranslateExtent(
    createCoordinates(-1000, -500),
    createCoordinates(1000, 500),
  )}
  onMoveEnd={(position) => console.log('New position:', position)}
>
  {/* Zoomable content */}
</ZoomableGroup>

// Approach 2: Simplified with just constraints
<ZoomableGroup
  zoom={1}
  center={createCoordinates(0, 0)}
  minZoom={0.5}
  maxZoom={8}
  translateExtent={createTranslateExtent(
    createCoordinates(-1000, -500),
    createCoordinates(1000, 500),
  )}
>
  {/* Zoomable content */}
</ZoomableGroup>;
```

### Marker

Add custom markers to specific coordinates on your map.

**Props:**

- `coordinates` - Geographic coordinates using branded types
- `className` - CSS class name
- Event handlers: `onClick`, `onMouseEnter`, `onMouseLeave`, `onFocus`, `onBlur`

```tsx
import { Marker, createCoordinates } from '@vnedyalk0v/react19-simple-maps';

<Marker coordinates={createCoordinates(-74.006, 40.7128)}>
  <circle r={5} fill="#F53" stroke="#fff" strokeWidth={2} />
  <text textAnchor="middle" y={-10} style={{ fontSize: '12px' }}>
    New York
  </text>
</Marker>;
```

### Annotation

Create annotations with connector lines pointing to specific locations.

**Props:**

- `subject` - Target coordinates
- `dx`, `dy` - Offset from subject
- `curve` - Connector curve amount
- `connectorProps` - SVG props for the connector line

```tsx
import { Annotation, createCoordinates } from '@vnedyalk0v/react19-simple-maps';

<Annotation
  subject={createCoordinates(-74.006, 40.7128)}
  dx={-90}
  dy={-30}
  connectorProps={{
    stroke: '#FF5533',
    strokeWidth: 2,
    strokeLinecap: 'round',
  }}
>
  <text textAnchor="end" alignmentBaseline="middle" fill="#F53">
    New York City
  </text>
</Annotation>;
```

### Additional Components

- **`Line`** - Draw lines between coordinates
- **`Graticule`** - Add coordinate grid lines
- **`Sphere`** - Add map outline/background
- **`GeographyErrorBoundary`** - React 19 error boundary for geography loading

## 📝 TypeScript Support

The package includes comprehensive TypeScript definitions with strict typing and branded types for enhanced type safety.

### Branded Types for Coordinates

```tsx
import {
  createCoordinates,
  createLongitude,
  createLatitude,
  createScaleExtent,
  createTranslateExtent,
} from '@vnedyalk0v/react19-simple-maps';

// Branded types prevent coordinate mistakes
const longitude = createLongitude(-74.006); // Type: Longitude
const latitude = createLatitude(40.7128); // Type: Latitude
const coordinates = createCoordinates(-74.006, 40.7128); // Type: Coordinates

// Scale and translate extents
const scaleExtent = createScaleExtent(0.5, 8);
const translateExtent = createTranslateExtent(
  createCoordinates(-1000, -500),
  createCoordinates(1000, 500),
);
```

### Geography Utilities

Extract geographic data from features for enhanced interactions:

```tsx
import {
  getGeographyCentroid,
  getGeographyBounds,
  getBestGeographyCoordinates,
  isValidCoordinates,
} from '@vnedyalk0v/react19-simple-maps';

// Extract centroid for map centering
const centroid = getGeographyCentroid(geography);
if (centroid) {
  setMapCenter(centroid);
}

// Get bounding box for zoom-to-fit
const bounds = getGeographyBounds(geography);
if (bounds) {
  const [southwest, northeast] = bounds;
  // Use bounds for map fitting
}

// Get best available coordinates
const coords = getBestGeographyCoordinates(geography);
```

### Component Props and Event Handlers

```tsx
import type {
  ComposableMapProps,
  GeographyProps,
  GeographyEventData,
  MarkerProps,
  ProjectionConfig,
  Position,
  SimpleZoomableGroupProps,
} from '@vnedyalk0v/react19-simple-maps';
import type { Feature, Geometry } from 'geojson';

// Typed projection configuration
const projectionConfig: ProjectionConfig = {
  scale: 147,
  center: createCoordinates(0, 0),
  rotate: [0, 0, 0],
};

// Enhanced event handlers with geographic data
const handleGeographyClick = (
  event: React.MouseEvent,
  data: GeographyEventData,
) => {
  console.log('Country:', data.geography.properties?.name);
  console.log('Centroid:', data.centroid);
  if (data.centroid) {
    setMapCenter(data.centroid);
  }
};

const handleZoomEnd = (position: Position) => {
  console.log('New position:', position.coordinates, 'Zoom:', position.zoom);
};
```

## 🗺️ Map Data Sources

The library works with any valid TopoJSON or GeoJSON data, giving you complete flexibility in map visualization.

### Recommended Data Sources

- 🌍 **[Natural Earth](https://github.com/nvkelso/natural-earth-vector)** - High-quality public domain map data at multiple scales
- 🗺️ **[TopoJSON Collection](https://github.com/deldersveld/topojson)** - Ready-to-use TopoJSON files for various regions
- 🌐 **[World Atlas](https://github.com/topojson/world-atlas)** - Comprehensive world and country boundaries
- 📊 **[World Bank Data](https://datahelpdesk.worldbank.org/knowledgebase/articles/902061)** - Official administrative boundaries
- 🏛️ **[US Atlas](https://github.com/topojson/us-atlas)** - Detailed US states, counties, and congressional districts

### Popular Geography URLs

```tsx
// World maps
const worldCountries = 'https://unpkg.com/world-atlas@2/countries-110m.json';
const worldCountriesDetailed = 'https://unpkg.com/world-atlas@2/countries-50m.json';

// US maps
const usStates = 'https://unpkg.com/us-atlas@3/states-10m.json';
const usCounties = 'https://unpkg.com/us-atlas@3/counties-10m.json';

// Usage
<Geographies geography={worldCountries}>
  {({ geographies }) => /* render countries */}
</Geographies>
```

### Creating Custom Maps

To create your own TopoJSON maps from shapefiles:

1. **[GDAL/OGR](https://gdal.org/)** - Convert shapefiles to GeoJSON
2. **[TopoJSON CLI](https://github.com/topojson/topojson)** - Convert GeoJSON to TopoJSON
3. **[Mapshaper](https://mapshaper.org/)** - Simplify and optimize map data

**Tutorial:** ["How to convert and prepare TopoJSON files for interactive mapping with d3"](https://hackernoon.com/how-to-convert-and-prepare-topojson-files-for-interactive-mapping-with-d3-499cf0ced5f)

## 🚀 Advanced Features

### Built-in Projections

The library supports all major d3-geo projections out of the box:

```tsx
// Popular projections
<ComposableMap projection="geoEqualEarth" />      // Equal area, good for world maps
<ComposableMap projection="geoMercator" />        // Web maps standard
<ComposableMap projection="geoNaturalEarth1" />   // Compromise projection
<ComposableMap projection="geoAlbersUsa" />       // US-specific projection
<ComposableMap projection="geoOrthographic" />    // Globe view
```

### Custom Projections

Use any d3-geo projection or create your own:

```tsx
import { geoMercator, geoConicEqualArea } from 'd3-geo';

// Custom Mercator
const customMercator = geoMercator()
  .scale(100)
  .translate([400, 300])
  .rotate([-11, 0]);

// Custom conic projection for specific regions
const customConic = geoConicEqualArea()
  .parallels([29.5, 45.5])
  .scale(1000)
  .translate([480, 250])
  .rotate([96, 0]);

<ComposableMap projection={customMercator}>{/* Map content */}</ComposableMap>;
```

### Advanced Zoom and Pan

```tsx
import {
  ZoomableGroup,
  createCoordinates,
  createTranslateExtent,
} from '@vnedyalk0v/react19-simple-maps';

<ZoomableGroup
  zoom={2}
  center={createCoordinates(-100, 40)}
  minZoom={0.5}
  maxZoom={10}
  translateExtent={createTranslateExtent(
    createCoordinates(-2000, -1000),
    createCoordinates(2000, 1000),
  )}
  filterZoomEvent={(event) => !event.ctrlKey} // Disable zoom with Ctrl
  onMoveStart={(position, event) => console.log('Move started')}
  onMove={(position, event) => console.log('Moving:', position)}
  onMoveEnd={(position, event) => console.log('Move ended:', position)}
>
  {/* Zoomable content */}
</ZoomableGroup>;
```

## 🛡️ Enterprise Security Features

The library includes comprehensive security features designed for production applications.

### Geography Data Security

```tsx
import {
  configureGeographySecurity,
  enableDevelopmentMode,
  DEFAULT_GEOGRAPHY_FETCH_CONFIG,
} from '@vnedyalk0v/react19-simple-maps/utils';

// Default: Strict HTTPS-only mode (recommended for production)
// No configuration needed - secure by default

// For development with local geography files:
if (process.env.NODE_ENV === 'development') {
  enableDevelopmentMode(true); // Allows HTTP localhost
}

// Custom security configuration:
configureGeographySecurity({
  STRICT_HTTPS_ONLY: true, // Force HTTPS only
  ALLOW_HTTP_LOCALHOST: false, // Disable HTTP localhost
  TIMEOUT_MS: 5000, // 5 second timeout
  MAX_RESPONSE_SIZE: 10 * 1024 * 1024, // 10MB max
  ALLOWED_CONTENT_TYPES: [
    // Restrict content types
    'application/json',
    'application/geo+json',
  ],
});
```

### Built-in Security Features

- 🔒 **HTTPS-only by default** - Prevents man-in-the-middle attacks
- 🚫 **Private IP blocking** - Prevents SSRF attacks
- ⏱️ **Request timeout protection** - Prevents hanging requests
- 📏 **Response size limits** - Prevents memory exhaustion
- 🛡️ **Content-Type validation** - Ensures valid geography data
- 🏠 **Configurable localhost access** - Safe development mode
- 🔐 **Subresource Integrity (SRI)** - Tamper-proof external resources
- 🛡️ **URL validation** - Prevents malicious URLs

### Subresource Integrity (SRI)

Protect against tampered external resources with built-in SRI validation:

```tsx
import {
  configureSRI,
  enableStrictSRI,
  addCustomSRI,
  generateSRIHash,
  generateSRIForUrls,
} from '@vnedyalk0v/react19-simple-maps/utils';

// Enable strict SRI for all external resources
enableStrictSRI();

// Add custom SRI for your geography data
addCustomSRI('https://your-domain.com/data.json', {
  algorithm: 'sha384',
  hash: 'sha384-your-calculated-hash',
  enforceIntegrity: true,
});

// Generate SRI hash for a URL (development utility)
const hash = await generateSRIHash('https://example.com/data.json');
console.log('SRI Hash:', hash);

// Batch generate SRI for multiple URLs
const sriMap = await generateSRIForUrls([
  'https://unpkg.com/world-atlas@2/countries-110m.json',
  'https://unpkg.com/us-atlas@3/states-10m.json',
]);
```

### React 19 Error Boundaries

Built-in error boundaries for robust geography loading:

```tsx
import { GeographyErrorBoundary } from '@vnedyalk0v/react19-simple-maps';

<GeographyErrorBoundary
  fallback={(error, retry) => (
    <div>
      <p>Failed to load map: {error.message}</p>
      <button onClick={retry}>Retry</button>
    </div>
  )}
  onError={(error) => console.error('Geography error:', error)}
>
  <Geographies geography="https://example.com/map.json">
    {({ geographies }) => /* render geographies */}
  </Geographies>
</GeographyErrorBoundary>
```

## 🎨 Styling and Customization

### CSS-in-JS Styling

```tsx
const geographyStyle = {
  default: {
    fill: '#D6D6DA',
    outline: 'none',
    stroke: '#FFFFFF',
    strokeWidth: 0.5,
  },
  hover: {
    fill: '#F53',
    outline: 'none',
    cursor: 'pointer',
  },
  pressed: {
    fill: '#E42',
    outline: 'none',
  },
};

<Geography geography={geo} style={geographyStyle} />;
```

### Conditional Styling

```tsx
const getCountryStyle = (
  countryName: string,
  selectedCountry: string | null,
) => ({
  default: {
    fill: selectedCountry === countryName ? '#1976d2' : '#D6D6DA',
    outline: 'none',
    stroke: '#FFFFFF',
    strokeWidth: 0.5,
  },
  hover: {
    fill: selectedCountry === countryName ? '#1565c0' : '#F53',
    cursor: 'pointer',
  },
});

<Geography
  geography={geo}
  style={getCountryStyle(geo.properties?.name, selectedCountry)}
/>;
```

### CSS Classes

```tsx
// Use CSS classes for styling
<ComposableMap className="world-map">
  <Geographies geography={geoUrl} className="countries">
    {({ geographies }) =>
      geographies.map((geo) => (
        <Geography
          key={geo.rsmKey}
          geography={geo}
          className={`country country-${geo.properties?.iso_a2?.toLowerCase()}`}
        />
      ))
    }
  </Geographies>
</ComposableMap>
```

## 🔄 Migration from react-simple-maps

This is a complete rewrite focused exclusively on React 19+. **No backward compatibility** with React 18 or earlier versions.

### Key Differences

- **React 19+ Exclusive**: No support for React 18 or earlier
- **Full TypeScript rewrite** with strict typing and zero `any` types
- **React 19 features**: `use` API, enhanced error boundaries, improved Suspense
- **Modern build system**: ESM-only with tree-shaking and source maps
- **Updated dependencies**: Latest D3 versions with security fixes
- **Performance improvements**: Smaller bundle size and better rendering
- **Enhanced security**: Built-in SRI, HTTPS enforcement, and validation
- **Branded types**: Type-safe coordinates and configuration objects

### Migration Steps

1. **Upgrade React**: Ensure you're using React 19.0.0+
2. **Install package**: `npm install @vnedyalk0v/react19-simple-maps`
3. **Update imports**: Change import paths to the new package
4. **Use branded types**: Replace coordinate arrays with `createCoordinates()`
5. **Add error boundaries**: Wrap geography components for better error handling
6. **Update TypeScript**: Use the new comprehensive type definitions

## 🐛 Debugging

The library provides opt-in debugging capabilities to help with development and troubleshooting.

### Debug Mode

By default, the library is **quiet** and produces no console output. You can enable debugging in two ways:

**1. Environment Variable (Global)**

```bash
# Enable debug mode for all maps
REACT_SIMPLE_MAPS_DEBUG=true npm start

# Or in your .env file
REACT_SIMPLE_MAPS_DEBUG=true
```

**2. Component Prop (Per Map)**

```tsx
<ComposableMap debug={true}>{/* Map content */}</ComposableMap>
```

### Debug Output

When enabled, debug mode provides:

- **Component render information** with React 19 Owner Stack
- **Performance metrics** for render times
- **Error context** with detailed stack traces
- **Props and state logging** for troubleshooting

```tsx
// Example debug output in console:
// 🗺️ ComposableMap Render
//   Owner Stack: ComposableMap <- App <- Router
//   Props: { width: 800, height: 600, projection: "geoEqualEarth" }
```

### Best Practices

- **Production**: Always keep debug disabled (`debug={false}` or omit the prop)
- **Development**: Enable only when needed for troubleshooting
- **CI/CD**: Set `REACT_SIMPLE_MAPS_DEBUG=false` in production environments

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/vnedyalk0v/react19-simple-maps.git
cd react19-simple-maps

# Install dependencies
npm install

# Start development with watch mode
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint

# Build the package
npm run build
```

### Development Scripts

- `npm run dev` - Start development with watch mode
- `npm run build` - Build ESM output and type definitions
- `npm run test` - Run test suite with Vitest
- `npm run test:watch` - Run tests in watch mode
- `npm run test:ui` - Run tests with UI interface
- `npm run type-check` - TypeScript type checking
- `npm run lint` - ESLint code linting
- `npm run format` - Format code with Prettier
- `npm run analyze` - Bundle size analysis

### Publishing

The package uses [Changesets](https://github.com/changesets/changesets) for version management and automated publishing:

- **npm Registry**: Published on main branch merges
- **GitHub Packages**: Also published to GitHub Package Registry
- **Changelog**: Automatically generated from changesets

## 📄 License

MIT licensed. Original work Copyright (c) Richard Zimerman 2017. Fork enhancements Copyright (c) Georgi Nedyalkov 2025. See [LICENSE](./LICENSE) for more details.

## 🔗 Links & Resources

### Package Distribution

- 📦 **[npm Package](https://www.npmjs.com/package/@vnedyalk0v/react19-simple-maps)** - Primary distribution
- 📦 **[GitHub Packages](https://github.com/vnedyalk0v/react19-simple-maps/packages)** - Also available
- 📊 **[Bundle Analysis](https://bundlephobia.com/package/@vnedyalk0v/react19-simple-maps)** - Size and dependencies

### Documentation & Examples

- 📚 **[Live Examples](./examples/)** - Interactive demos with source code
- 📝 **[Changelog](https://github.com/vnedyalk0v/react19-simple-maps/blob/main/CHANGELOG.md)** - Version history and updates
- 🔒 **[Security Guide](./examples/SECURITY.md)** - Security configuration details

### Community & Support

- 🐛 **[Issues](https://github.com/vnedyalk0v/react19-simple-maps/issues)** - Bug reports and feature requests
- 💬 **[Discussions](https://github.com/vnedyalk0v/react19-simple-maps/discussions)** - Community support and ideas
- 📧 **[Maintainer](mailto:vnedyalk0v@proton.me)** - Direct contact

### Original Project

- 🍴 **[Original react-simple-maps](https://github.com/zcreativelabs/react-simple-maps)** - By Richard Zimerman
- 📖 **[Original Documentation](https://www.react-simple-maps.io/)** - Legacy documentation

---

**Built with ❤️ for the React community. Powered by React 19, TypeScript, and modern web standards.**
