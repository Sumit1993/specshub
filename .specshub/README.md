# specshub — AI agent docs (in-repo)

> This is the specshub-managed view of specshub itself. We dogfood our own
> convention: this CLI's design lives in its own `.specshub/` directory in
> in-repo mode.

## What lives here

| File / dir | Purpose |
|------------|---------|
| [`metadata.json`](metadata.json) | specshub's own metadata (mode=in-repo, project=specshub) |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | Comprehensive design reference — file layouts, schemas, CLI surface, skills, install mechanism |
| [`decisions/`](decisions/) | ADRs for load-bearing architectural decisions |

## Read order

For agents working on this codebase:

1. **`ARCHITECTURE.md`** — the design overview. Start here.
2. **`decisions/0001-no-symlinks.md`** — why no symlinks (vs an early prototype that used them)
3. **`decisions/0002-hand-authored-skills.md`** — why skills are hand-authored, no sync pipeline
4. **`decisions/0003-delegate-install-to-vercel-labs-skills.md`** — why install is delegated
5. **`decisions/0004-remove-teacher-breadcrumb.md`** — why no user-level teacher snippet

For users wanting to USE specshub, see the project [`README.md`](../README.md)
at the repo root.

## Why this is here

specshub manages AI agent docs for code repos. It would be strange not to use
its own convention on its own repo. So:

- `mode: "in-repo"` — these docs are part of the specshub repo's own git
  history
- No `specs/`, `.specify/`, or per-feature SDD artifacts yet (the project is
  small enough that ADRs are the right granularity)
- ADRs are created on demand as architectural decisions need to be recorded
- Future features may use `/specify` and friends to author per-feature specs
  here

## Adding new ADRs

When a substantive architectural decision is made, add a numbered file in
[`decisions/`](decisions/) following the existing pattern. Get the next
number by listing the dir; the ADRs are sequential.

Use the `/constitution` skill (when invoked) to author or amend principles
in `.specify/memory/constitution.md` — that file doesn't exist yet; it'll
be created on demand by the first `/constitution` invocation.

## Commit hygiene

This is mode=in-repo, so all docs commits go into the specshub repo itself.
Standard git workflow; no two-repo dance.
