# Security Best Practices Report

Date: 2026-02-06  
Scope reviewed: `src/`, `examples/`, `.github/workflows/`, `README.md`

## Executive Summary

The codebase already includes several strong controls (HTTPS-first geography fetches, redirect validation, response size checks, pinned GitHub Action SHAs, and `npm ci` in CI).  
I found 4 security issues that should be addressed for stronger secure-by-default behavior:

- 1 High
- 2 Medium
- 1 Low

The highest-risk issue is a private-address filtering gap for IPv6 hosts that can allow internal network access in server-side fetch paths.

## High Severity Findings

### SEC-001
- Rule ID: `REACT-NET-001` / `JS-URL-001`
- Severity: High
- Location:
  - `src/utils/geography-validation.ts:97`
  - `src/utils/geography-validation.ts:119`
  - `src/utils/geography-validation.ts:147`
  - `src/utils/geography-validation.ts:227`
- Evidence:
  - Private IPv6 checks use regexes like `^::1$`, `^fe80:`, `^fc00:`, `^fd00:`.
  - Validation uses `new URL(...)` and passes `parsedUrl.hostname` directly into the private-IP checker.
  - URL hostnames for IPv6 are bracketed (for example `"[::1]"`), so these regexes do not match and private IPv6 ranges can bypass the check.
- Impact: Attackers can supply IPv6 loopback/private targets and potentially reach internal services via server-side geography loading paths.
- Fix:
  - Normalize hostname before IP checks (strip `[` and `]`).
  - Replace regex-only checks with robust IP classification (`net.isIP` + strict IPv4/IPv6 private/loopback/link-local/ULA checks).
  - Explicitly block IPv4-mapped IPv6 (`::ffff:*`) and reserved ranges.
- Mitigation:
  - Add an outbound host/IP allowlist for server-side fetches.
  - Restrict egress networking at infrastructure level.
- False positive notes:
  - If this package is used only in browser-only rendering, risk is reduced; server actions/components still make this relevant.

## Medium Severity Findings

### SEC-002
- Rule ID: `REACT-NET-001`
- Severity: Medium
- Location:
  - `src/components/useGeographies.tsx:50`
  - `src/utils/preloading.ts:23`
  - `src/utils/preloading.ts:26`
  - `src/utils/preloading.ts:35`
- Evidence:
  - URL preloading is triggered before secure fetch validation (`preloadGeography(geography)`).
  - Preloading only parses with `new URL(url)` and then issues `prefetchDNS`, `preconnect`, and `preload` without calling `validateGeographyUrl`.
- Impact: Untrusted or policy-disallowed URLs can still trigger outbound network activity, bypassing intended URL restrictions in the secure fetch pipeline.
- Fix:
  - Run `validateGeographyUrl` before any preload/preconnect operations.
  - Skip preloading when validation fails.
  - Consider moving preload decisions into the same validated fetch pipeline.
- Mitigation:
  - Disable preloading when `geography` originates from untrusted input.
- False positive notes:
  - If all geography URLs are hardcoded trusted constants, practical exploitability is lower.

### SEC-003
- Rule ID: `JS-SRI-001`
- Severity: Medium
- Location:
  - `src/utils/geography-fetching.ts:231`
  - `src/utils/subresource-integrity.ts:240`
  - `src/utils/subresource-integrity.ts:55`
- Evidence:
  - SRI lookup is exact-string based (`KNOWN_GEOGRAPHY_SRI[url]`).
  - Lookup uses the raw input URL, and unknown sources are allowed by default (`allowUnknownSources: true`).
- Impact: SRI enforcement for known sources can be bypassed by URL variants (for example query/hash/canonicalization differences), resulting in no integrity verification.
- Fix:
  - Canonicalize URLs before SRI lookup (normalize host/protocol/path and strip fragment).
  - Optionally require strict SRI for trusted source patterns (for example `unpkg.com/world-atlas@2/*`).
  - Consider defaulting to stricter behavior when URL input is untrusted.
- Mitigation:
  - Use `enableStrictSRI()` or set `allowUnknownSources: false` where feasible.
- False positive notes:
  - If consumers only use exact pinned URLs from `KNOWN_GEOGRAPHY_SRI`, this gap is less likely to be hit.

## Low Severity Findings

### SEC-004
- Rule ID: `JS-CSP-001` / `REACT-HEADERS-001`
- Severity: Low
- Location:
  - `examples/basic-map/index.html:33`
  - `examples/basic-map/index.html:34`
  - `examples/interactive-map/index.html:27`
  - `examples/interactive-map/index.html:33`
  - `examples/interactive-map/index.html:34`
- Evidence:
  - Security headers like `X-Frame-Options` / `X-Content-Type-Options` are set via `<meta http-equiv>`.
  - `frame-ancestors` is included in a meta-delivered CSP in one example.
- Impact: These directives are not reliably enforced via HTML meta tags, which can create a false sense of protection if copied to production.
- Fix:
  - Keep these headers at HTTP response layer (server/CDN/edge).
  - Keep HTML meta CSP examples clearly marked as development-only fallback.
- Mitigation:
  - Add runtime header verification in deployment checks.
- False positive notes:
  - The Vite dev server already sets real headers in `vite.config.ts`; risk is mainly from copy-pasting static HTML config to production.

## Additional Notes

- Dependency vulnerability scan (`npm audit`) could not be completed in this environment because external registry access is blocked (`getaddrinfo ENOTFOUND registry.npmjs.org`).
- No obvious dangerous DOM sinks were found in library runtime code beyond a JSON-LD script sink that already escapes `<`, `>`, `&`, and Unicode line separators (`src/components/MapMetadata.tsx:8`).
