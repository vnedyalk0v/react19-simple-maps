---
"@vnedyalk0v/react19-simple-maps": patch
---

Fix package configuration and tooling issues

- Remove deprecated `/* eslint-env browser */` comment that will error in ESLint v10
- Reduce npm package size by excluding intermediate `dist/types/` build artifacts from published files
- Quote lint script glob patterns for cross-platform shell compatibility
- Update `moduleResolution` from `node` to `bundler` for proper ESM `exports` map support
- Update vitest esbuild target from `node18` to `node22` to match Node.js LTS requirement
