# Security Configuration for Examples

This document describes the security-related headers used by the examples in this repo.

## Content Security Policy (CSP)

Both examples include CSP meta tags in `index.html`, and the Vite dev server sets CSP headers in `vite.config.ts`.

- **HTML meta tags** allow `self` plus `https://unpkg.com` for geography data.
- **Dev server headers** add `ws:`/`wss:` for Vite HMR and also set `frame-ancestors 'none'`.
- The **interactive example** includes `frame-ancestors 'none'` in its meta tag.
- The **basic example** does not include `frame-ancestors` in the meta tag (see the comment in `index.html`).

### CSP Directives Used

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

## Additional Security Headers

The examples also set these headers (via HTML meta tags and dev server headers):

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (disabled features list)

## Development vs Production

- **Development**: `unsafe-eval` and WebSocket connections are required for Vite HMR.
- **Production**: Treat the HTML meta tags as a baseline. For production deployments, prefer server-level CSP headers and tighten directives (for example, remove `unsafe-eval` if possible).

## External Resources

The examples load geography data from `https://unpkg.com`, which is explicitly allowed in the CSP `connect-src` directive.

## Customizing Security

To change security settings:

1. **HTML CSP**: Edit the `Content-Security-Policy` meta tag in `index.html`.
2. **Vite Dev Server**: Edit `server.headers` in `vite.config.ts`.
3. **Production**: Configure CSP headers at the server or CDN layer.

## Reporting Security Issues

If you discover a security issue, please report it responsibly by contacting the maintainer directly.
