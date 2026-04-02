# React 19 Package Review

## 1. Scope reviewed

This package is a TypeScript-first, ESM-only React library for interactive SVG maps and secure geography loading, positioned as a React 19+ fork of `react-simple-maps` `README.md:11-23`.

Reviewed areas:

- package/build/test/lint setup `package.json:1-144` `tsconfig.json:1-35` `tsconfig.build.json:1-18` `rollup.config.js:1-169` `eslint.config.js:1-190` `vitest.config.ts:1-35`
- public entrypoint and core components `src/index.ts:1-78` `src/components/ComposableMap.tsx:1-43` `src/components/Geographies.tsx:1-138` `src/components/Geography.tsx:1-213` `src/components/ZoomableGroup.tsx:1-122`
- data loading, zoom/pan, and security utilities `src/components/useGeographies.tsx:1-196` `src/hooks/useZoomPan.ts:1-124` `src/hooks/useZoomBehavior.ts:1-179` `src/hooks/usePanBehavior.ts:1-107` `src/hooks/useDeferredPosition.ts:1-125` `src/utils/geography-fetching.ts:1-294` `src/utils/geography-validation.ts:1-374` `src/utils/input-validation.ts:1-686`

## 2. Environment and React 19 status

- Single-package npm repository, not a monorepo `package-lock.json:1-5` `package.json:1-57`
- React 19 is genuinely targeted, not just claimed:
  - peer deps require React/React DOM `>=19.0.0` `package.json:132-135`
  - dev deps use React 19 and React DOM 19 `package.json:107-124`
  - React 19 provider shorthand is used in code via `<MapContext value={value}>` `src/components/MapProvider.tsx:100`
- New JSX transform is enabled with `jsx: "react-jsx"` `tsconfig.json:17`
- TypeScript strict mode and bundler module resolution are enabled `tsconfig.json:2-31`
- No legacy root APIs (`ReactDOM.render`, `findDOMNode`, legacy context, `react-dom/test-utils`) were found in repo-wide searches.
- No framework-specific SSR config was found; there are internal server-action/server-component style files, but they are not exported from the public package entrypoint `src/index.ts:1-78` `src/components/GeographyActions.tsx:1-45` `src/components/geography/GeographyServer.tsx:134-151`

## 3. Validation performed

Completed:

- README and package/config review
- repo-wide searches for deprecated React APIs and common security-sensitive patterns
- focused source tracing through map rendering, geography loading, zoom/pan, and validation paths

Attempted but blocked in this environment:

- `npm ls react react-dom --depth=0`
- `npm run type-check`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm audit --json`

All of the above failed with `zsh:1: command not found: npm`, so script validation and dependency audit coverage remain incomplete against the scripts declared in `package.json:29-57`.

## 4. Must-fix blockers

### 4.1 Suspense and error-boundary geography loading is not actually wired up

- **Severity:** High
- **Status:** Confirmed
- **Category:** React 19
- **Description:** `Geographies` advertises Suspense/error-boundary loading, but URL loading happens in an effect, errors are swallowed, and nothing suspends or throws.
- **Why it is a problem here:** The README promises Suspense/error-boundary geography loading `README.md:21-23`, but `useGeographies` fetches inside `useEffect` and only toggles internal state `src/components/useGeographies.tsx:42-66`. `Geographies` wraps already-rendered children in Suspense/error-boundary containers `src/components/Geographies.tsx:21-25` `src/components/Geographies.tsx:50-89`, so failed or pending URL loads collapse to an empty render path instead of the advertised loading/error UX `src/components/Geographies.tsx:28-36`.
- **Smallest safe fix:** Choose one model: either make geography reads genuinely suspend/throw during render, or remove the Suspense/error-boundary API and return explicit loading/error state from the hook.
- **Validation guidance:** Pass an unreachable geography URL and verify that a fallback or `onGeographyError` actually renders; current behavior should leave a blank map region.

### 4.2 Fallback and error UI is invalid inside SVG, and the caller fallback is ignored

- **Severity:** High
- **Status:** Confirmed
- **Category:** Bug
- **Description:** If fallback/error UI renders, it produces HTML `<div>`/`<button>` content inside the `<g>` wrapper, and the SVG-safe fallback constructed by `Geographies` is overridden.
- **Why it is a problem here:** `Geographies` creates an SVG-safe `<text>` fallback `src/components/Geographies.tsx:43-48`, but `GeographyOptimizedSuspense` replaces it with a `<div>`-based fallback `src/components/OptimizedSuspense.tsx:172-195`. That fallback is rendered inside `<g>` `src/components/Geographies.tsx:64-76` `src/components/Geographies.tsx:80-90`. The default error-boundary fallback is also HTML `src/components/GeographyErrorBoundary.tsx:14-30`. This is invalid SVG DOM and will be brittle in browsers and hydration paths.
- **Smallest safe fix:** Keep fallback/error content SVG-safe when it renders under `<svg>`/`<g>`, or move the error/loading UI outside the SVG subtree. Also stop overriding a caller-provided `fallback`.
- **Validation guidance:** Force a suspended/error state in a browser test and inspect the DOM under the `<g>` element.

## 5. Confirmed bugs and glitches

### 5.1 Custom memo comparators can block public DOM prop updates

- **Severity:** High
- **Status:** Confirmed
- **Category:** Bug
- **Description:** `Geographies` and `Geography` forward `...restProps` to DOM nodes, but their custom `memo` comparators do not compare those props.
- **Why it is a problem here:** `Geographies` spreads arbitrary SVG props into `<g>` `src/components/Geographies.tsx:17-18` `src/components/Geographies.tsx:64-65` `src/components/Geographies.tsx:80-81`, yet only compares a narrow hand-picked subset `src/components/Geographies.tsx:97-135`. `Geography` does the same for `<path>` `src/components/Geography.tsx:21-22` `src/components/Geography.tsx:113-127` while ignoring the rest in its comparator `src/components/Geography.tsx:135-210`. Updates to `aria-*`, `role`, `opacity`, `data-*`, and other forwarded props can be lost.
- **Smallest safe fix:** Remove the custom comparators and rely on default `memo`, or shallow-compare all remaining props instead of a selective subset.
- **Validation guidance:** Rerender with a changed `aria-label` or `opacity` and confirm the DOM updates.

### 5.2 The public `focused` style variant is never used

- **Severity:** Medium
- **Status:** Confirmed
- **Category:** Accessibility
- **Description:** The public style API includes `focused`, but both `Geography` and `Marker` only resolve `default`, `hover`, or `pressed`.
- **Why it is a problem here:** The type surface explicitly exposes `focused` styling `src/types.ts:79-82` `src/types.ts:291` `src/types.ts:345`, but state resolution in `Geography` and `Marker` never chooses that variant `src/components/Geography.tsx:94-111` `src/components/Marker.tsx:79-91`. Keyboard focus therefore cannot receive a distinct visual state even though the API says it can.
- **Smallest safe fix:** Track focus independently from hover and map actual focus state to `focused`.
- **Validation guidance:** Provide `style.focused` and tab to a geography or marker.

### 5.3 `ZoomableGroup` ignores the public `scaleExtent` prop

- **Severity:** Medium
- **Status:** Confirmed
- **Category:** Bug
- **Description:** `ZoomableGroup` strips `scaleExtent` from props and then rebuilds zoom bounds only from `minZoom`/`maxZoom` defaults.
- **Why it is a problem here:** The types advertise `scaleExtent` as part of the public API `src/types.ts:97-110` `src/types.ts:295-335`, but the implementation never honors that prop `src/components/ZoomableGroup.tsx:38-50` `src/components/ZoomableGroup.tsx:56-93`. Consumers can believe they constrained zoom when the component still uses the default range.
- **Smallest safe fix:** Use `props.scaleExtent` when provided and only derive it from `minZoom`/`maxZoom` as a fallback.
- **Validation guidance:** Render with `scaleExtent={[2, 4]}` and verify zoom cannot exceed those bounds.

## 6. Security and dependency risks

### 6.1 Validation/security helpers build many errors with the wrong argument order

- **Severity:** Medium
- **Status:** Confirmed
- **Category:** Security
- **Description:** Multiple validation helpers pass arguments to `createGeographyFetchError` in the wrong order, replacing real failure messages with generic text.
- **Why it is a problem here:** The helper signature is `(type, message, url?, originalError?)` `src/utils/error-utils.ts:11-16`, but `input-validation.ts` repeatedly passes the detailed message in the third slot instead of the second `src/utils/input-validation.ts:53-57` `src/utils/input-validation.ts:62-66` `src/utils/input-validation.ts:106-110` `src/utils/input-validation.ts:115-119` `src/utils/input-validation.ts:125-129` `src/utils/input-validation.ts:148-152` `src/utils/input-validation.ts:156-160` `src/utils/input-validation.ts:165-168`. That weakens diagnostics for validation and security failures.
- **Smallest safe fix:** Swap the arguments or use purpose-built helpers like `createValidationError` and `createSecurityError`.
- **Validation guidance:** Add unit tests around invalid URL and malformed input cases and assert the thrown message contains the real cause.

### 6.2 Lockfile metadata is stale relative to the manifest

- **Severity:** Low
- **Status:** Confirmed
- **Category:** Dependency risk
- **Description:** `package.json` is at `2.0.2`, while the checked-in lockfile still records `2.0.0`.
- **Why it is a problem here:** This weakens confidence in reproducible installs and future audit/release verification because the package metadata is not fully synchronized `package.json:2-3` `package-lock.json:2-9`.
- **Smallest safe fix:** Regenerate and commit `package-lock.json` once Node/npm are available.
- **Validation guidance:** Re-run install and verify the lockfile root package version matches the manifest.

### 6.3 No confirmed source-level XSS issue found in the reviewed code

- The only `dangerouslySetInnerHTML` usage I found is JSON-LD serialization that explicitly escapes script-breaking characters `src/components/MapMetadata.tsx:8-15` `src/components/MapMetadata.tsx:89-94`.
- Dependency vulnerability status is still **unverified** because `npm audit --json` could not be run in this environment.

## 7. DRY or KISS maintainability issues

### 7.1 Debugging mutates global state and performs side effects during render

- **Severity:** Medium
- **Status:** Confirmed
- **Category:** Maintainability
- **Description:** The debug system mutates a singleton and logs during render, so one component’s `debug` prop can affect another map instance.
- **Why it is a problem here:** `ComposableMap` calls `logRender` during render `src/components/ComposableMap.tsx:17-20`; `useMapDebugger` mutates singleton debug mode during render `src/utils/debugging.ts:276-283`; and `logRender` itself mutates internal log state and writes to the console `src/utils/debugging.ts:96-131`. In concurrent/StrictMode rendering this is noisy, impure, and cross-instance.
- **Smallest safe fix:** Keep debug state per instance and move log emission into effects instead of render.
- **Validation guidance:** Render two maps with different `debug` props and observe whether logging leaks across instances.

## 8. Optional React 19 improvements

- React 19 readiness is mostly real: the package uses React 19 peers/dev deps `package.json:107-135`, the new JSX transform `tsconfig.json:17`, and the new provider shorthand `src/components/MapProvider.tsx:100`.
- I did not find legacy upgrade blockers such as `ReactDOM.render`, `findDOMNode`, `react-dom/test-utils`, or legacy context in repo-wide searches.
- After fixing the broken loading path, simplify the geography-loading model: either adopt a true Suspense/resource pattern or keep a plain client loading hook instead of maintaining both mental models across `src/components/useGeographies.tsx:1-196`, `src/components/OptimizedSuspense.tsx:1-221`, and `src/components/GeographyErrorBoundary.tsx:1-119`.

## 9. Highest-risk areas needing manual verification

- The declared scripts in `package.json:29-57` could not be executed here because `npm` is unavailable.
- The private-IP and redirect validation logic should be exercised with unusual IP encodings and redirect chains `src/utils/geography-validation.ts:142-245` `src/utils/geography-fetching.ts:49-94`.
- The current tests are only smoke-level and do not cover loading, error, zoom, or accessibility behavior `tests/basic.test.ts:8-35`.

## 10. Short overall assessment

The package is clearly intended to be a modern React 19+, TypeScript-first map library, and the foundation is mostly aligned with that goal: React 19 is real, the new JSX transform is enabled, ESM-only packaging is coherent, and I did not find legacy React upgrade blockers.

The biggest issues are behavioral rather than versioning:

- the promised Suspense/error-boundary loading flow is not actually implemented
- fallback/error UI is invalid for SVG
- some public prop updates can go stale because of custom memo comparators
- a few public API details (`focused` styles, `scaleExtent`) do not behave as advertised
