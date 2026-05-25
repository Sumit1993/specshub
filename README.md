# docs-hub

> Per-context AI agent docs hubs with spec-driven workflow skills. Three
> deployment modes (in-repo / external / hybrid), 8 bundled SDD skills
> (constitution, specify, clarify, plan, tasks, analyze, implement +
> docs-hub awareness), cross-harness via plugin or `npx skills`.

[![npm](https://img.shields.io/npm/v/docs-hub?style=flat&logo=npm)](https://www.npmjs.com/package/docs-hub)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat)
![Node](https://img.shields.io/badge/Node-%3E%3D18-339933?style=flat&logo=node.js)
![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey?style=flat)

## What it does

You have AI agent docs in your code repos — planning material, design specs,
ADRs, the context that helps Claude / Cursor / Codex understand your codebase.
Whether you call it `.docs-hub/`, `internal-docs/`, `docs/agent/`, or
`specs/`, you're trying to solve the same problem: **make this context
discoverable, organized, and shareable.**

docs-hub gives you:

- **Three deployment modes**: in-repo (committed to your code repo, like
  spec-kit), external (separate hub repo for cross-cutting / private material),
  or hybrid (in-repo specs + external hub for cross-references and MAP).
- **8 bundled skills** that AI agents use directly: the **docs-hub awareness
  skill** (auto-invoked when an agent enters a docs-hub repo) + **7 SDD
  lifecycle skills** (`/constitution`, `/specify`, `/clarify`, `/plan`,
  `/tasks`, `/analyze`, `/implement` — adapted from
  [spec-kit](https://github.com/github/spec-kit)).
- **No symlinks**. Files live in their actual git repos; cross-machine sharing
  is git, not symlink mechanics.
- **Skill installation via `npx skills`** (vercel-labs/skills) — one runtime
  dep, 15+ agents supported, multi-channel install (CLI or plugin marketplace).
- **`docs-hub` knows how to work with itself** — the awareness skill teaches
  agents commit hygiene, read order, and proactive doc-update suggestions
  for the two-repo scenarios.

## Quick start

```bash
# Once per machine: install skills GLOBALLY (so every agent / repo sees them)
# Run from your home dir — `npx skills add` auto-detects project scope when
# invoked inside a project, and the `--global` flag is what flips it to user-level.
cd ~ && npx skills add github:Sumit1993/docs-hub --global

# In a code repo: scenario 1 — docs live in this repo
cd ~/code/my-api
npx docs-hub init --in-repo

# Or: scenario 2 — create a sibling external hub
npx docs-hub init --external --name my-team-docs-hub --private

# Or: scenario 4 (hybrid) — start in-repo, later register with an existing hub
npx docs-hub init --in-repo
npx docs-hub link ~/code/some-existing-hub
```

That's it. Open Claude Code / Cursor / Codex / your favorite agent in the code
repo and start using `/specify`, `/plan`, etc. The `docs-hub` skill loads
automatically when you're in a docs-hub-aware repo.

To remove the skills later: `cd ~ && npx skills remove github:Sumit1993/docs-hub --global`.

## The three scenarios

| Scenario | When to use it | What `init` creates |
|----------|----------------|---------------------|
| **In-repo** | Single-repo project. OSS where the constitution and specs are part of the open source story. Personal projects. Matches the spec-kit / BMad / Kiro convention. | `<code-repo>/.docs-hub/` (real dir, committed to your code repo) |
| **External** | Multi-repo portfolio. Strategy or pre-launch material that shouldn't be in a public code repo. One hub serves N projects with cross-cutting MAP and cross-refs. | A new sibling hub repo (default name: `<code-repo>-docs-hub`, visibility your choice) with first project registered |
| **Hybrid** | Code repo wants its own in-repo docs *and* to participate in an external hub for cross-cutting context. | Run `init --in-repo` first, then `link <hub>` to register with one or more external hubs. The hub knows about you; specs stay with the code. |

## Commands

| Command | Purpose |
|---------|---------|
| `init --in-repo` | Scenario 1 setup |
| `init --external [--name X]` | Scenario 2 setup (creates a new hub) |
| `link <hub-path>` | Add this code repo to an existing hub (auto-detects storage: in-repo if `.docs-hub/` has content, hub-owned if empty) |
| `unlink [--hub <path>]` | Remove a docs-hub linkage (updates both metadata files; suggests commits in both) |
| `verify [code-repos...]` | Sanity-check a hub's structure + linked repos |
| `list` | List the projects in this hub |
| `status <code-repos...>` | Per-machine link health check |
| `doctor` | Diagnose environment (Node, git, gh, npx skills, network) |

Skill install/uninstall is delegated to vercel-labs/skills — run
`npx skills add github:Sumit1993/docs-hub` and `npx skills remove
github:Sumit1993/docs-hub` directly.

Run `npx docs-hub <command> --help` for per-command flags.

## How `link` works

Auto-detects the storage mode based on whether your code repo's `.docs-hub/`
already has content:

```bash
# Case A — empty/missing .docs-hub/ → storage="hub-owned" (scenario 2)
cd ~/code/my-web
npx docs-hub link ~/code/my-team-docs-hub
# Hub gets a new projects/my-web/.docs-hub/ stub directory
# Code repo gets mode=external metadata pointing at the hub

# Case B — populated .docs-hub/ → storage="in-repo" (scenario 4 / hybrid)
cd ~/code/my-api     # already ran `init --in-repo` earlier
npx docs-hub link ~/code/my-team-docs-hub
# Hub registers my-api as an "in-repo" project (no new dir in the hub)
# Code repo gets a hub_ref added (mode stays in-repo)

# Override auto-detection:
npx docs-hub link <hub> --storage hub-owned
npx docs-hub link <hub> --storage in-repo
```

## What gets written by `init` / `link`

### Code-repo side

- `<code-repo>/.docs-hub/metadata.json` — small file declaring mode, project
  name, optional hub references. Always tracked in your code repo's git.
  **The only file docs-hub writes to your code repo.**
- `<code-repo>/.docs-hub/.specify/`, `specs/`, `decisions/` — for in-repo
  and hybrid modes only. Created on demand by the SDD skills (`/specify`,
  `/constitution`, etc.), not at init time.

docs-hub does **not** touch `AGENTS.md`, `CLAUDE.md`, or any other
agent-facing files in your code repo. The `docs-hub` awareness skill (loaded
once per machine via `npx skills add`) auto-invokes when it sees
`.docs-hub/metadata.json` and reads the per-repo facts directly from there
— project name, mode, docs root, commit-hygiene rules. See
[ADR 0005](.docs-hub/decisions/0005-drop-per-repo-preamble.md).

### Hub side (external mode)

- `<hub>/metadata.json` — registry of all projects this hub knows about,
  with their storage type + code repo path/url.
- `<hub>/IDENTITY.md`, `MAP.md`, `cross-refs/`, `archive/` — scaffolded
  placeholders. `IDENTITY.md` for context-wide identity; `MAP.md` for the
  project graph; `cross-refs/` for relationships between projects.
- `<hub>/projects/<project>/.docs-hub/` — for hub-owned projects only,
  an empty stub dir. SDD artifacts land here as they're created.

For hybrid (in-repo) projects, the hub has the registry entry but **no
projects/<project>/ directory** — the docs are in the code repo, not here.

## Commit hygiene

**docs-hub never auto-commits.** It always *suggests* the exact `git` commands
in chat output and lets you run them. The `docs-hub` awareness skill teaches
agents the same rule.

For external mode, you commit to two repos:
- **Code repo** for everything outside `.docs-hub/` (your code) plus
  `.docs-hub/metadata.json` itself (the link pointer)
- **Hub repo** for anything written under the hub (specs, constitution, ADRs,
  cross-refs, MAP updates)

The skill tells the agent which is which based on file path, and suggests both
commits when both are needed.

## The 8 bundled skills

| Skill | Auto-invoke? | Purpose |
|-------|:------------:|---------|
| `docs-hub` | yes | Teaches the agent: detection, path resolution, read order, commit hygiene, proactive doc-update suggestions. Loads when `.docs-hub/metadata.json` is present. |
| `constitution` | no (explicit) | Establish / amend project principles |
| `specify` | no | Author a feature spec from intent |
| `clarify` | no | Interactive resolution of underspecified spec areas (recommended before `/plan`) |
| `plan` | no | Derive a technical implementation plan from a spec |
| `tasks` | no | Break a plan into ordered, actionable tasks |
| `analyze` | no | Cross-artifact consistency check (recommended before `/implement`) |
| `implement` | no | Execute tasks in dependency order; tick off completed tasks |

SDD skills have `disable-model-invocation: true` because the lifecycle is
phase-driven (the user deliberately moves from spec → plan → tasks, not the
agent auto-jumping). The awareness skill auto-invokes because that's the
case skills were designed for.

## Requirements

- Node ≥ 18 (built-in `fetch`, modern `fs.symlink` semantics)
- `git`
- `npx` (comes with Node)
- `gh` (optional — only for `init --external --private` or `init --external --public`; not needed with `--local`)
- Network access for `npx skills add github:Sumit1993/docs-hub`. Offline users
  can pre-cache the package or install `vercel-labs/skills` globally.

## Cross-platform notes

docs-hub doesn't use symlinks (see
[ADR 0001](.docs-hub/decisions/0001-no-symlinks.md)) so the cross-platform story is
trivial: docs live as real files in real git repos. Works the same on Linux /
macOS / Windows.

## Programmatic API

```ts
import { init, link, verify } from "docs-hub";

// Set up a new in-repo hub for the current repo
await init({ mode: "in-repo", yes: true });

// Link another code repo into a hub (auto-detects storage)
await link("/path/to/hub", { codeRepo: "/path/to/code-repo", yes: true });

// Verify
const result = await verify({ hub: "/path/to/hub", codeRepos: ["/path/to/code-repo"] });
if (!result.passed) process.exit(1);
```

For skill install, shell out to vercel-labs/skills directly:

```bash
npx skills add github:Sumit1993/docs-hub
```

## Plan + decisions

The architecture was nailed down through a multi-session grilling. docs-hub
dogfoods its own convention: its design docs live at
[`.docs-hub/`](.docs-hub/) using in-repo mode.

- **Architecture**: [`.docs-hub/ARCHITECTURE.md`](.docs-hub/ARCHITECTURE.md)
  — file layouts, metadata schemas, CLI surface, skill bundle, install
  mechanism, decision log
- **ADRs** for the load-bearing architectural decisions:
  - [0001 — no symlinks](.docs-hub/decisions/0001-no-symlinks.md)
  - [0002 — hand-authored skills, no scheduled sync](.docs-hub/decisions/0002-hand-authored-skills.md)
  - [0003 — delegate skill install to vercel-labs/skills](.docs-hub/decisions/0003-delegate-install-to-vercel-labs-skills.md)
  - [0004 — remove the user-level teacher breadcrumb](.docs-hub/decisions/0004-remove-teacher-breadcrumb.md)

## Credits

- **[github/spec-kit](https://github.com/github/spec-kit)** (MIT) — the SDD
  workflow conventions. Our 7 SDD skills are adapted from spec-kit's command
  bodies. See [ATTRIBUTION.md](ATTRIBUTION.md).
- **[vercel-labs/skills](https://github.com/vercel-labs/skills)** (Apache 2.0)
  — the cross-harness skill installer. docs-hub delegates skill install to
  `npx skills add github:Sumit1993/docs-hub`. See
  [ATTRIBUTION.md](ATTRIBUTION.md).

## License

MIT
