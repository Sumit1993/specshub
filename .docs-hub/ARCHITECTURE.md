# docs-hub — architecture

> Design reference for v0.0.1. Captures the file layout, metadata schemas, CLI
> surface, skill bundle, and install mechanism. For the load-bearing
> architectural decisions and why each one was made, see
> [`decisions/`](decisions/).

## What docs-hub is

docs-hub is a CLI + plugin that gives every code repo a structured place for
its **AI agent docs** — planning material, design specs, ADRs, the context
that AI agents need to understand the project. It works across three
deployment modes (in-repo, external hub, hybrid) and ships bundled skills
that AI agents use directly: a `docs-hub` awareness skill plus 7 SDD
lifecycle skills (`/constitution`, `/specify`, `/clarify`, `/plan`, `/tasks`,
`/analyze`, `/implement`) adapted from
[github/spec-kit](https://github.com/github/spec-kit).

## Three scenarios

Each **code repo** independently picks one (or starts with one and adds the
other via `link` for hybrid).

| Scenario | Where docs live | When to use it |
|----------|-----------------|----------------|
| **In-repo** | `<code-repo>/.docs-hub/` (real dir, committed to code repo's git) | Single-repo project; OSS where docs are part of the open-source story; personal projects. Matches the spec-kit / BMad / Kiro convention. |
| **External** | `<external-hub>/projects/<project>/.docs-hub/` (separate hub repo) | Multi-repo portfolio with cross-cutting MAP/cross-refs; strategy or pre-launch material that shouldn't live in a public code repo. One hub can host N projects. |
| **Hybrid** | In-repo storage, hub-resident *registration* | Code repo has its own docs (in-repo) AND wants to participate in an external hub for cross-cutting context. Created by `init --in-repo` then `link <hub>` — the hub knows about the code repo, but its specs stay with the code. |

No symlinks anywhere. See [ADR 0001](decisions/0001-no-symlinks.md).

## File layouts

### Code repo (any scenario)

```
<code-repo>/
├── src/
├── .docs-hub/
│   ├── metadata.json                           # this repo's metadata
│   ├── .specify/                               # spec-kit-style governance
│   │   └── memory/constitution.md              # created on demand by /constitution
│   ├── specs/                                  # per-feature SDD artifacts
│   │   └── 001-auth-flow/
│   │       ├── spec.md                         # created by /specify
│   │       ├── plan.md                         # created by /plan
│   │       ├── tasks.md                        # created by /tasks
│   │       └── analysis.md                     # created by /analyze
│   └── decisions/                              # ADRs (created on demand)
└── ...                                         # docs-hub never touches AGENTS.md
                                                # or CLAUDE.md (see ADR 0005)
```

For **in-repo mode** and **hybrid mode**, this directory holds the actual
docs. For **external mode**, only `metadata.json` is meaningful here.

The presence of `.docs-hub/metadata.json` is the sole signal an agent needs
to engage with docs-hub. The `docs-hub` awareness skill (auto-invoked when
the file is present) reads it and resolves project name + mode + docs root
at runtime — no static preamble in AGENTS.md / CLAUDE.md required.

### External hub

```
<external-hub>/
├── metadata.json                               # hub registry, AT ROOT (not nested)
├── IDENTITY.md                                 # context-wide identity, voice
├── MAP.md                                      # project graph
├── cross-refs/                                 # relationships between projects
├── archive/                                    # historical / sensitive material
└── projects/
    └── <project-name>/                         # one dir per hub-owned project
        └── .docs-hub/                          # nested for symmetry with code-repo
            ├── .specify/memory/constitution.md
            ├── specs/001-auth-flow/spec.md
            └── decisions/
            # NO metadata.json here — top-level hub registry covers it
```

Hub-owned projects have a `projects/<project-name>/.docs-hub/` directory with
the full docs structure. In-repo projects (hybrid mode) have **no directory
under `projects/`** — they're only known via the hub's top-level
`metadata.json` registry entry.

**Asymmetry rationale**: the hub's `metadata.json` lives at the root because
the hub repo is entirely docs (no segregation namespace needed). The code
repo's `metadata.json` lives inside `.docs-hub/` because the code repo has
lots of other content that needs to stay separate. Inside each project's docs
space, the structure is fully symmetric — same `.specify/`, `specs/`,
`decisions/` shape.

## Metadata schemas

### `<code-repo>/.docs-hub/metadata.json`

```jsonc
{
  "schema": "docs-hub.v1",
  "mode": "in-repo",                            // or "external"
  "project": "prismalens-agents",               // basename of code repo, overridable
  "hub_path": null,                             // populated when external OR hub_refs[] not empty
  "hub_repo": null,
  "hub_refs": [],                               // hybrid: list of external hubs this project participates in
  "linked_at": "2026-05-25T..."
}
```

For hybrid mode:

```jsonc
{
  "schema": "docs-hub.v1",
  "mode": "in-repo",
  "project": "prismalens-agents",
  "hub_path": null,
  "hub_repo": null,
  "hub_refs": [
    {
      "hub_path": "/home/sumit/code/prismalens-docs-hub",
      "hub_repo": "git@github.com:sumit/prismalens-docs-hub.git",
      "project": "prismalens-agents"
    }
  ],
  "linked_at": "2026-05-25T..."
}
```

For external mode:

```jsonc
{
  "schema": "docs-hub.v1",
  "mode": "external",
  "project": "prismalens-platform",
  "hub_path": "/home/sumit/code/prismalens-docs-hub",
  "hub_repo": "git@github.com:sumit/prismalens-docs-hub.git",
  "hub_refs": [],                               // hub_refs is for hybrid only
  "linked_at": "2026-05-25T..."
}
```

### `<external-hub>/metadata.json`

```jsonc
{
  "schema": "docs-hub.v1",
  "name": "prismalens-docs-hub",
  "created_at": "2026-05-25T...",
  "projects": [
    {
      "name": "prismalens-agents",
      "storage": "in-repo",                     // hub has no projects/prismalens-agents/ dir
      "code_repo_path": "/home/sumit/code/prismalens-agents",
      "code_repo_url": "git@github.com:sumit/prismalens-agents.git"
    },
    {
      "name": "prismalens",
      "storage": "hub-owned",                   // docs at <hub>/projects/prismalens/.docs-hub/
      "code_repo_path": "/home/sumit/code/prismalens",
      "code_repo_url": "git@github.com:sumit/prismalens.git"
    }
  ]
}
```

Single source of truth — no per-project metadata files inside
`projects/<name>/`. The hub's top-level registry is the authoritative list.

## CLI surface

| Command | Purpose |
|---------|---------|
| `docs-hub init --in-repo` | Scenario 1: create `.docs-hub/` in current code repo, write metadata |
| `docs-hub init --external [--name X]` | Scenario 2: create new external hub (sibling to code repo by default, named `<repo>-docs-hub`), add current repo as first project |
| `docs-hub link <hub-path>` | Link current code repo to existing hub. **Auto-detects storage** based on `.docs-hub/` content + existing metadata's `mode` field. |
| `docs-hub unlink [--hub <path>]` | Remove current code repo from a hub. Updates both metadata files. Suggests commits in both repos. |
| `docs-hub verify [code-repos...]` | Sanity-check the hub + linked repos |
| `docs-hub list` | List projects in the current hub (reads top-level `metadata.json`) |
| `docs-hub status <code-repos...>` | Per-machine link health (metadata, paths reachable) |
| `docs-hub doctor` | Diagnose environment (Node, git, gh, npx skills, network) |

Skill install/uninstall is delegated entirely to vercel-labs/skills — there is
no `docs-hub setup` or `docs-hub uninstall` wrapper. Use `npx skills add
github:Sumit1993/docs-hub` and `npx skills remove github:Sumit1993/docs-hub`
directly.

### Auto-detect logic in `link`

Resolution priority:
1. Existing `metadata.json` declares `mode: "in-repo"` → `storage: "in-repo"` (hybrid)
2. Existing `metadata.json` declares `mode: "external"` → `storage: "hub-owned"` (re-linking)
3. No metadata + content in `.docs-hub/` → `storage: "in-repo"` (onboarding existing in-repo docs)
4. No metadata + empty `.docs-hub/` → `storage: "hub-owned"` (fresh link to a hub)

Override with `--storage in-repo|hub-owned`.

## Skills bundled

All shipped in `plugin/skills/` and installable as user-level skills via
`npx skills add github:Sumit1993/docs-hub`.

| Skill | Auto-invoke? | Purpose |
|-------|:------------:|---------|
| `docs-hub` | yes | Awareness — teaches the agent detection, path resolution, read order, commit hygiene, proactive doc-update suggestions. Loads when `.docs-hub/metadata.json` is present. |
| `constitution` | no (explicit) | Establish / amend project principles |
| `specify` | no | Author a feature spec from intent |
| `clarify` | no | Interactive resolution of underspecified spec areas |
| `plan` | no | Derive a technical implementation plan from a spec |
| `tasks` | no | Break a plan into ordered, actionable tasks |
| `analyze` | no | Cross-artifact consistency check |
| `implement` | no | Execute tasks in dependency order |

SDD skills have `disable-model-invocation: true` (phase-driven workflow,
user-explicit). The awareness skill auto-invokes (it's a "load when relevant"
case skills were designed for).

### Path resolution prologue (in every SDD skill)

Each SDD skill body opens with the same prologue, teaching the agent how to
resolve the docs root before reading or writing any file:

```
1. Find .docs-hub/metadata.json walking up from cwd.
2. Parse `mode`. If "in-repo": docs-root = <cwd>/.docs-hub/.
   If "external": docs-root = <hub_path>/projects/<project>/.docs-hub/.
3. Treat all relative paths in this skill body as relative to docs-root.
4. After writing, suggest the commit per docs-hub's commit-hygiene rules.
   NEVER auto-execute.
```

This runtime resolution is the same mechanism the `docs-hub` awareness skill
teaches. Same prologue across all 7 SDD skills, so each one resolves
correctly in all three modes from one file.

See [ADR 0002](decisions/0002-hand-authored-skills.md) for why the skills are
hand-authored once rather than vendored with a build pipeline.

## Install mechanism

### Skill installation

Skill install is delegated to vercel-labs/skills directly — users run
`npx skills add github:Sumit1993/docs-hub`. vercel-labs/skills handles the
per-agent installation matrix (15+ agents). docs-hub keeps responsibility for:

- All hub-management commands (`init`, `link`, `verify`, `list`, `status`,
  `doctor`, `unlink`)
- All metadata authoring (code-repo and hub-side `metadata.json`) — the
  only file docs-hub writes to a code repo (see
  [ADR 0005](decisions/0005-drop-per-repo-preamble.md))
- Authoring the bundled skills under `plugin/skills/`

See [ADR 0003](decisions/0003-delegate-install-to-vercel-labs-skills.md).

### Commit hygiene

docs-hub **never auto-commits**. Every command that writes files suggests the
exact `git` commands in chat output and lets the user run them. The
`docs-hub` awareness skill teaches the same rule to AI agents.

For external mode, two repos may need commits:
- **Code repo** for code + the `.docs-hub/metadata.json` pointer
- **Hub repo** for the registry update + (for hub-owned slots) the spec / decision content

The skill chooses the right repo based on the file path of each modified file.

## Plugin manifest

`plugin/plugin.json` declares the bundle for marketplaces that support
multi-harness plugin install (Claude Code, OpenCode, Codex CLI, others
growing):

```jsonc
{
  "name": "docs-hub",
  "version": "0.0.1",
  "description": "Per-context AI agent docs hubs with spec-driven workflow skills",
  "author": "Sumit Patel",
  "license": "MIT",
  "skills": [
    { "name": "docs-hub",     "path": "skills/docs-hub" },
    { "name": "constitution", "path": "skills/constitution" },
    { "name": "specify",      "path": "skills/specify" },
    { "name": "clarify",      "path": "skills/clarify" },
    { "name": "plan",         "path": "skills/plan" },
    { "name": "tasks",        "path": "skills/tasks" },
    { "name": "analyze",      "path": "skills/analyze" },
    { "name": "implement",    "path": "skills/implement" }
  ]
}
```

Plugin-aware harnesses namespace by plugin name automatically — invocations
become `/docs-hub:specify`, etc., avoiding collision with raw spec-kit's own
`/specify`. Users without marketplace support install directly via
`npx skills add github:Sumit1993/docs-hub`.

## Decision log

| ADR | Decision | Why |
|-----|----------|-----|
| [0001](decisions/0001-no-symlinks.md) | No symlinks; use real files + git for cross-machine sharing | Editor UX compatibility, matches every dominant SDD tool's convention, eliminates symlink/junction platform code |
| [0002](decisions/0002-hand-authored-skills.md) | Hand-authored SKILL.md files; no scheduled sync from spec-kit | Less infrastructure, no upstream tracking obligation, simpler attribution |
| [0003](decisions/0003-delegate-install-to-vercel-labs-skills.md) | Delegate skill installation to vercel-labs/skills via `npx skills` | They own per-agent paths well; we focus on hub-management + metadata. One runtime dep, well-defined. |
| [0004](decisions/0004-remove-teacher-breadcrumb.md) | Remove the user-level teacher breadcrumb entirely | Auto-invoked skill covers the role; redundant + invasive |
| [0005](decisions/0005-drop-per-repo-preamble.md) | Drop the per-repo AGENTS.md / CLAUDE.md preamble | The awareness skill reads `.docs-hub/metadata.json` directly at runtime; the preamble was a duplicate, drift surface, and source of template bugs. Supersedes rejected alt #3 in ADR 0004. |

## Not in v0.0.1 (deferred)

| Item | Why deferred |
|------|--------------|
| Migration tooling for future schema bumps | None needed at v0.0.1; revisit when the schema actually changes |
| The 2 remaining spec-kit commands (`/checklist`, `/taskstoissues`) | Out of v0.0.1's 7-command SDD scope; `/taskstoissues` needs GitHub-API integration thinking |
| Marketplace listing submissions (wshobson/agents, alirezarezvani/claude-skills) | Publication acts, not code changes; do post-launch once the package stabilizes |
| Plugin marketplace publishing automation | Manual submission is fine for the first iteration |
| Unit tests for internals | Smoke tests cover happy paths; full unit coverage lands later |

## References

- spec-kit: https://github.com/github/spec-kit (MIT)
- vercel-labs/skills: https://github.com/vercel-labs/skills (Apache 2.0)
- [`README.md`](../README.md) — user-facing quickstart
- [`ATTRIBUTION.md`](../ATTRIBUTION.md) — what we adapted vs depend on
- [`decisions/`](decisions/) — load-bearing architectural decisions
