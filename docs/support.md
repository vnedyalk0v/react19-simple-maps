# Support Policy

## Runtime and package support

- `@vnedyalk0v/react19-simple-maps` supports **React 19 or newer**.
- The published package is **ESM-only**. Use `import` syntax rather than `require(...)`.
- The package targets modern bundler-based application setups that understand the package `exports` field.

## Development and build support

- Local development, tests, and package builds require **Node.js 20.19.0 or newer**.
- CI validates the repository on **Node.js 20** and **Node.js 22**.

## API and release expectations

- The package follows semantic versioning for its documented public API.
- Additive, non-breaking improvements should ship in patch or minor releases.
- Breaking API, packaging, or supported-platform changes should ship only in a major release unless explicitly documented otherwise.
- CI-only, workflow-only, and docs-only maintenance should not trigger a package release unless it changes supported package behavior or distribution.

## `./utils` API guidance

- `@vnedyalk0v/react19-simple-maps/utils` is public API and must be treated as semver-relevant.
- Prefer documenting and promoting the recommended helpers for geography loading, validation, security configuration, integrity checks, and TopoJSON or GeoJSON preparation.
- Advanced low-level utilities may remain public for compatibility, but new exports in that category should be added sparingly.
- Deprecated helpers should stay available for compatibility until a major release removes them.

## Security and data fetching expectations

- URL-based geography loading keeps HTTPS-only defaults.
- Geography validation and fetch hardening are part of the supported package behavior, not example-only helpers.
- Security-sensitive changes should ship with matching tests and documentation updates.

## Examples and documentation

- The examples are maintained as supported usage references for the current package version.
- Documentation aims to reflect the current implementation and supported call order for configuration APIs.
