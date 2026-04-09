# Security Audit Validation and Remediation Status

**Date**: 2026-04-09  
**Reviewer**: Security Team - Library Maintainers (`@vnedyalk0v`), follow-up reference: PR #94  
**Scope**: Current `src/` codebase, published package surface (`.` and `./utils`), and shared-runtime behavior  
**Classification**: Internal maintainer review

---

## Summary

This document re-validates the findings documented in this audit record against the current codebase and records the remediation status after applying targeted fixes.

**Finding ID note:** `S-###` denotes internal security finding IDs used in this audit record for tracking and follow-up.

The review uses a **library threat model**:

- public package exports matter
- SSR and long-lived Node runtimes matter
- shared module state and caches matter
- downstream applications may use exported utilities in security-sensitive ways

## Current status

### Fixed in this branch

- Prototype mutation in `validateObject()` via `__proto__`
- Cache-key collisions from truncated object serialization and truncated function `toString()` values
- Exported `generateSRIHash()` fetching arbitrary URLs without the hardened URL validation pipeline
- Default `GeographyErrorBoundary` fallback exposing detailed error messages to end users
- Unbounded recursion in `getGeographyCoordinates()` for deep `GeometryCollection` input
- Overly shallow top-level `validateGeographyData()` shape checks
- Deprecated `fetchGeographies()` swallowing errors with no development-time visibility

### Still open / inherent limitations

- DNS rebinding TOCTOU gap between hostname validation and `fetch()`
- Shared module-level geography security configuration can affect all consumers in the same runtime
- `readResponseWithSizeLimit()` still buffers the full body in runtimes without stream readers before checking the final size

### Informational only

- `sanitizeSVG()` remains regex-based and should not be treated as a security boundary if ever exposed
- `validateEventHandler()` remains heuristic-only and must not be treated as a security boundary
- JSON-LD escaping in `MapMetadata` remains correct

---

## Remediated Findings

### S-005 (see Finding ID note): `validateObject()` prototype mutation via `__proto__`

**Status:** Fixed

**What changed**

- dangerous keys (`__proto__`, `constructor`, `prototype`) are now dropped
- validated objects are created with `Object.create(null)`
- downstream validation checks now use `Object.hasOwn()` instead of prototype-aware `'key' in obj` checks

**Files**

- `src/utils/input-validation.ts`
- regression coverage in `tests/audit-fixes.test.ts`

---

### S-003 / S-016: Cache-key collisions in module-level caches

**Status:** Fixed

**What changed**

- object and function cache discriminators now use stable per-instance `WeakMap` tokens
- large object cache keys no longer rely on `JSON.stringify(data).slice(0, 100)`
- `parseGeographies` no longer relies on truncated `toString()` output
- prepared feature cache keys now use feature array identity rather than truncated feature-name prefixes

**Files**

- `src/utils/geography-cache.ts`
- regression coverage in `tests/audit-fixes.test.ts`

**Residual note**

The cache layer remains shared module state. The key-collision issue is fixed, but shared-runtime cache semantics still matter for SSR memory and tenancy design.

---

### S-012: Exported `generateSRIHash()` skipped hardened URL validation

**Status:** Fixed

**What changed**

`generateSRIHash()` now runs the same URL validation and resolved-hostname checks used by the hardened geography-fetch pipeline before issuing a network request.

**Files**

- `src/utils/subresource-integrity.ts`
- regression coverage in `tests/security.test.ts`

---

### S-015: Default error UI exposed detailed operational messages

**Status:** Fixed

**What changed**

The default `GeographyErrorBoundary` fallback now renders a generic user-facing message instead of interpolating `error.message` directly into the UI.

**Files**

- `src/components/GeographyErrorBoundary.tsx`
- regression coverage in `tests/component-behavior.test.tsx`

---

### S-014: Unbounded recursive `GeometryCollection` traversal

**Status:** Fixed

**What changed**

`getGeographyCoordinates()` now enforces an explicit maximum recursion depth for nested `GeometryCollection` input and returns `null` once the guard is exceeded.

**Files**

- `src/utils/geography-utils.ts`
- regression coverage in `tests/audit-fixes.test.ts`

---

### S-010: Top-level geography validation was too shallow

**Status:** Fixed

**What changed**

`validateGeographyData()` still avoids heavyweight schema validation, but it now performs lightweight top-level structure checks:

- `Topology` requires a non-null `objects` map
- `FeatureCollection` requires a `features` array

**Files**

- `src/utils/geography-validation.ts`
- regression coverage in `tests/audit-fixes.test.ts`

---

### S-004: Deprecated `fetchGeographies()` hid blocked-request failures

**Status:** Partially fixed

**What changed**

The deprecated API still returns `undefined` for backward compatibility, but it now emits a development-time warning when it swallows a failure.

**Files**

- `src/utils/geography-fetching.ts`

**Residual note**

The API still intentionally suppresses the error from the caller. That compatibility behavior should be reconsidered in the next major version.

---

## Remaining Open Findings

### S-002: DNS rebinding between preflight validation and `fetch()`

**Severity:** Medium  
**Status:** Open, inherent limitation

The library validates hostnames before fetch, but the actual transport still performs its own DNS resolution later. With standard cross-platform `fetch()`, the library cannot fully pin resolution.

**Recommendation**

Document this as a limitation. Consumers with strict SSRF requirements should use a trusted proxy or transport layer that pins DNS resolution.

---

### S-009: Shared module-level geography security configuration

**Severity:** Low  
**Status:** Open by design

`configureGeographySecurity()` still mutates shared module state. This has now been documented more clearly in code comments, but the underlying behavior remains global to the package instance.

**Recommendation**

Consider per-call or provider-scoped configuration in a future update if stronger isolation is needed for SSR or multi-tenant runtimes.

---

### S-013: Full-buffer fallback when streaming APIs are unavailable

**Severity:** Low  
**Status:** Open

If `response.body?.getReader()` is unavailable, `readResponseWithSizeLimit()` still has to buffer the entire response before checking the size.

**Recommendation**

Keep documenting this runtime limitation and continue preferring streaming-capable runtimes for server-side fetching.

---

## Informational Notes

### `sanitizeSVG()`

The implementation remains regex-based and bypassable. It is not part of the public package surface and is not used by the core rendering pipeline, but it should not be treated as a security boundary if it is ever exposed or repurposed.

### `validateEventHandler()`

The implementation still relies on `Function#toString()` heuristics. It is internal-only today and should remain non-authoritative.

### `MapMetadata` JSON-LD escaping

The existing escaping remains correct for preventing script-breakout XSS in JSON-LD `<script>` content.

---

## Validation Performed

The following validation was completed after the fixes:

- `npm run type-check`
- `npm test`
- `npm run lint`
- `npm run build`

All passed on this branch.
