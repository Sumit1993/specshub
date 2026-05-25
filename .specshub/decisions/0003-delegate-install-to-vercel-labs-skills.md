# ADR 0003: Delegate skill installation to vercel-labs/skills via `npx skills`

- **Date**: 2026-05-25
- **Status**: Accepted (v0.0.1)

## Context

An early design iteration implemented its own per-agent skill/preamble
installation matrix — a per-agent file-path map cherry-picked from
vercel-labs/skills + a custom writer that wrote shim files into each linked
code repo's `.claude/`, `.cursor/`, `.github/copilot-instructions.md`, etc.,
based on a multi-select choice persisted in metadata as `shims: [...]`.

This worked but had two structural problems:

1. **It was a fork of vercel-labs/skills' core knowledge.** Their project
   tracks 15+ agents and grows as new ones emerge; the cherry-picked snapshot
   would drift. The "right" answer was either to take a runtime dependency on
   them or to keep manually re-syncing — same maintenance trade-off as
   [ADR 0002](./0002-hand-authored-skills.md).

2. **The shim payload at *link* time was the wrong layer.** Each linked code
   repo got its own per-agent shim files, duplicated across all N linked
   repos for the same user. The per-machine knowledge "I want Cursor to know
   about specshub" is naturally per-machine, not per-repo.

The no-symlinks decision ([ADR 0001](./0001-no-symlinks.md)) created room to
move skill installation to the right layer in the same architectural wave.

## Decision

**Skill installation is delegated entirely to vercel-labs/skills via `npx
skills`.** There is no `specshub setup` or `specshub uninstall` wrapper —
users invoke the upstream CLI directly:

```
npx skills add github:Sumit1993/specshub
npx skills remove github:Sumit1993/specshub
```

vercel-labs/skills owns:
- The per-agent path matrix (Claude, Codex, OpenCode, Cursor, Gemini, others)
- The XDG / env-var-aware config dir resolution
- The actual file writes for each agent
- The install/remove UX

specshub owns:
- All hub-management commands (`init`, `link`, `verify`, `list`, `status`,
  `doctor`, `unlink`)
- All metadata authoring (code-repo and hub-side `metadata.json`) — this is
  the only file specshub writes to a code repo (see
  [ADR 0005](./0005-drop-per-repo-preamble.md))
- Authoring the bundled skills under `plugin/skills/`

## Why

1. **Single source of truth for per-agent paths.** When a new agent emerges or
   an existing agent moves its skills directory, vercel-labs/skills updates
   their map. We get the update for free on the next `npx skills` invocation.

2. **Zero code surface for us on this axis.** No per-agent path map, no
   per-agent file writer, no install/uninstall wrapper. `npx skills` is the
   install surface; we just publish the skill bundle.

3. **One runtime dep, well-defined.** Node + npx (already required for our
   own CLI distribution). No Python prerequisite (which was the reason we
   rejected an analogous "delegate to spec-kit's CLI" earlier in the
   grilling).

4. **User-level scope is the right home.** The earlier per-link shim writes
   were duplicative; the "I want my agents to know specshub" decision is a
   per-machine one. `npx skills add ...` runs once per machine; the user's
   agents pick up the skills wherever they go.

## Consequences

- **No custom per-agent installation code in specshub** (vercel-labs/skills
  owns this).
- **No per-link shim writes** (replaced by user-level skills).
- **Per-link behavior is simpler.** `link` writes only: hub-side metadata
  update + code-repo `.specshub/metadata.json`. No shim selection prompt;
  no `shims` field in metadata; no AGENTS.md / CLAUDE.md touching (see
  [ADR 0005](./0005-drop-per-repo-preamble.md)).
- **Install requires network** (to fetch vercel-labs/skills via npx).
  Offline users need to pre-cache or install vercel-labs/skills globally
  first.

## Concrete shape

```bash
# Install
npx skills add github:Sumit1993/specshub

# Remove
npx skills remove github:Sumit1993/specshub
```

No wrapper code in specshub. The matrix of where to write per agent, XDG
handling, etc. is entirely vercel-labs/skills's problem.

## Counter-considerations

- **Adds a runtime dep on a third-party CLI.** Same kind of trade-off we
  rejected for spec-kit (where we picked vendor-once instead). The
  difference: vercel-labs/skills is **doing fundamentally different work** —
  per-machine install logic that we have no unique opinion on. Spec-kit's
  prompts encoded our SDD opinions, where we *did* want voice control.

- **What if vercel-labs/skills changes their CLI signature?** The install
  surface is documented in our README + ARCHITECTURE. If upstream renames
  flags, we update the docs (and the README quick-start one-liner). No
  in-code wrapper to update.

- **What if they're unmaintained?** Mitigation: we can switch to our own
  installer at any time by writing a per-agent path map + writer. The
  decision is reversible.

## Alternatives considered (and rejected)

1. **Keep our own custom installer.** Rejected: maintenance cost of tracking
   15+ agents' file paths is real; cherry-pick approach drifts.
2. **Build our own per-agent installer that mirrors vercel-labs/skills.**
   Rejected: pure duplication of work, identical to (1) with extra steps.
3. **Use vercel-labs/skills as a library import, not a CLI shell-out.**
   Considered. Their package isn't optimized for programmatic use; CLI
   delegation is simpler and cleaner of an interface boundary.

## References

- [ARCHITECTURE.md](../ARCHITECTURE.md) — comprehensive design
- [ADR 0001](./0001-no-symlinks.md) — same architecture wave
- [ADR 0002](./0002-hand-authored-skills.md) — same architecture wave
- vercel-labs/skills: https://github.com/vercel-labs/skills (Apache 2.0)
