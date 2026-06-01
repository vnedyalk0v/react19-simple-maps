# Repository Health Audit - 2026-06-01

## Verdict

The package setup is broadly healthy: the React 19 peer dependency policy, ESM-only exports, build output, tests, example builds, npm package contents, and npm publication metadata all line up with the library goals.

The main risks are repository operations and maintenance hygiene rather than runtime package correctness. The highest-priority follow-ups are to align GitHub support/security settings with the public README and package metadata, fix the `main` to `dev` sync automation mismatch, decide whether dependency review must block merges, tighten default Actions permissions, and clean up release-note and bundle-monitor maintenance drift.

## Scope Reviewed

- Package and build metadata: `package.json`, `package-lock.json`, `rollup.config.js`, `tsconfig*.json`.
- Quality tooling: ESLint, Prettier, Vitest, build verification, bundle monitor scripts.
- CI/CD: `.github/workflows/ci.yml`, `.github/workflows/publish.yml`, `.github/workflows/dependency-review.yml`, `.github/workflows/sync-main-to-dev.yml`, `.github/dependabot.yml`.
- Release process: `.changeset`, `CHANGELOG.md`, `RELEASE_NOTES_GUIDELINES.md`, GitHub releases, npm registry metadata.
- Public docs and support: `README.md`, `docs/ci-cd.md`, `docs/support.md`, `SECURITY.md`, examples.
- Live settings checked with GitHub and npm APIs: repository features, branch rulesets, Actions permissions, workflow list, releases, private vulnerability reporting, npm package metadata.

## Checks Performed

- `git fetch origin`; updated local `dev` to `origin/dev`; created `audit/repository-health-2026-06-01`.
- `npm run ci`: passed on local Node `v24.14.1` / npm `11.12.1`; 8 test files and 87 tests passed.
- `npm run analyze`: passed; 4/4 bundles compliant; total output `93.42 KB` raw and `27.53 KB` gzip.
- `npm pack --dry-run`: first run hit a local npm cache/log permission issue; rerun with a temporary npm cache passed and reported 10 package files, `65.3 kB` tarball, `203.2 kB` unpacked.
- Example validation matched the CI example-build intent:
  - `examples/basic-map`: `npm ci --ignore-scripts` passed, `npm run build` passed.
  - `examples/interactive-map`: `npm ci --ignore-scripts` passed, `npm run build` passed.
- Live GitHub checks:
  - Active branch rulesets exist for `main` and `dev`.
  - Required status checks in both rulesets currently require only `ci`.
  - Classic branch protection API returns 404, which is expected if rulesets are the source of truth.
  - Default Actions workflow permission is `write`; SHA pinning is not enforced at settings level.
  - Issues, Discussions, auto-merge, automatic branch deletion, and private vulnerability reporting are currently disabled.
- Live npm metadata:
  - Latest published version is `2.0.9`.
  - Published package has React/React DOM peer dependencies `>=19.0.0`, ESM exports for `.` and `./utils`, `sideEffects: false`, and npm provenance metadata.

## Findings

### 1. [High] Public support links point to disabled GitHub features

- Location: `README.md:33-39`, `package.json:84-86`, `SECURITY.md:16-18`.
- Confidence: High.
- Evidence: `README.md` links to Issues and Discussions, and `package.json` publishes the npm `bugs.url` as the repository Issues URL. Live GitHub settings returned `has_issues=false`, `has_discussions=false`, and private vulnerability reporting returned `enabled=false`.
- Trigger: A user clicks the README Issues or Discussions links, follows the npm package `bugs` link, or tries to follow the preferred private vulnerability reporting path.
- Impact: Public support and vulnerability-reporting paths are misleading. That is a package-maintenance problem because users cannot reliably report bugs, ask migration questions, or disclose security issues through the documented channels.
- Recommendation: Enable GitHub Issues and Discussions, enable private vulnerability reporting, and keep `package.json` `bugs.url` pointing at Issues. If Issues or Discussions should remain disabled, remove or replace the README/package links with the actual supported contact path.
- Verification: `gh api repos/vnedyalk0v/react19-simple-maps --jq '{has_issues,has_discussions}'` should return `true` for the enabled channels, and `gh api repos/vnedyalk0v/react19-simple-maps/private-vulnerability-reporting --jq '.'` should return `{"enabled":true}` if private reporting is intended.

### 2. [Medium] The `main` to `dev` sync workflow cannot auto-merge with current repo settings

- Location: `.github/workflows/sync-main-to-dev.yml:76-111`, `docs/ci-cd.md:93-98`.
- Confidence: High.
- Evidence: The workflow calls `enablePullRequestAutoMerge`, and `docs/ci-cd.md` says it enables auto-merge for sync PRs. Live GitHub repository settings returned `allow_auto_merge=false`.
- Trigger: A release lands on `main`, the sync workflow creates or finds a `main` to `dev` PR, then the auto-merge mutation runs while repository auto-merge is disabled.
- Impact: The workflow catches the failure as a warning and can leave release/changelog/version sync PRs open indefinitely. That lets `dev` drift from `main`, which directly conflicts with the documented branch model.
- Recommendation: Either enable repository auto-merge and keep the workflow/docs as-is, or remove the auto-merge step and update `docs/ci-cd.md` to make manual sync PR merging explicit.
- Verification: `gh api repos/vnedyalk0v/react19-simple-maps --jq '.allow_auto_merge'` should match the chosen workflow behavior. After the next release, confirm the sync PR either auto-merges or is intentionally manual.

### 3. [Medium] Dependency Review is visible but not merge-blocking

- Location: `.github/workflows/dependency-review.yml:1-18`; live rulesets `protect-main` and `protect-dev`.
- Confidence: High.
- Evidence: The Dependency Review workflow runs on PRs to `main` and `dev`, but both active branch rulesets list only the required `ci` status check. `dependency-review` is not required.
- Trigger: A dependency-changing PR receives a failing dependency-review result while the aggregate `ci` status passes.
- Impact: The PR can still satisfy branch rulesets and merge. For a published npm library, that weakens supply-chain controls exactly where dependency changes are most relevant.
- Recommendation: Make `dependency-review` a required check in both branch rulesets, or fold `actions/dependency-review-action` into the `ci` workflow and aggregate job so the existing required `ci` check blocks on it.
- Verification: `gh api repos/vnedyalk0v/react19-simple-maps/rulesets/<id> --jq '.rules[] | select(.type=="required_status_checks")'` should show both `ci` and the dependency-review status, or the CI workflow should visibly include Dependency Review before the aggregate `ci` job can pass.

### 4. [Medium] Default GitHub Actions token permissions are broader than needed

- Location: live repository Actions settings; `docs/ci-cd.md:125-134`.
- Confidence: High.
- Evidence: Live settings returned `default_workflow_permissions="write"` and `can_approve_pull_request_reviews=true`. The checked-in workflows mostly declare explicit permissions, but `docs/ci-cd.md` already lists read-only default workflow permissions as an external follow-up.
- Trigger: A future workflow is added without an explicit `permissions:` block, or a generated/dynamic workflow relies on the repository default token scope.
- Impact: New automation gets write access by default, increasing the blast radius of workflow mistakes or compromised actions.
- Recommendation: Set the repository default workflow token permission to read-only and disable GitHub Actions approval of pull request reviews unless there is a concrete automation requirement. Keep explicit write scopes only in workflows that need them, such as release and sync.
- Verification: `gh api repos/vnedyalk0v/react19-simple-maps/actions/permissions/workflow --jq '.'` should return `default_workflow_permissions: "read"` and `can_approve_pull_request_reviews: false` if that policy is adopted.

### 5. [Medium] Changelog generation has visible structure drift

- Location: `CHANGELOG.md:3-18`, `CHANGELOG.md:29-39`, `.changeset/config.json:3`.
- Confidence: High.
- Evidence: `CHANGELOG.md` now starts with version `2.0.9` before the "All notable changes..." introduction, while older entries use a different linked-and-dated heading style. Versions `2.0.8` and `2.0.7` also contain the same "Hardened geography validation and cache isolation" patch text.
- Trigger: A maintainer or user reads the changelog to understand published history, or a release PR appends another generated section using the current custom formatter.
- Impact: Release history looks partially hand-edited and partially generated. That reduces trust in release notes and makes future changelog maintenance harder.
- Recommendation: Fix the custom Changesets formatter or generated output so new sections preserve the expected changelog structure, then do explicit changelog maintenance to normalize the current top section and remove or explain duplicate release text without changing published history.
- Verification: Run a dry release/versioning check in a throwaway branch or temp copy and confirm the generated `CHANGELOG.md` keeps the introduction at the top and uses a consistent heading format.

### 6. [Low] Bundle-monitor configuration is disconnected from the scripts that enforce bundle budgets

- Location: `bundle-monitor.config.js:4-54`, `bundle-monitor.config.js:139-153`, `scripts/enhanced-bundle-monitor.js:13-46`, `scripts/enhanced-bundle-monitor.js:338-345`, `package.json:46-48`.
- Confidence: High.
- Evidence: `package.json` runs `scripts/enhanced-bundle-monitor.js`, `scripts/analyze-bundle.js`, and `scripts/bundle-dashboard.js`. Searches found no import of `bundle-monitor.config.js`. The active scripts hard-code bundle targets, thresholds, report behavior, and output paths instead.
- Trigger: A maintainer changes `bundle-monitor.config.js` thresholds or CI options expecting `npm run analyze` or dashboard output to honor them.
- Impact: The repository carries an authoritative-looking config file that is not authoritative. That is avoidable maintenance bloat and can cause false confidence about bundle budgets or CI behavior.
- Recommendation: Either wire the analyzer scripts to read `bundle-monitor.config.js`, or delete/replace the config with a short documented source of truth that the scripts actually use.
- Verification: After cleanup, `rg "bundle-monitor.config"` should show real imports/usages, or the file should be gone and bundle thresholds should have a single source of truth.

## Needs Verification

- npm trusted publishing configuration cannot be fully verified from the public registry alone. The latest npm package has provenance metadata, but `.github/workflows/publish.yml` still passes `NPM_TOKEN` and `NODE_AUTH_TOKEN`; confirm in npm/GitHub settings whether trusted publishing is active and whether the token can be removed.
- Branch rulesets have `required_approving_review_count: 0`, `required_review_thread_resolution: false`, and a repository-role bypass actor. That may be intentional for a solo-maintained library, but it should be an explicit maintainer policy rather than an accidental default.
- Automatic branch deletion is disabled (`delete_branch_on_merge=false`) even though `docs/ci-cd.md` lists it as a follow-up. Decide whether to enable it to reduce stale branch maintenance.
- SHA pinning is practiced in checked-in workflows, but live settings have `sha_pinning_required=false`. If the repository plan is to require SHA-pinned actions globally, enable that setting as well.

## Positive Signals

- The package is ESM-only with an explicit `exports` map for `.` and `./utils`, `sideEffects: false`, and React/React DOM peer dependencies set to `>=19.0.0`.
- `npm run ci` passed locally, including build, type-check, lint, format check, tests, and build verification.
- The CI workflow uses a Node 20/22 matrix and a separate example-build job, which is appropriate for the documented Node support policy.
- Both example apps build successfully against the local package via `file:../..`.
- `npm pack --dry-run` matches the npm registry package shape: 10 published files, no examples or internal scripts, and only the intended dist files plus README, LICENSE, CHANGELOG, and `package.json`.
- Active branch rulesets exist for both `main` and `dev`, requiring PR flow, non-fast-forward protection, deletion protection, and the `ci` status check.
- Workflows are pinned to full action SHAs in the checked-in workflow files.
- The npm registry reports latest `2.0.9` with provenance metadata and expected React 19 peer dependencies.

## Suggested Next Steps

1. Enable or correct the public support channels: Issues, Discussions, and private vulnerability reporting.
2. Fix the sync automation mismatch by enabling auto-merge or documenting and enforcing manual sync PR handling.
3. Decide whether Dependency Review should be required; for this package, requiring it or folding it into `ci` is the cleaner professional default.
4. Tighten default Actions permissions to read-only and keep per-workflow write scopes explicit.
5. Clean up changelog generation and normalize the current `CHANGELOG.md` top section through explicit changelog maintenance.
6. Remove or connect the unused bundle-monitor config so bundle budget settings have one source of truth.
