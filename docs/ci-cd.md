# CI/CD Architecture

## Branch model

- `dev` is the integration branch for day-to-day work.
- `main` is the release branch.
- All work should go through PRs into `dev`.
- Releases are promoted from `dev` to `main`.

## Branch protection

Both `dev` and `main` are protected with:

- pull request required
- required `ci` status check
- non-fast-forward updates blocked
- branch deletion blocked

## CI workflow

Workflow: `.github/workflows/ci.yml`

Runs on:

- PRs to `dev`
- PRs to `main`
- pushes to `dev`

The workflow installs dependencies and runs the canonical validation command:

```bash
npm run ci
```

That command includes:

- build
- type-check
- lint
- formatting check
- tests
- build verification
- runs validation under a Node.js matrix (20, 22) in the `validate` job
- builds examples in a separate `example-builds` job to verify they work with the package

This keeps local validation and GitHub validation aligned. See `.github/workflows/ci.yml` for the `validate` and `example-builds` job definitions.

## Release workflow

Workflow: `.github/workflows/publish.yml`

Runs on:

- pushes to `main`
- manual dispatch

Uses Changesets to:

- open or update the release PR
- publish the package after the release PR is merged

Because the Changesets release PR is bot-created and can skip normal PR-triggered CI, the publish workflow also:

- finds the open release PR
- validates its merge ref
- reports the required `ci` check directly to the release branch head commit

This keeps release PRs compatible with branch protection.

## Sync workflow

Workflow: `.github/workflows/sync-main-to-dev.yml`

Runs on:

- pushes to `main`
- manual dispatch

It:

- creates a PR from `main` to `dev` when `main` is ahead
- enables auto-merge for that sync PR

This keeps `dev` aligned with release, version, and changelog changes merged into `main`.

## Publishing

Publishing currently targets:

- npm registry

Main publish command:

```bash
npm run release
```

## Operational expectations

- Open PRs to `dev` for normal work.
- Merge `dev` into `main` for releases.
- Let Changesets manage release PR and version or changelog updates.
- Do not bypass required checks on `dev` or `main`.
- Keep pinned GitHub Action SHAs updated periodically.

## Maintenance note

When changing CI/CD behavior:

- keep `npm run ci` as the canonical validation contract
- keep release PR validation aligned with normal CI
- ensure required checks always report on protected branches
