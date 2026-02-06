---
'@vnedyalk0v/react19-simple-maps': patch
---

Security hardening (7 fixes):

- **[H-001]** Fix JSON-LD script-breakout XSS by escaping `<`, `>`, `&`, and Unicode line separators in `MapMetadata`.
- **[H-002]** Prevent redirect-based SSRF bypass by using `redirect: 'manual'` and validating each redirect hop against the URL security policy.
- **[M-001]** Enforce streaming response-size limits independent of the `Content-Length` header to prevent memory exhaustion.
- **[M-002]** Deprecate `fetchGeographies` — it now delegates to the hardened `fetchGeographiesCache` pipeline.
- **[M-003]** Align server actions in `GeographyActions` with the shared secure URL validator and fetch pipeline.
- **[L-001]** Add prominent dev-only labeling and production CSP guidance in example HTML and SECURITY.md.
- **[L-002]** Set `X-XSS-Protection: 0` consistently across all examples and documentation.
