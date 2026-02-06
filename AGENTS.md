# react19-simple-maps Project Guidelines

These rules apply when editing library code in `src/` and docs/examples in `examples/`.

## Git Workflow (Required)

- Never push directly to `main`.
- For every task, create a new branch from `dev`.
- Before branching, update `dev` from remote so it is current with `origin/dev`.
- Keep all task work on that new branch and open a PR to merge.

## Release Notes (Required)

- For every user-facing or package-impacting change, create a new `.changeset/*.md` file.
- The changeset file must describe the change clearly so the changelog can be generated correctly.

## Scope and Compatibility

- Target React 19+ (peer dependency `>=19.0.0`).
- Keep the package ESM-only and preserve the `exports` map in `package.json`.
- Avoid unnecessary side effects; keep exports tree-shakeable.

## Components and Hooks

- Prefer function components.
- Use class components only where React requires them (error boundaries).
- Follow the existing `ref`-as-prop pattern; use `forwardRef` only when required.
- Keep components focused and memoize expensive work (e.g., geography path calculations).

## TypeScript and API Design

- Avoid `any`; use `unknown` plus type guards or proper generics.
- Use branded coordinate helpers for new APIs (`createCoordinates`, `createScaleExtent`, `createTranslateExtent`).
- Maintain backward compatibility unless a breaking change is explicitly requested.

Example (branded coordinates):

```tsx
import { createCoordinates } from '@vnedyalk0v/react19-simple-maps';

const center = createCoordinates(0, 0);
```

## Geography Fetching and Security

- For URL-based geography data, use existing utilities (`fetchGeographiesCache`, validation helpers).
- Preserve HTTPS-only defaults and private IP blocking.
- Update known SRI hashes only when adding verified URLs.

## Docs and Examples

- Documentation must match the current implementation.
- Remove unverifiable claims; prefer concrete statements tied to the repo.
- If you change public APIs, update examples and README accordingly.

## Tests

- Add or update tests for behavior changes.
- Keep tests focused and deterministic.
