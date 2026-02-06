---
'@vnedyalk0v/react19-simple-maps': patch
---

Fix security vulnerabilities identified in security best-practices review:

- **SEC-001 (High):** Fix IPv6 private-address bypass in URL validation. Strip IPv6 brackets from `new URL().hostname` before matching, add IPv4-mapped IPv6 detection (both dotted-quad and hex forms), and expand reserved range coverage.
- **SEC-002 (Medium):** Run `validateGeographyUrl()` in the preloading pipeline before any DNS prefetch, preconnect, or preload network activity.
- **SEC-003 (Medium):** Canonicalize URLs (strip fragment, normalize port/host) before SRI hash lookup to prevent bypass via trivial URL variants.
- **SEC-004 (Low):** Remove `frame-ancestors` and `X-Frame-Options` from HTML meta tags in examples (not enforced by browsers via meta); strengthen dev-only comments.
