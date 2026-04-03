# Changelog Guidelines

Use this guide only when a task needs a `CHANGELOG.md` update.

## When to update the changelog

Update `CHANGELOG.md` when a change is:

- user-facing
- package-impacting
- relevant to upgrades, migration, security, published build behavior, or public API usage

Do not update `CHANGELOG.md` for changes that are only:

- local workflow or editor configuration
- internal refactors with no external effect
- test-only, CI-only, or dependency-lockfile-only maintenance
- documentation-only edits that do not change package behavior or supported usage

## Standard format

Follow this structure exactly:

1. Keep `## [Unreleased]` at the top.
2. Add entries under one of these headings only:
   - `### Added`
   - `### Changed`
   - `### Deprecated`
   - `### Removed`
   - `### Fixed`
   - `### Security`
3. On release, move `Unreleased` items into a new version section:
   - `## [x.y.z] - YYYY-MM-DD`
4. After a release, reset `## [Unreleased]` to:
   - `No unreleased user-facing or package-impacting changes.`

## Writing rules

- Use plain English.
- Do not use emojis.
- Do not use commit hashes in bullet text.
- Do not mention internal tools, review bots, IDEs, or agent names.
- Write from the package user's perspective, not from the implementation's perspective.
- Prefer one bullet per user-visible outcome.
- Keep bullets concise, but include enough context to explain why the change matters.
- Group related work into one bullet when it represents a single outcome for users.
- Mention breaking changes explicitly in the relevant section.

## Relationship to changesets

- For every user-facing or package-impacting change, keep the `.changeset/*.md` entry and the `CHANGELOG.md` entry aligned.
- The changeset exists for versioning and release automation.
- `CHANGELOG.md` exists for human-readable release history.
- If a change does not need a changeset, it usually does not need a changelog entry either.
