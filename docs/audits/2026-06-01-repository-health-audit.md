# Repository Health Audit - 2026-06-01

## Status

The original repository-health findings that could be fixed from repository
settings or tracked files have been resolved and removed from this audit.

This file now tracks only follow-ups that still need a maintainer decision or
verification outside the repository checkout.

## Remaining Follow-ups

### 1. Confirm npm trusted publishing and token usage

- Location: `.github/workflows/publish.yml`.
- Current state: The latest npm package has provenance metadata, but the publish
  workflow still passes `NPM_TOKEN` and `NODE_AUTH_TOKEN`.
- Remaining work: Confirm in npm and GitHub settings whether trusted publishing
  is active for this package. If it is active, remove the npm token dependency
  from the publish workflow and repository secrets.
- Verification: A publish run should succeed with provenance without
  `NPM_TOKEN` or `NODE_AUTH_TOKEN`.

### 2. Decide the protected-branch review and bypass policy

- Location: live branch rulesets `protect-main` and `protect-dev`.
- Current state: Both rulesets require PRs and required checks, but they allow
  zero approving reviews, do not require review-thread resolution, and include a
  repository-role bypass actor.
- Remaining work: Decide whether this is the intended solo-maintainer policy or
  whether reviews, thread resolution, or bypass access should be tightened.
- Verification: The live rulesets should match the documented maintainer policy.
