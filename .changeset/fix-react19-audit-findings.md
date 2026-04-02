---
'@vnedyalk0v/react19-simple-maps': patch
---

Fix all confirmed findings from the React 19 package audit:

- **(4.1, 4.2) Geography loading model:** Remove broken Suspense wrapper from `Geographies` that never triggered. Expose `isLoading` and `error` from `useGeographies` and render SVG-safe loading/error fallbacks instead of invalid HTML `<div>` elements inside `<g>`.
- **(5.1) Custom memo comparators:** Remove custom `memo` comparators from `Geographies` and `Geography` that silently blocked updates to forwarded DOM props (`aria-*`, `data-*`, `opacity`, `role`, etc.). Default `memo` shallow comparison is now used.
- **(5.2) Focused style variant:** Separate hover and keyboard focus into independent state variables in `Geography` and `Marker`. The `focused` style variant is now applied on keyboard focus (`onFocus`/`onBlur`), while `hover` applies on mouse enter/leave.
- **(5.3) scaleExtent prop:** `ZoomableGroup` now honors the `scaleExtent` prop when provided directly, instead of always deriving zoom bounds from `minZoom`/`maxZoom`.
- **(6.1) Validation error messages:** Fix ~20 calls to `createGeographyFetchError` in `input-validation.ts` where the descriptive error message was passed in the wrong argument position (URL slot), resulting in generic error text. Security-related validation errors now correctly use the `SECURITY_ERROR` type.
- **(6.2) Lockfile sync:** Regenerate `package-lock.json` to match `package.json` version `2.0.2`.
- **(7.1) Debug render purity:** Move `setDebugMode` and `logRender` calls out of the render phase into `useEffect` to prevent global state mutation and console I/O during rendering, which is problematic under StrictMode and concurrent rendering.
- **Error boundary SVG safety:** Change `DefaultErrorFallback` in `GeographyErrorBoundary` to render SVG-safe `<text>`/`<g>` elements instead of HTML `<div>`/`<button>`.
