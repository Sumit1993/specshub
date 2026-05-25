# ADR 0001: No symlinks — use real files + git for cross-machine sharing

- **Date**: 2026-05-25
- **Status**: Accepted (v0.0.1)

## Context

An early design iteration prototyped docs-hub by symlinking a directory inside
each linked code repo to a project slot inside an external hub repo. The
symlink gave humans, agents, and IDEs a stable path (`<code-repo>/<docs-dir>/`)
that resolved into the hub's storage. The hub was the source of truth; the
symlink let everyone read/write through a consistent local path.

Three problems surfaced before publication:

1. **Editor UX is hostile to symlinks-to-gitignored-paths.** VS Code, Cursor,
   and other workspace-aware tools default to `search.useIgnoreFiles: true`,
   which excludes anything in `.gitignore` from quick-open, find-in-files,
   chat `@`-mentions, and drag-drop file pickers. The bootstrap had to add
   the symlinked dir to `.gitignore` (correct from a git perspective — the
   target is in a different repo and machine-specific). The combination made
   the hub-resident files effectively invisible to the editor UI.

2. **Every dominant SDD framework (spec-kit, BMad, Kiro, OpenSpec, Agent-OS)
   puts per-feature specs in the code repo as real files, committed to the
   code repo's git.** Adopting a different convention would put docs-hub at
   odds with the dominant standard. Spec-kit's [#1140 community discussion](https://github.com/github/spec-kit/issues/1140)
   converges on "commit specs alongside code diffs"; doing anything else
   fights muscle memory.

3. **Symlinks added a category of failure mode** (dangling symlinks across
   machines, junction vs symlink semantics across Linux/Mac/Windows,
   IDE-specific stat differences) that was never fully closed. Each new
   machine required a per-machine bootstrap to recreate the symlink with
   that machine's hub path.

## Decision

**v0.0.1 ships without symlinks.** The docs-hub directory structure:

- **In-repo mode** (scenario 1): `.docs-hub/` is a **real directory** in the
  code repo, committed to the code repo's own git. Cross-machine sharing
  happens through the code repo's git history, like any other tracked file.
- **External mode** (scenario 2): docs live in a separate hub repo at
  `<hub>/projects/<project>/.docs-hub/`. The code repo contains only
  `.docs-hub/metadata.json` (small, tracked) pointing at the hub. Editor UI
  in the code repo doesn't see the hub's files — but that's expected; the
  user opens the hub directly (or via multi-root workspace) when they need
  to edit hub-resident content.
- **Hybrid**: in-repo storage + metadata reference to one or more external
  hubs. The external hub's registry knows about the code repo and may
  reference its in-repo docs from `cross-refs/`. No file-level linkage —
  purely metadata-mediated.

The `.docs-hub/` directory name is fixed (no configurable `docs_dir`).

## Why

- **Editor UX works out of the box.** `.docs-hub/` is a real, tracked
  directory. Quick-open, `@`-mention, drag-drop all work.
- **Cross-machine sharing is git.** No special infrastructure; the code repo's
  own git is the sync mechanism.
- **Convention matches every dominant SDD tool.** Lower onboarding cost;
  docs-hub stops being "the weird one."
- **Eliminates symlink/junction platform code entirely.**
- **Per-repo `.gitignore` no longer needs entries** for the docs-hub dir
  (because we want it tracked).

## Consequences

- **The privacy use case shifts.** An early design pitched "hub is private
  even when code is public." v0.0.1 preserves this for *strategy /
  cross-cutting* material (lives in hub), but per-feature specs now live with
  the code by default. Hybrid mode handles the case where you want the code
  repo to participate in cross-cutting hub context (cross-refs, MAP) without
  moving its specs out.
- **Editor compat workarounds dropped.** No `.vscode/settings.json` generation,
  no `search.exclude` overrides. Tool stays simpler.
- **No per-machine "re-link to recreate symlink" step.** Cloning a code repo
  gives you the docs (in-repo mode) or just the metadata pointer (external
  mode); no docs-hub command required to make them accessible.

## Alternatives considered (and rejected)

1. **Keep symlinks; auto-generate workspace files + `.vscode/settings.json`
   overrides to fix editor UX.** Rejected: every editor needs its own
   workaround, the gitignore-exclusion pattern still bites tools that don't
   honor workspace settings (chat extensions, CLI tools), and the underlying
   architecture stays fragile.

2. **Stay on symlinks; tell users to manually configure their editor.**
   Documented hack-not-solution. Rejected for the same reason.

3. **Move from symlinks to git submodules.** Considered. Rejected: forces
   each project slot to be its own git repo, loses the "one hub repo with N
   slots" property, and the submodule UX is universally disliked.

4. **Bidirectional file sync between code repo and hub.** Rejected: adds a
   running daemon, conflict resolution, and bidirectional drift risk for no
   benefit over plain git.

## References

- [ARCHITECTURE.md](../ARCHITECTURE.md) — the comprehensive design document
- [ADR 0002](./0002-hand-authored-skills.md) — hand-authored skills, no sync
- [ADR 0003](./0003-delegate-install-to-vercel-labs-skills.md) — runtime install dep
- [ADR 0004](./0004-remove-teacher-breadcrumb.md) — no user-level breadcrumb
