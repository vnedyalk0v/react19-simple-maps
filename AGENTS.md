# react19-simple-maps Project Guidelines

This repository publishes a React 19+ npm package, not an application.

When making changes, optimize for:

- a stable public API
- small runtime and bundle size
- tree-shakeable ESM output
- SSR-safe and Strict Mode-safe behavior
- clear documentation and predictable release notes

Prefer KISS and DRY. Do not add bloatware, app-like abstractions, or speculative architecture.

These rules apply when editing library code in `src/` and docs/examples in `examples/`.

## Project Mindset (Required)

- Treat this repo as a reusable library consumed by many apps with different stacks.
- Do not bake in app-specific assumptions about routing, state management, styling frameworks, analytics, or data frameworks.
- Prefer extending existing APIs and utilities over introducing new abstraction layers.
- Reuse existing helpers before adding new ones. Avoid ad hoc local duplicates of existing coordinate, validation, fetch, or security utilities.
- Only add new dependencies when the value is clear and the same result cannot be achieved with the current stack or a small local utility.

## Git Workflow (Required)

- Never push directly to `main`.
- For every task, create a new branch from `dev`.
- Before branching, update `dev` from remote so it is current with `origin/dev`.
- Keep all task work on that new branch and open a PR to merge.
- After a PR is merged, do not continue follow-up work on that branch. Create a new branch from updated `dev`.
- Before claiming a fix is in `dev` or in a specific PR, verify the current git and GitHub state instead of relying on memory or prior conversation context.
- If review feedback arrives after merge, treat it as a new task: branch from current `dev`, apply the fix, validate it, and open a new PR.

## Local Workflow (Required)

- Start from updated `dev`, create a fresh task branch, and keep the change scoped to the user request.
- Run the most relevant local validation before commit. Use `npm run ci` as the default package gate; add targeted tests, example builds, `npm run analyze`, `npm pack --dry-run`, or generator checks when the touched area requires them.
- Before committing or pushing, run CodeRabbit CLI as the final local review and wait for it to finish:

```bash
cr review --agent --type uncommitted --base dev
```

- `coderabbit review --agent --type uncommitted --base dev` is equivalent when the `cr` alias is unavailable.
- Treat CodeRabbit findings as review input, not automatic truth. Verify each finding against the current code, fix valid issues, and rerun CodeRabbit after fixes.
- Commit and push only after validation passes and CodeRabbit has no remaining valid recommendations.
- If CodeRabbit cannot run because authentication, installation, or service connectivity is broken, run `cr doctor`, report the blocker, and do not push unless the user explicitly approves bypassing this gate.

## Release Notes (Required)

- For every user-facing or package-impacting change, create a new `.changeset/*.md` file that follows `RELEASE_NOTES_GUIDELINES.md`.
- The changeset file must describe the change clearly so Changesets can generate changelog entries and release text.
- Do not manually update `CHANGELOG.md` for normal feature or fix work; Changesets release PRs own generated version sections.
- Read `RELEASE_NOTES_GUIDELINES.md` only when the task requires a changeset or explicit changelog maintenance.
- Do not update `CHANGELOG.md` for tooling-only, CI-only, lockfile-only, or other internal-only maintenance.
- Never reference internal tooling, review bots, or IDE names (e.g., CodeRabbit, Cursor, Copilot) in changesets, changelog entries, commit messages, code comments, or any user-facing text. Describe _what_ changed and _why_, not which tool suggested it.

## Package Constraints (Required)

- Target React 19+ only (`peerDependencies` stay `>=19.0.0` unless explicitly changed).
- Keep the package ESM-only and preserve the `exports` map in `package.json`.
- Keep `sideEffects: false` valid. Avoid top-level work that produces observable side effects.
- Preserve tree-shakeability. Export only what belongs in the public API.
- Keep browser-only APIs guarded. Do not assume `window`, `document`, `navigator`, or DOM availability during server rendering.
- If you change the public API, also update types, README, examples, tests, and release notes in the same task.
- Prefer additive changes. Do not break existing consumers unless a breaking change is explicitly requested.
- Read `docs/support.md` only when the task affects support guarantees, platform compatibility, distribution channels, release expectations, or the public `./utils` API policy.

## React 19 Rules (Required)

- Components and Hooks must stay pure and idempotent during render.
- Never run side effects during render. Side effects belong in event handlers or Effects.
- If there is no external system to synchronize with, do not add an Effect.
- Do not mirror props or derived values into state unless there is a real state boundary. Derive values during render whenever possible.
- Use `useMemo` only for measurably expensive calculations or to stabilize values that materially affect memoization or Effect behavior.
- Use `memo` only as a performance optimization. Do not rely on it for correctness.
- Prefer default shallow prop comparison for `memo`. Add custom comparators only when profiling shows a need and tests prove they do not hide legitimate updates.
- Follow the existing `ref`-as-prop pattern. In React 19, prefer passing `ref` as a prop; use `forwardRef` only when unavoidable for compatibility or typing constraints.
- If you need to subscribe to data that lives outside React, prefer `useSyncExternalStore` over ad hoc subscription Effects. Keep it SSR-safe when server rendering matters.
- Code must behave correctly under Strict Mode and concurrent rendering. Effect cleanup must fully mirror setup.

## Components, Hooks, and Utilities

- Prefer function components. Use class components only where React still requires them, such as error boundaries.
- Keep components focused. Extract pure helper functions for reusable data shaping, geometry work, validation, or formatting logic.
- Create custom hooks only when they encapsulate real reusable stateful or Effectful behavior. Do not create hooks as indirection for one-off logic.
- Memoize expensive geography path, projection, or coordinate calculations where it materially reduces render cost.
- Never render HTML elements inside SVG subtrees where SVG elements are required. Loading and error fallbacks inside `<svg>` / `<g>` trees must remain SVG-safe.
- Keep debug behavior opt-in and safe. Do not add noisy logs, render-phase debug mutations, or production-only surprises.

## TypeScript and Public API Design

- Avoid `any`; use `unknown`, proper generics, or explicit types plus type guards.
- Use branded coordinate helpers for new APIs (`createCoordinates`, `createScaleExtent`, `createTranslateExtent`) and keep those helpers consistent across the codebase.
- Keep exported types intentional and stable. Do not leak internal-only implementation details through the public API without a clear reason.
- Favor small, composable props and utilities over large configuration objects when that keeps the API clearer.
- Validate untrusted inputs at package boundaries and surface precise, actionable errors.

Example (branded coordinates):

```tsx
import { createCoordinates } from '@vnedyalk0v/react19-simple-maps';

const center = createCoordinates(0, 0);
```

## Security and Geography Fetching

- For URL-based geography data, use existing secure utilities (`fetchGeographiesCache`, validation helpers, SRI helpers).
- Preserve HTTPS-only defaults, private IP blocking, redirect validation, response-size limits, and content validation.
- Do not weaken security defaults without an explicit user request and matching tests/docs.
- Update known SRI hashes only when adding verified URLs.
- Keep any preloading, DNS hinting, or caching logic aligned with the same validation rules as the main fetch path.
- Security hardening must preserve documented supported runtimes. If a safeguard depends on a platform API, provide a compatible fallback for supported Node versions.
- Partial security configuration updates must be composable unless replacement behavior is explicitly documented.
- When changing SRI sources or hashes, also verify that the generator inputs and checked-in generated artifacts stay in sync.

## Performance, KISS, and DRY

- Prefer the simplest solution that preserves package quality.
- Avoid overengineering: no unnecessary managers, registries, service layers, wrapper hooks, or configuration systems.
- Keep duplication low, but do not extract abstractions too early. Extract only when reuse or clarity is real.
- Optimize hot paths and exported components, not hypothetical bottlenecks.
- Minimize prop churn, object recreation, and unnecessary Effect-driven re-renders in performance-sensitive components.
- Be conservative with new features that add maintenance cost, API surface, or bundle weight.

## Docs and Examples

- Documentation must match the current implementation.
- Remove unverifiable claims; prefer concrete statements tied to the repo.
- Examples should demonstrate idiomatic package usage, not app-specific workarounds.
- If you change public APIs, update examples and README accordingly.
- If docs or examples show sequential configuration calls, verify that the documented call order composes correctly in the implementation.

## Tests and Validation

- Add or update tests for behavior changes.
- For bug fixes, add a focused regression test when practical.
- Keep tests focused, deterministic, and free of unnecessary network or timing fragility.
- When touching exported behavior, security-sensitive code, or build/package configuration, run the most relevant validation commands before finishing.
- Verify review findings against the current code before fixing them. Only change code for findings that are actually valid.
- Prefer behavioral assertions over implementation-detail assertions, especially under Strict Mode.
- For fixes involving generated files, rerun the generator and verify the output matches the checked-in artifacts.
- Before reporting completion, verify the relevant local commands, PR checks, and branch or merge state directly.
