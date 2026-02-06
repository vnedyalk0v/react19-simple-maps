---
'@vnedyalk0v/react19-simple-maps': patch
---

Fix security vulnerabilities identified in security best-practices review:

- **SEC-001 (High):** Fix IPv6 private-address bypass in URL validation. Strip IPv6 brackets from `new URL().hostname` before matching, add IPv4-mapped IPv6 detection (both dotted-quad and hex forms), and expand reserved range coverage.
- **SEC-002 (Medium):** Run `validateGeographyUrl()` in the preloading pipeline before any DNS prefetch, preconnect, or preload network activity.
- **SEC-003 (Medium):** Canonicalize URLs (strip fragment, normalize port/host) before SRI hash lookup to prevent bypass via trivial URL variants.
- **SEC-004 (Low):** Remove `frame-ancestors` and `X-Frame-Options` from HTML meta tags in examples (not enforced by browsers via meta); strengthen dev-only comments.
- **SEC-005 (Low):** Redact `git.branch` in persisted bundle reports to prevent sensitive branch names leaking into CI artifacts. Add `BUNDLE_REPORT_REDACT_GIT` env var to omit all git metadata from reports.
- **Build:** Set `NODE_ENV=production` in the `build` script so the Rollup Terser plugin is applied, enabling `drop_console` and `pure_funcs` to strip `console.log`/`console.warn`/`console.debug` from production bundles.

Bundle Monitor Improvements:

- Fix optimization status mapping — 0% completion now correctly reports `"not_started"` instead of `"partial"`. Status derives from numeric completionRate consistently (0% → not_started, 1–99% → partial, 100% → complete).
- **Breaking (report schema):** `utilization.raw`, `utilization.gzip`, and `utilization.brotli` are now numbers (e.g. `93.7`) instead of strings (`"93.7"`). Brotli emits `null` instead of `"N/A"` when unavailable. Parallel formatted fields (`utilization.rawFormatted`, `utilization.gzipFormatted`, `utilization.brotliFormatted`) provide display-ready strings (e.g. `"93.7%"`).
- **Breaking (report schema):** `react19Optimizations.*.completionRate` is now a number (e.g. `50`) instead of a string (`"50.0"`). A parallel `completionRateFormatted` field (e.g. `"50.0%"`) is provided for display.
