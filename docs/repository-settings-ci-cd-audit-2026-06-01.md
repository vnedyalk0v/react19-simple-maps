# Repository Settings, CI/CD, Release, and Deployment Audit - 2026-06-01

## Verdict

The package shape is mostly sound for a React 19+ ESM npm library: the public
package is npm-only, `exports` is explicit, `sideEffects: false` is present,
the current npm release is live, the release has provenance, and the main CI
gate is passing.

The main improvements are in process hardening and maintainability. The highest
value fixes are to remove duplicated install-time builds, move publishing away
from a long-lived npm token, make changelog automation and policy agree, tighten
GitHub repository settings, and make support/security reporting paths match the
public package metadata.

## Scope Reviewed

- Repository settings from live GitHub API responses for
  `vnedyalk0v/react19-simple-maps`.
- Branch rulesets for `main` and `dev`.
- GitHub Actions workflows in `.github/workflows/`.
- Package, build, test, and publish configuration in `package.json`,
  `rollup.config.js`, `tsconfig*.json`, `vitest.config.ts`, and
  `eslint.config.js`.
- Changesets configuration, changelog policy, and current `CHANGELOG.md`.
- npm deployment state for `@vnedyalk0v/react19-simple-maps@2.0.8`.
- Example package builds.

## Checks Performed

- `git fetch origin dev` and `git merge --ff-only origin/dev`: `dev` was current.
- Created branch `audit/repo-settings-ci-cd-2026-06-01` from updated `dev`.
- `npm run ci`: passed locally.
  - Build, type-check, lint, Prettier check, tests, and build verification all
    passed.
  - Vitest still emits a configuration warning: `esbuild` options are ignored
    because `oxc` options are active.
- `npm test -- tests/geographies-integration.test.tsx`: passed locally, with the
  same Vitest configuration warning.
- `npm run build` in both examples: passed for `examples/basic-map` and
  `examples/interactive-map`.
- `npm audit --omit=dev`: found 0 runtime dependency vulnerabilities.
- `npm outdated`: only `eslint` has a newer major release available
  (`9.39.4` current, `10.4.1` latest).
- `npm pack --dry-run --json --ignore-scripts`: package would include 10 files,
  about 63.7 KB packed and 199 KB unpacked.
- `npm view @vnedyalk0v/react19-simple-maps`: latest dist-tag is `2.0.8`,
  published on 2026-06-01.
- GitHub release `v2.0.8`: published on 2026-06-01.
- Recent live GitHub Actions runs: latest `CI`, `Dependency Review`,
  `Release & Publish`, and `Sync main -> dev` runs were successful or
  intentionally skipped.

Note: `npm view` needed a temporary cache path because the local default npm
cache has ownership errors. This is a local machine issue, not a repository
issue.

## Positive Signals

- `package.json` keeps the library ESM-only with a narrow `exports` map for `.`
  and `./utils` (`package.json:5-20`).
- `sideEffects: false` is declared and the published file list is limited to
  build outputs plus README, license, and changelog (`package.json:20-28`).
- The npm registry metadata for `2.0.8` matches the local public package shape:
  ESM, explicit exports, React 19 peer dependencies, and npm-only publishing.
- The npm release includes provenance attestations.
- CI runs the canonical package validation on Node 20 and 22, and builds both
  examples.
- GitHub Actions workflows pin third-party actions by full commit SHA.
- Dependabot security updates, secret scanning, and secret scanning push
  protection are enabled.
- `main` and `dev` both have active branch rulesets requiring PRs, blocking
  deletion, blocking non-fast-forward updates, and requiring the `ci` status.

## Findings

### 1. High - Release publishing still depends on a long-lived npm token

Evidence:

- The release workflow requests OIDC capability with `id-token: write`, but also
  injects `NPM_TOKEN` and `NODE_AUTH_TOKEN` into the Changesets publish step
  (`.github/workflows/publish.yml:31-66`).
- The repository has a live `NPM_TOKEN` Actions secret and no deployment
  environment protecting publish.
- npm now recommends trusted publishing over long-lived tokens when available,
  and the package already satisfies the public repository and public package
  shape that enables automatic provenance.

Impact:

- A long-lived npm token creates rotation and blast-radius risk. If a publish
  workflow dependency, action, or local release script path is compromised while
  the token is present, the credential remains useful until revoked.

Recommendation:

- Configure npm trusted publishing for `.github/workflows/publish.yml`.
- Remove `NPM_TOKEN`, `NODE_AUTH_TOKEN`, and token-backed npm auth from the
  publish path once OIDC publishing is verified.
- Keep `id-token: write` only on the publish job that actually needs it.
- Consider a protected GitHub environment for npm publishing if manual approval
  is desired.

Verification:

- Publish a test patch through the trusted publisher path.
- Confirm the package still gets npm provenance and that `gh secret list` no
  longer shows an npm publish token for this repo.

References:

- npm trusted publishing docs:
  https://docs.npmjs.com/trusted-publishers/
- npm provenance docs:
  https://docs.npmjs.com/generating-provenance-statements

### 2. Low - CI and release workflows do unnecessary install-time builds

Evidence:

- The root `prepare` script runs the full package build (`package.json:29-34`).
- CI runs `npm ci` and then `npm run ci` (`.github/workflows/ci.yml:36-40`).
- `npm run ci` itself starts with another full `npm run build`
  (`package.json:43`).
- The latest live CI run shows `npm ci` running `prepare -> npm run build`, then
  `npm run ci` running `npm run build` again.
- The release workflow has the same `npm ci` install-time build behavior before
  Changesets runs (`.github/workflows/publish.yml:52-59`).

Impact:

- Every CI matrix entry pays for at least one avoidable full build. On the
  current small package this is seconds, but it scales poorly as tests,
  examples, or generated artifacts grow.
- Install has side effects, which makes CI and release behavior harder to reason
  about. Release jobs should install dependencies first, then explicitly run
  validation/build steps.

Recommendation:

- Replace `prepare` with a publish-oriented lifecycle such as `prepack` or make
  `prepare` conditional only if git-install support is intentionally required.
- In CI, use `npm ci --ignore-scripts` if install-time scripts are not needed,
  then run explicit validation commands.
- Keep a single explicit package build in `npm run ci`.
- If example builds need a root package build, make that step explicit in the
  `example-builds` job instead of relying on `npm ci` side effects.

Verification:

- Run `npm ci --ignore-scripts`, `npm run ci`, and both example builds from a
  clean checkout.
- Inspect a live CI log and confirm `npm ci` no longer invokes `prepare`.

### 3. High - Changelog policy and Changesets automation are out of sync

Evidence:

- The release notes guidelines require `## [Unreleased]` at the top and version
  sections formatted as `## [x.y.z] - YYYY-MM-DD`
  (`RELEASE_NOTES_GUIDELINES.md:58-73`).
- The current changelog starts with generated `## 2.0.8` and `## 2.0.7`
  sections, then places `## [Unreleased]` below them (`CHANGELOG.md:1-29`).
- The 2.0.7 and 2.0.8 sections describe the same hardening work
  (`CHANGELOG.md:3-23`).
- The Changesets config points to a custom changelog formatter
  (`.changeset/config.json:1-10`), while repo rules also require manual
  `CHANGELOG.md` updates for user-facing changes.

Impact:

- Release notes are no longer predictable. Maintainers cannot tell whether the
  human changelog or generated Changesets section is authoritative.
- Duplicated entries make release history harder for users to trust.
- The current policy asks maintainers to update two release-note sources, but
  the release automation does not preserve the documented changelog format.

Recommendation:

- Choose one source of truth:
  - Option A: Let Changesets own version sections and update
    `RELEASE_NOTES_GUIDELINES.md` to match the generated format.
  - Option B: Keep Keep a Changelog manually and disable or replace Changesets
    changelog writing with a step that preserves the documented format.
- Remove the duplicated 2.0.7/2.0.8 content and restore `## [Unreleased]` to the
  top.
- Add a lightweight changelog structure check in CI if the manual format remains
  required.

Verification:

- Run a dry release/version update and inspect the generated changelog before
  merging a release PR.

### 4. Medium - Dependency Review runs but is not a required merge gate

Evidence:

- `.github/workflows/dependency-review.yml` runs on PRs to `main` and `dev`.
- Live branch rulesets for `main` and `dev` require only the `ci` status check.
  `Dependency Review` is not listed as required.

Impact:

- If Dependency Review fails but `ci` passes, branch protection still allows the
  PR to merge. That makes the workflow advisory while still consuming CI time.

Recommendation:

- Either add `Dependency Review` as a required status check on `main` and `dev`,
  or fold dependency policy into the aggregate required `ci` check.
- If the workflow is intentionally advisory, document that and consider whether
  it is worth running on every PR.

Verification:

- Query the rulesets after the change and confirm the required status list
  includes the intended dependency gate.

### 5. Medium - Repository Actions settings are broader than the workflow files

Evidence:

- Live repository Actions settings:
  - `allowed_actions: all`
  - `sha_pinning_required: false`
  - `default_workflow_permissions: write`
  - `can_approve_pull_request_reviews: true`
- The workflow files mostly set explicit least-privilege job permissions and
  already pin actions by full SHA.

Impact:

- The workflow files are better locked down than the repository defaults. A
  future workflow could accidentally inherit write permissions or use an
  unpinned third-party action even though the current workflows are careful.

Recommendation:

- Set default workflow permissions to read.
- Keep write permissions only in jobs that explicitly need them.
- If the `Sync main -> dev` workflow must create PRs with `GITHUB_TOKEN`, keep
  that exception documented; otherwise disable GitHub Actions PR creation and
  approval.
- Enable repository-level SHA pinning enforcement now that the workflows are
  already pinned.
- Optionally restrict allowed actions to GitHub-owned actions plus the specific
  third-party actions currently used.

Verification:

- Re-query `actions/permissions` and `actions/permissions/workflow`.
- Open a small workflow-only PR and confirm all workflows still run with the
  intended permissions.

References:

- GitHub Actions repository settings:
  https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository
- GitHub SHA pinning enforcement announcement:
  https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/

### 6. Medium - Public support and security reporting paths do not match package metadata

Evidence:

- `package.json` advertises the GitHub issues URL as the package bug tracker
  (`package.json:83-86`).
- README links to Issues and Discussions (`README.md:31-39`).
- Live repository settings have Issues disabled, Discussions disabled, and no
  GitHub security policy enabled.
- The only `SECURITY.md` file is under `examples/`, not at the repository root.

Impact:

- Package users following npm metadata or README links do not get a working bug
  report path.
- Security-sensitive geography loading is part of the package value proposition,
  but the repository does not expose a standard security reporting policy.

Recommendation:

- Enable GitHub Issues or replace `bugs.url` and README links with the actual
  supported contact path.
- Enable Discussions only if you want to maintain that support channel; otherwise
  remove the README link.
- Add a root `SECURITY.md` and enable GitHub security policy/private
  vulnerability reporting if you want a standard vulnerability intake path.

Verification:

- Re-query `hasIssuesEnabled`, `hasDiscussionsEnabled`, and
  `isSecurityPolicyEnabled`.
- Check the npm package page after the next publish to confirm the bug tracker
  points somewhere usable.

### 7. Medium - CI is green while a public type contract is not true at runtime

Evidence:

- `PreparedFeature` declares `rsmKey` as required (`src/types.ts:397-400`).
- `prepareFeatures` returns spread features with `svgPath`, but never creates
  `rsmKey` (`src/utils/geography-processing.ts:204-225`).
- README usage keys geographies by `geo.rsmKey` (`README.md:119-124`).
- Tests also key geographies by `geo.rsmKey`
  (`tests/geographies-integration.test.tsx:38`).
- A runtime check against the built output produced:
  `{ "hasRsmKey": false, "rsmKey": null, "keys": ["type","properties","geometry","svgPath"] }`.

Impact:

- Consumers following the README can get unstable or missing React keys for
  feature collections without an ID.
- TypeScript promises a required field that runtime objects do not actually
  contain.
- The test suite can remain green while React warnings leak through.

Recommendation:

- Generate a stable `rsmKey` in `prepareFeatures`, or make the public docs and
  types stop promising it.
- Add a regression test that asserts prepared features contain the documented
  key.
- Consider failing tests on unexpected React `console.error` warnings so CI does
  not normalize noisy React output.

Verification:

- Run the targeted regression test and `npm run ci`.
- Confirm the runtime check reports `hasRsmKey: true`.

### 8. Low - Branch cleanup is manual and stale branches are already accumulating

Evidence:

- Live repository setting `delete_branch_on_merge` is `false`.
- Live branch list includes several non-protected historical task branches and a
  stale `changeset-release/main` branch.
- Repo guidance says follow-up work should start from a fresh branch after a PR
  is merged (`AGENTS.md:25-33`).

Impact:

- Stale branches make it harder to identify active release or maintenance work.
- A stale `changeset-release/main` branch is especially easy to misread during
  release triage.

Recommendation:

- Enable delete branch on merge.
- Periodically prune merged task branches and stale release branches.
- Keep protected long-lived branches limited to `main` and `dev`.

Verification:

- Re-query `delete_branch_on_merge`.
- Confirm the branch list contains only active task branches plus protected
  long-lived branches.

### 9. Low - Branch rulesets require PRs but do not require reviews

Evidence:

- Live `main` and `dev` rulesets require pull requests, but
  `required_approving_review_count` is `0`.
- Both rulesets include a repository-role bypass actor with `bypass_mode: always`.

Impact:

- The rules prevent direct pushes for normal paths, but they do not require an
  independent approval before merging.
- Admin bypass can be useful for emergency recovery, but it weakens the value of
  the documented protected branch model if used casually.

Recommendation:

- For a professional release branch, consider at least one approving review on
  `main`, plus required review-thread resolution.
- If solo-maintainer flow makes approvals impractical, document that PRs are
  required for auditability rather than independent review.
- Limit bypass use to emergencies and keep it visible in release notes or
  operational logs when used.

Verification:

- Re-query the rulesets and confirm the desired review settings.

### 10. Low - Bundle budget tooling exists but is not wired into the required gate

Evidence:

- `bundle-monitor.config.js` defines bundle thresholds and CI-style enforcement
  settings (`bundle-monitor.config.js:1-174`).
- `package.json` exposes bundle analysis scripts (`package.json:46-50`).
- The required `ci` script does not run bundle threshold analysis
  (`package.json:43`).
- `npm pack --dry-run` currently shows a small package footprint, so this is not
  an immediate package-size problem.

Impact:

- Bundle growth can merge as long as the build and tests pass.
- The config creates an expectation of enforcement that CI does not currently
  provide.

Recommendation:

- Either remove/de-emphasize unused CI-style bundle config, or add a focused
  bundle-size check to the required `ci` path.
- If added, keep it cheap: analyze only built `dist` files and avoid generating
  persistent report artifacts in CI.

Verification:

- Run `npm run analyze` or a smaller no-output budget command in CI and confirm
  it fails on an intentionally lowered threshold.

## Additional Observations

- `main` is the default branch, while day-to-day work is documented as targeting
  `dev`. That is a reasonable release-oriented setup, but it increases the
  chance of accidental PRs to `main`. A PR template or contribution note could
  make the target branch explicit without changing the default branch.
- The current package has no runtime dependency vulnerabilities according to
  `npm audit --omit=dev`.
- React and React DOM development dependencies are current within the installed
  range. The only root `npm outdated` result is the next major ESLint release.
- GitHub Pages is not enabled, which is fine for an npm-only library unless you
  later decide to host documentation or demos.

## Suggested Next Steps

1. Fix release-note ownership first. It is currently the clearest maintenance
   footgun because automation and policy disagree.
2. Remove install-time build side effects by replacing `prepare` with explicit
   build steps or a publish-only lifecycle.
3. Move npm publishing to trusted publishing and remove the long-lived
   `NPM_TOKEN`.
4. Make `Dependency Review` either required or intentionally advisory.
5. Align public support links with live GitHub settings and add a root security
   policy.
6. Fix or document the `rsmKey` runtime contract.
7. Tighten repository defaults after confirming the sync workflow still has the
   permissions it needs.
