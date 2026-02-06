# Security Configuration for Examples

This document describes the security-related headers used by the examples in this repo.

## Content Security Policy (CSP)

Both examples include CSP meta tags in `index.html`, and the Vite dev server sets CSP headers in `vite.config.ts`.

- **HTML meta tags** allow `self` plus `https://unpkg.com` for geography data.
- **Dev server headers** add `ws:`/`wss:` for Vite HMR and also set `frame-ancestors 'none'`.
- The **interactive example** includes `frame-ancestors 'none'` in its meta tag.
- The **basic example** does not include `frame-ancestors` in the meta tag (see the comment in `index.html`).

### CSP Directives Used (Development)

Common directives across the examples include:

- `default-src 'self'`
- `script-src 'self' 'unsafe-inline' 'unsafe-eval'`
- `style-src 'self' 'unsafe-inline'`
- `img-src 'self' data: blob:`
- `font-src 'self' data:`
- `connect-src 'self' https://unpkg.com https://*.unpkg.com` (plus `ws:`/`wss:` in dev server headers)
- `object-src 'none'`
- `base-uri 'self'`
- `form-action 'self'`
- `upgrade-insecure-requests` (in HTML meta tags)

> **⚠️ WARNING (HIGH SEVERITY):** The `'unsafe-inline'` and `'unsafe-eval'` directives in `script-src` **drastically weaken CSP** and **must not be used in production**. They are included here **only** as a development exception required by Vite HMR. For production deployments, **remove both `'unsafe-inline'` and `'unsafe-eval'`** from `script-src` (and `'unsafe-inline'` from `style-src` where possible) and rely on nonces or hashes instead. See the [Development vs Production](#development-vs-production) section below for guidance on securing CSP for production.

### Production CSP

The directives above are **development defaults only**. Derive your production Content Security Policy from your own deployment environment rather than copying a hardcoded example. See the [Development vs Production](#development-vs-production) section below for the key changes to consider when moving to production.

## Additional Security Headers

The examples also set these headers (via HTML meta tags and dev server headers):

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0` — Disables the legacy XSS auditor. The deprecated `1; mode=block` value can introduce cross-site leak vulnerabilities in older browsers. Rely on a strong Content Security Policy instead.
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (disabled features list)

## Development vs Production

- **Development**: `'unsafe-inline'` and `'unsafe-eval'` in `script-src`, and WebSocket connections in `connect-src`, are required **only** for Vite HMR during local development.
- **Production**: Treat the HTML meta tags as a starting baseline only. For production deployments you **must**:
  1. Remove `'unsafe-inline'` and `'unsafe-eval'` from `script-src`.
  2. Remove `'unsafe-inline'` from `style-src` where possible (use nonces or hashes).
  3. Remove `ws:`/`wss:` from `connect-src`.
  4. Deliver CSP via server-level HTTP headers rather than meta tags for full directive support (e.g., `frame-ancestors`).

## External Resources

The examples load geography data from `https://unpkg.com`, which is explicitly allowed in the CSP `connect-src` directive.

## Customizing Security

To change security settings:

1. **HTML CSP**: Edit the `Content-Security-Policy` meta tag in `index.html`.
2. **Vite Dev Server**: Edit `server.headers` in `vite.config.ts`.
3. **Production**: Configure CSP headers at the server or CDN layer.

## Reporting Security Issues

If you discover a security issue, please report it responsibly by contacting the maintainer directly.
