---
type: always_apply
---

# react19-simple-maps Project Guidelines

This file is a thin compatibility mirror for tools that read Augment rules directly.
`AGENTS.md` is the source of truth. If these files ever drift, follow `AGENTS.md` and sync this file back to it.

These rules apply when editing library code in `src/` and docs/examples in `examples/`.

## Core Rules

- This repo is a reusable React 19+ npm package, not an application. Optimize for stable API, small runtime, SSR safety, tree-shakeable ESM output, KISS, DRY, and no bloatware.
- Follow the git workflow from `AGENTS.md`: branch from `dev`, update from `origin/dev` first, never push directly to `main`, and open a PR.
- For every user-facing or package-impacting change, create a new `.changeset/*.md` file and update `CHANGELOG.md` using `RELEASE_NOTES_GUIDELINES.md`.
- Read `RELEASE_NOTES_GUIDELINES.md` only when the task requires a changeset or changelog update.
- Do not update release notes for tooling-only, CI-only, lockfile-only, or other internal-only maintenance.
- Never reference internal tooling, review bots, or IDE names in changesets, changelog entries, commit messages, code comments, or other user-facing text.
- Keep components and hooks pure during render. Use Effects only for external-system synchronization, prefer deriving values during render, and use `memo` / `useMemo` only as performance optimizations.
- Prefer `ref` as a prop in React 19. Use `forwardRef` only when unavoidable.
- Prefer existing utilities over new abstractions. Avoid app-specific patterns, unnecessary dependencies, and speculative architecture.
- Target React 19+, keep the package ESM-only, preserve the `exports` map, and avoid unnecessary side effects.
- Prefer function components, use class components only for error boundaries, and memoize expensive geography work where it materially helps.
- Avoid `any`; use `unknown`, type guards, or proper generics, and prefer branded coordinate helpers for new APIs.
- Maintain backward compatibility unless a breaking change is explicitly requested.
- For URL-based geography data, use the existing fetch and validation utilities, preserve HTTPS-only defaults and private IP blocking, and update SRI hashes only for verified URLs.
- Keep documentation and examples aligned with the implementation, and add focused deterministic tests for behavior changes.
