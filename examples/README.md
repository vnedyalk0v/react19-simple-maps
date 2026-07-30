# react19-simple-maps Examples

This directory contains TypeScript examples for `@vnedyalk0v/react19-simple-maps`.

## Available Examples

- **[basic-map](./basic-map/)** - Simple world map with click/hover interactions and city markers
- **[interactive-map](./interactive-map/)** - Zoom/pan, projection switching, hover/selection, markers, and quick navigation presets

## Security Notes

Both examples include CSP meta tags and basic security headers in `index.html`. The Vite dev server also sets CSP/headers in `vite.config.ts`. The examples use pinned `https://unpkg.com` geography URLs to avoid redirect-related fetch issues in browsers while staying within the CSP allowlist.

See [SECURITY.md](./SECURITY.md) for details.

## Running Examples

Each example is a standalone TypeScript project. To run one:

```bash
cd examples/basic-map
npm install
npm run dev
```

## Requirements

- Node.js 24.15.0 or newer, matching the repository requirement. CI builds the examples on the current Node 24 release, in the same job that installs the root package.
- React 19+
- The examples pin TypeScript 6 and Vite 8 in their own `package.json`

## TypeScript Configuration

Each example includes a strict `tsconfig.json` with bundler module resolution and React JSX settings.

## Contributing

New examples are welcome. Please keep them TypeScript-first and include a short README with setup instructions.
