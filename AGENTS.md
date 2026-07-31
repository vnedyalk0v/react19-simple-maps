# react19-simple-maps — Agent Guidelines

This repo publishes a React 19+ ESM npm package (`@vnedyalk0v/react19-simple-maps`), not an application. Optimize for: stable public API, small bundle, tree-shakeable output, SSR- and Strict Mode-safe behavior, predictable releases.

Prefer KISS and DRY. No app-like abstractions, no speculative architecture, no bloat. Extend existing APIs and reuse existing helpers before adding new ones. Add a dependency only when the same result is not achievable with the current stack or a small local utility.

## Layout

- `src/` — library code (`components/`, `hooks/`, `utils/`, `index.ts`, `utils.ts`, `types.ts`)
- `tests/` — Vitest suites (jsdom)
- `examples/basic-map`, `examples/interactive-map` — standalone apps built in CI
- `scripts/` — bundle analysis, SRI generation, build verification
- `docs/ci-cd.md`, `docs/support.md`, `RELEASE_NOTES_GUIDELINES.md` — read on demand only

## Commands

- `npm run ci` — canonical gate: build, type-check, lint, format check, tests, build verification
- `npm test` / `npm run test:coverage` — Vitest
- `npm run lint:fix`, `npm run format` — autofix
- `npm run analyze` — bundle size report
- `npm run generate-sri` — regenerate `scripts/sri-hashes.json` and `src/utils/generated-sri-hashes.ts`
- Examples: `npm run build` at the root first (they link to it via `file:../..` and resolve through `dist/`), then `cd examples/<name> && npm ci --ignore-scripts && npm run build`

## Git Workflow (Required)

- `dev` is the integration branch; `main` is the release branch. Never push directly to either.
- For every task: update `dev` from `origin/dev`, branch from it, keep work scoped to the request, open a PR into `dev`.
- Release promotions are the one exception: they go straight from `dev` to `main` as a single PR, with no task branch and no new commits. Fix any valid review finding on a normal task branch into `dev`; the promotion PR picks it up automatically.
- After a PR merges, do not continue on that branch. Branch fresh from updated `dev` — including for post-merge review feedback.
- Conventional Commits (`fix(build): ...`, `chore(deps): ...`).
- Before claiming a fix is in `dev` or in a PR, verify actual git/GitHub state rather than relying on memory.

## Before Committing (Required)

Run this gate while the work is still uncommitted — `--type uncommitted` inspects the working tree, so running it after a commit reviews nothing.

1. Run `npm run ci`. Add targeted checks when the touched area needs them: example builds, `npm run analyze`, `npm pack --dry-run`, generator reruns.
2. Run CodeRabbit CLI as the final local review and wait for it to finish:

   ```bash
   cr review --agent --type uncommitted --base dev
   ```

   (`coderabbit review --agent --type uncommitted --base dev` if the `cr` alias is unavailable.)

3. Treat findings as input, not truth. Verify each against current code, fix valid ones, rerun.
4. Commit and push only after validation passes and no valid recommendations remain. If CodeRabbit cannot run (auth, install, connectivity, rate limit), run `cr doctor`, report the blocker, and do not push unless the user explicitly approves bypassing this gate.

## Pull Request Review Gate (Required)

Opening a PR automatically triggers **Codex Review** and **Greptile Review**. This gate covers every PR you open, into `dev` or `main`, and never merge one before those reviews have completed. It does not cover the automated `main` -> `dev` sync PRs, which `.github/workflows/sync-main-to-dev.yml` auto-merges on required checks alone, or Changesets release PRs, which the release workflow owns. CodeRabbit does not auto-review PRs targeting `dev` — its auto-review is limited to the default branch — so the local `cr` gate above is its coverage. Comment `@coderabbitai review` to request it on a PR when that local run was skipped or blocked.

Greptile runs on a credit-limited plan. When its check reports `skipping` or its review says the credits are exhausted, treat it as unavailable and gate on Codex alone — do not wait on a check that cannot report.

1. Open the PR and wait for the automated reviews to post. A PR with reviews still pending is not mergeable, regardless of CI status.
2. If reviews are clean and required checks (`ci`, `dependency-review`) pass — merge.
3. If any issue is flagged:
   - Verify each finding against the current code. Reviewers can be wrong.
   - Fix the valid ones and push: on the PR's own branch for a task PR, or on a fresh task branch into `dev` for a promotion PR, which then picks the fix up automatically.
   - Reply to every comment: what was fixed, or why the finding does not apply.
   - Resolve the addressed threads.
   - Request a fresh review by commenting `@codex review` and `@greptile review`.
   - Wait for the new reviews to complete, then repeat from step 2.
4. Merge only after a review round comes back with no outstanding issues and all required checks pass. Verify the merged state afterward instead of assuming it.
5. Never reference review bots or IDE names (CodeRabbit, Codex, Greptile, Cursor, Copilot) outside this file and PR review threads — not in changesets, changelog entries, commit messages, code comments, README, or docs.

## Release Notes (Required)

- Every user-facing or package-impacting change needs a new `.changeset/*.md` file following `RELEASE_NOTES_GUIDELINES.md`.
- Do not hand-edit `CHANGELOG.md`; Changesets release PRs own generated sections.
- No changeset for tooling-only, CI-only, lockfile-only, docs-only, or other internal maintenance that does not change package behavior or supported usage.

## Package Constraints

- React 19+ only (`peerDependencies` stay `>=19.0.0` unless explicitly changed).
- ESM-only; preserve the `exports` map in `package.json`.
- Keep `sideEffects: false` valid — no top-level work with observable side effects.
- Preserve tree-shakeability. Export only what belongs in the public API.
- Guard browser-only APIs. Never assume `window`, `document`, `navigator`, or DOM during server rendering.
- Prefer additive changes; do not break consumers unless a breaking change is explicitly requested.
- A public API change must update types, README, examples, tests, and release notes in the same task.

## React 19 Rules

- Components and Hooks stay pure and idempotent during render. Side effects belong in event handlers or Effects.
- No Effect when there is no external system to synchronize with. Effect cleanup must fully mirror setup.
- Do not mirror props or derived values into state; derive during render.
- `useMemo` only for measurably expensive work or to stabilize values that materially affect memoization/Effect behavior. `memo` is a performance optimization only, never correctness. Prefer default shallow comparison; add custom comparators only with profiling evidence and tests proving they hide no updates.
- Prefer `ref` as a prop; use `forwardRef` only when unavoidable.
- For external data subscriptions prefer `useSyncExternalStore`, kept SSR-safe.
- Code must be correct under Strict Mode and concurrent rendering.

## Components, Hooks, Utilities

- Function components; classes only where React requires them (error boundaries).
- Extract pure helpers for reusable geometry, validation, or formatting. Create custom hooks only for genuinely reusable stateful/Effectful behavior, not as indirection for one-off logic.
- Memoize expensive geography path, projection, and coordinate calculations where it materially reduces render cost.
- Never render HTML elements inside SVG subtrees. Loading and error fallbacks inside `<svg>`/`<g>` must stay SVG-safe.
- Keep debug behavior opt-in. No noisy logs or render-phase debug mutations.

## TypeScript and Public API

- Avoid `any`; use `unknown`, generics, or explicit types with type guards.
- Use the branded coordinate helpers for new APIs (`createCoordinates`, `createScaleExtent`, `createTranslateExtent`) and keep them consistent across the codebase.
- Keep exported types intentional and stable; do not leak internals without reason.
- Favor small composable props over large config objects. Validate untrusted input at package boundaries with precise, actionable errors.

## Security and Geography Fetching

`src/utils/` holds security-sensitive fetch, validation, cache, preload, and SRI logic.

- Use the existing secure utilities (`fetchGeographiesCache`, validation helpers, SRI helpers) for URL-based geography data.
- Preserve HTTPS-only defaults, private-IP blocking, redirect validation, response-size limits, and content validation. Do not weaken defaults without an explicit request plus tests and docs.
- Keep preloading, DNS hinting, and caching aligned with the main fetch path's validation rules.
- Update known SRI hashes only for verified URLs; rerun the generator and confirm checked-in artifacts match.
- Security hardening must preserve documented supported runtimes — provide a fallback when a safeguard depends on a newer platform API.
- Partial security config updates must compose unless replacement behavior is documented.

## Tests

- Add or update tests for behavior changes; add a focused regression test for bug fixes when practical.
- Keep tests deterministic — no unnecessary network or timing fragility.
- Prefer behavioral assertions over implementation details, especially under Strict Mode.
- Verify review findings against current code before changing anything.

## Docs and Examples

- Documentation must match the current implementation; drop unverifiable claims.
- Examples demonstrate idiomatic package usage, not app-specific workarounds.
- If docs show sequential configuration calls, verify the documented order actually composes.
