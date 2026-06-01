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

The workflow installs dependencies with lifecycle scripts disabled and uses the
canonical validation command:

```bash
npm ci --ignore-scripts
```

```bash
npm run ci
```

`npm run ci` runs the local validation steps:

- build
- type-check
- lint
- formatting check
- tests
- build verification
- runs validation under a Node.js matrix (20, 22) in the `validate` job
- builds examples in a separate `example-builds` job to verify they work with the package

The CI orchestration itself lives in `.github/workflows/ci.yml`, which defines:

- the `validate` job, running `npm run ci` under a Node.js matrix (`20`, `22`)
- the `example-builds` job, which builds the root package explicitly, installs
  each example with lifecycle scripts disabled, and builds both examples
  separately to verify they work with the package

This keeps dependency installation free of package builds while making
`npm run ci` the explicit package validation and build contract.

## Release workflow

Workflow: `.github/workflows/publish.yml`

Runs on:

- pushes to `main`
- merged Changesets release PRs targeting `main`
- manual dispatch

Uses Changesets to:

- open or update the release PR
- publish the package after the release PR is merged

Because the Changesets release PR is bot-created and can skip normal PR-triggered CI, the publish workflow also:

- finds the open release PR
- validates its merge ref
- reports the required `ci` check directly to the release branch head commit

This keeps release PRs compatible with branch protection. The same workflow also listens for merged release PRs so the publish step still runs even when the merge commit is authored by automation and does not trigger a follow-up `push` workflow reliably.

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

## Repository settings follow-ups

These operational settings are tracked outside the repository and should be
verified in GitHub or npm settings:

- Configure npm trusted publishing for the release workflow and remove
  `NPM_TOKEN` once trusted publishing is active.
- Require the `Dependency Review` workflow, or fold dependency review into the
  required `ci` check.
- Set default GitHub Actions workflow permissions to read-only.
- Enable enforcement for SHA-pinned GitHub Actions.
- Enable automatic branch deletion after merge.
- Decide the required review policy for protected branches.
- Enable GitHub Issues for the repository.
- Enable the repository security policy and private vulnerability reporting.

## Maintenance note

When changing CI/CD behavior:

- keep `npm run ci` as the canonical validation contract
- keep release PR validation aligned with normal CI
- ensure required checks always report on protected branches
