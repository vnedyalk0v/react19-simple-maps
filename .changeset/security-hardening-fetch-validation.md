---
'@vnedyalk0v/react19-simple-maps': patch
---

Hardened geography fetching and validation in server environments.

- Blocks geography hostnames that resolve to private IP addresses during server-side fetch validation, reducing SSRF exposure from hostile DNS.
- Keeps production fetch security on hardened defaults for HTTPS-only geography loading and known-source integrity enforcement.
- Tightens content-type validation to match exact MIME types and rejects malformed URL input instead of sanitizing it into different accepted values.
