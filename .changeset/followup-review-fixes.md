---
'@vnedyalk0v/react19-simple-maps': patch
---

Address follow-up review findings:

- **useGeographies:** Abort stale async updates with an effect cleanup flag; expose `refetch()` to retry string URL loads.
- **Types:** `GeographyData.error` is now `GeographyError | Error | null`; optional `refetch` on the hook result.
- **Geographies / Geography:** Restore targeted `memo` comparators; stable loading fallback element; wire fallback retry to `refetch`.
- **GeographyErrorBoundary:** Default fallback shows an accessible Retry control and vertically centers error text in SVG.
- **Security:** Canonicalize URLs in `addCustomSRI`; extend IPv4 documentation (TEST-NET) ranges; clarify example HTML comments on meta vs HTTP headers.
- **Preloading:** Mark URLs in the dedupe set after DNS/preconnect hints to avoid redundant hint calls in development.
