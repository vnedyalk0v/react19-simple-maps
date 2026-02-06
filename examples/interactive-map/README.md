# Interactive Map Example

An interactive TypeScript example using `@vnedyalk0v/react19-simple-maps` with zoom/pan, projection switching, and markers.

## Features

- ✅ **Zoom & Pan**: Interactive navigation with mouse/touch
- ✅ **Projection Switcher**: Equal Earth, Mercator, and Natural Earth
- ✅ **Country Hover + Selection**: Hover and click interactions
- ✅ **City Markers**: Clickable markers with labels
- ✅ **Quick Navigation**: Preset region buttons
- ✅ **TypeScript**: Branded coordinate helpers and typed events

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Key Features Demonstrated

### 1. ZoomableGroup with Position Tracking

```tsx
import { createCoordinates } from '@vnedyalk0v/react19-simple-maps';
import type { Position } from '@vnedyalk0v/react19-simple-maps';

const [position, setPosition] = useState<Position>({
  coordinates: createCoordinates(0, 0),
  zoom: 1,
});

<ZoomableGroup
  zoom={position.zoom}
  center={position.coordinates}
  onMoveEnd={setPosition}
  minZoom={0.5}
  maxZoom={8}
/>
```

### 2. Interactive Geography Selection

```tsx
<Geography
  geography={geo}
  onClick={() => setSelectedCountry(geo.properties?.name || 'Unknown')}
/>
```

### 3. Markers with Branded Coordinates

```tsx
const cities = [
  { name: 'New York', coordinates: createCoordinates(-74.006, 40.7128) },
  { name: 'London', coordinates: createCoordinates(-0.1276, 51.5074) },
];

{cities.map((city) => (
  <Marker key={city.name} coordinates={city.coordinates}>
    <circle r={5} />
    <text y={-10}>{city.name}</text>
  </Marker>
))}
```

## TypeScript Benefits

- **Branded coordinates**: Prevents lat/lon mix-ups
- **Typed `Position`**: Structured zoom and center state
- **Typed events**: Geography handlers receive rich data

## Styling Notes

This example uses simple card-style layout and inline styles to keep the focus on behavior rather than CSS frameworks.

## Learn More

- [Project README](../../README.md)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)
