# Release Notes Guidelines

Use this guide only when a task needs a `.changeset/*.md` file or a `CHANGELOG.md` update.

## When release notes are required

Create or update release notes when a change is:

- user-facing
- package-impacting
- relevant to upgrades, migration, security, published build behavior, or public API usage

Do not create or update release notes for changes that are only:

- local workflow or editor configuration
- internal refactors with no external effect
- test-only, CI-only, or dependency-lockfile-only maintenance
- documentation-only edits that do not change package behavior or supported usage

## Shared writing rules

Apply these rules to both `.changeset/*.md` files and `CHANGELOG.md`:

- Use plain English.
- Do not use emojis.
- Do not use commit hashes in bullet text.
- Do not mention internal tools, review bots, IDEs, or agent names.
- Write from the package user's perspective, not from the implementation's perspective.
- Prefer one bullet per user-visible outcome.
- Keep bullets concise, but include enough context to explain why the change matters.
- Group related work into one bullet when it represents a single outcome for users.
- Mention breaking changes explicitly.

## Changeset rules

For every user-facing or package-impacting change, add a `.changeset/*.md` file.

Use this structure:

```md
---
'@vnedyalk0v/react19-simple-maps': patch
---

Short summary sentence in plain English.

- Optional supporting bullet with user-visible detail.
- Optional supporting bullet with migration, security, or compatibility context.
```

Additional rules:

- The first sentence should stand on its own in release notes.
- Use `patch`, `minor`, or `major` consistently with semantic versioning.
- Keep the summary focused on the user-visible outcome, not the implementation steps.
- Optional bullets are allowed only when they add useful release context.

## Changelog rules

Keep `CHANGELOG.md` in this structure:

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

## Relationship between changesets and the changelog

- Keep the `.changeset/*.md` entry and the `CHANGELOG.md` entry aligned.
- The changeset exists for versioning, release PRs, and GitHub release text.
- `CHANGELOG.md` exists for human-readable project history.
- If a change does not need a changeset, it usually does not need a changelog entry either.
