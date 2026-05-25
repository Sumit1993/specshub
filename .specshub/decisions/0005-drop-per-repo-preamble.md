# ADR 0005: Drop the per-repo AGENTS.md / CLAUDE.md preamble

- **Date**: 2026-05-25
- **Status**: Accepted (v0.0.1)
- **Supersedes**: [ADR 0004 §"Alternatives considered #3"](./0004-remove-teacher-breadcrumb.md)

## Context

[ADR 0004](./0004-remove-teacher-breadcrumb.md) removed the user-level teacher
breadcrumb and kept two surviving mechanisms:

1. The auto-invoked `specshub` awareness skill (loads when
   `.specshub/metadata.json` is present in the cwd or a parent).
2. A per-repo AGENTS.md preamble block + CLAUDE.md `@AGENTS.md` import line,
   written by `init` and `link`.

ADR 0004 explicitly considered dropping the per-repo preamble too (rejected
alternative #3), and kept it on the grounds that a "collaborator cold-start"
agent without prior specshub awareness benefits from a marker in AGENTS.md.

During v0.0.1 dogfooding, the per-repo preamble was the source of:

- **A template-substitution bug** — when `mode=in-repo`, the unconditional
  "Commit hygiene" section rendered `(${meta.hub_path ?? "the linked hub"})`
  with the placeholder string visible in the published file.
- **A re-link rollout dance** — every change to the preamble template forces
  re-running `init`/`link` on all linked repos so they pick up the new render.
- **Drift surface** — two places now teach the same thing (the skill body and
  the preamble body), and they can drift apart silently.

Re-examining ADR 0004's keep argument: the "cold-start agent without specshub
awareness" case is the *same* case where the awareness skill auto-invokes. If
the agent doesn't have the skill installed, the preamble's content
("`.specify/memory/constitution.md`", "where docs live based on mode") isn't
actionable — they still need to read and interpret `.specshub/metadata.json`
themselves. The metadata file is the *signal*, the *data source*, and now also
serves as the orientation breadcrumb.

## Decision

**`init` and `link` no longer touch AGENTS.md or CLAUDE.md.** The only artifact
they write to a code repo is `.specshub/metadata.json`.

The `specshub` awareness skill is the sole runtime mechanism for teaching
agents how to operate inside a specshub repo. Detection signal:
`.specshub/metadata.json` exists. Data source: same file.

## Why

1. **Pure redundancy.** The skill already reads metadata and resolves
   project name, mode, docs root, commit-hygiene rules. The preamble
   re-stated all of it in prose.

2. **Write-time invasion is hostile.** Most dev tools refuse to mutate
   user-authored files. specshub was writing into AGENTS.md and CLAUDE.md —
   files the user owns and may have hand-tuned. Dropping the preamble means
   specshub now touches only its own dotdir.

3. **Single source of truth.** Two stale mechanisms diverge; one mechanism
   doesn't. The bug we fixed in the preamble renderer would not have
   existed if there were only one renderer (the skill body).

4. **Cleaner uninstall.** `unlink` removes the linkage from both
   metadata files. To remove specshub from a repo entirely, the user
   deletes `.specshub/metadata.json` themselves — there is nothing else
   specshub left behind.

5. **The "cold-start agent" case is weaker than ADR 0004 estimated.** Without
   the skill, the preamble's content (`/specify`, `/plan`, "docs root" path,
   etc.) is informational at best — the agent can't actually *do* anything
   specshub-specific without the skill. With the skill, the preamble is
   redundant.

6. **The `.specshub/` directory IS the orientation breadcrumb.** Any agent
   doing a directory scan or `ls` sees `.specshub/`. Any agent reading
   `.specshub/metadata.json` immediately has structured info on mode +
   project name + hub linkages. No prose required.

## Consequences

- **Code path simplified.** `src/preamble.ts` is deleted entirely.
  `init` and `link` no longer call any preamble renderer or upsert helper.
- **`init` and `link` output is tighter.** No more "AGENTS.md preamble updated
  / CLAUDE.md @AGENTS.md import exists" logging.
- **Suggested commit commands shrink.** Was `git add .specshub AGENTS.md
  CLAUDE.md`; now `git add .specshub`.
- **No backward-compat scrub.** The preamble was never released — v0.0.1 is
  the first published version, and it ships without the preamble.
  Internal dogfood repos that briefly carried the preamble during 0.0.1
  development were scrubbed by hand.
- **The awareness skill must continue to load reliably across harnesses.**
  This is already covered by ADR 0003 / 0004 — vercel-labs/skills handles
  all 15+ supported agents.

## Alternatives considered (and rejected)

1. **Keep the preamble; just keep fixing render bugs.** Rejected: every fix
   forces a re-link rollout across all installed repos, and the drift
   surface remains. Each new harness convention (e.g., a new agent's
   marker file) would either be ignored or require yet another preamble
   variant.

2. **Make the preamble opt-in via a `--preamble` flag.** Rejected: adds CLI
   surface for an opt-in mechanism whose value proposition is weak. If the
   skill works, the preamble is unnecessary; if the skill doesn't work,
   the preamble still requires manual interpretation by the agent.

3. **Replace the preamble with a `.specshub/README.md` autocreated on init.**
   Considered. Deferred: same orientation goal, but bundling it as a static
   README means it can't reflect runtime state (mode-aware path resolution,
   hub_refs list, etc.). The skill already does this at runtime. We may
   revisit per-project README seeding later — but as a feature for humans
   browsing the repo, not as an agent-orientation mechanism.

## References

- [ADR 0004](./0004-remove-teacher-breadcrumb.md) — companion (this ADR
  supersedes its rejected alternative #3)
- [ARCHITECTURE.md](../ARCHITECTURE.md) — updated to reflect single-mechanism
  awareness
- [`plugin/skills/specshub/SKILL.md`](../../plugin/skills/specshub/SKILL.md) —
  the sole remaining mechanism
