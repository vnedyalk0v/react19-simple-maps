# Basic Map Example

A simple TypeScript example using `@vnedyalk0v/react19-simple-maps`.

## Features

- React 19 + TypeScript (strict mode)
- World map with click + hover interactions
- City markers with labels
- Vite dev/build tooling

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check
```

## Key TypeScript Notes

Use branded helpers for coordinates when you want type safety:

```tsx
import { createCoordinates } from '@vnedyalk0v/react19-simple-maps';

const center = createCoordinates(0, 0);
```

Geography event handlers receive `(event, data)` where `data` includes geography info:

```tsx
import type { GeographyEventData } from '@vnedyalk0v/react19-simple-maps';

const handleGeographyClick = (
  _event: React.MouseEvent<SVGPathElement>,
  data?: GeographyEventData,
) => {
  console.log(data?.geography.properties?.name);
};
```

## Learn More

- [Project README](../../README.md)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
