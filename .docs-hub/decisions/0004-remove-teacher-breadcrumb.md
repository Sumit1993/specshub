# ADR 0004: Remove the user-level teacher breadcrumb entirely

- **Date**: 2026-05-25
- **Status**: Accepted (v0.0.1) — rejected-alternative #3 superseded by
  [ADR 0005](./0005-drop-per-repo-preamble.md)

## Context

An early design iteration had `setup --user` write a 5-line marker block (the
"teacher snippet") to each agent's user-level config file
(`~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, etc.). The block said: "docs-hub
is installed; here's how to interpret `.docs-hub/metadata.json` artifacts
when you encounter them."

During the v0.0.1 grilling, an early plan ("G2") proposed keeping the
breadcrumb as a *pointer* to the new richer `docs-hub` SKILL.md awareness
skill. The breadcrumb would always load (in every conversation, as part of
user-level context); the rich skill would auto-invoke when relevant.

Later in the same grilling, this was reconsidered and the breadcrumb was
removed entirely.

## Decision

**v0.0.1 does NOT write a user-level teacher breadcrumb.** `setup --user` only
installs skills (via `npx skills add`). The user-level config files are not
touched.

The role the breadcrumb would have played is now covered by:

1. **The `docs-hub` awareness skill** (`plugin/skills/docs-hub/SKILL.md`) —
   auto-invoked when an agent sees `.docs-hub/metadata.json` in a repo.
   Carries the rich teaching (detection, path resolution, read order, commit
   hygiene, proactive suggestions).

2. **The per-repo AGENTS.md preamble** written by `link` / `init` — gives the
   agent the specific facts (project name, mode, docs root) for THIS repo,
   without needing to interpret metadata.json.


## Why

1. **Pure redundancy.** The skill + the per-repo AGENTS.md preamble both
   already teach the agent everything the breadcrumb said. Three copies of
   the same idea, one of which is in the user's global config, was excessive.

2. **Less invasive.** Many users sync their dotfiles via chezmoi/yadm/stow.
   Writing to `~/.claude/CLAUDE.md` etc. interferes with that. v0.0.1 stops
   touching user-level config files entirely.

3. **Modern harnesses auto-invoke skills reliably.** As of the May 2026
   ecosystem state (Claude Code 2.1+, Codex CLI, OpenCode, Cursor, Gemini CLI
   all support skill auto-invocation when relevant). The breadcrumb's
   "fallback for harnesses without auto-invocation" justification has
   weakened — we'd only be paying the cost for that edge case.

4. **One mechanism.** "How does an agent learn about docs-hub? The docs-hub
   skill, auto-invoked when relevant artifacts appear, OR the per-repo
   AGENTS.md preamble for any agent that doesn't support skills." That's the
   whole story.

5. **Cleaner uninstall.** `npx skills remove` cleans up skills; that's it.
   Without the breadcrumb, there's nothing else to undo on user-level config.

## Consequences

- **`setup --user` is tighter:** scopes are `awareness` and `sdd` (skill
  scopes). An earlier-considered third scope `teacher` is gone.
- **Code path simplified.** No `writeTeacherBreadcrumb()` function;
  `src/preamble.ts` doesn't render a user-teacher block anymore.
- **Edge case left uncovered:** users on harnesses without skill
  auto-invocation AND without AGENTS.md awareness wouldn't be alerted to
  docs-hub. None of the agents in the vercel-labs/skills support matrix
  fall into that hole; acceptable graceful degradation.

## Alternatives considered (and rejected)

1. **Keep both breadcrumb + skill (G2).** Rejected as redundant.
2. **Convert the breadcrumb into its own small skill.** Rejected: the
   breadcrumb's content is "see the docs-hub skill for details" — making a
   skill whose body is "see another skill" is noise. The `docs-hub` skill
   itself is the breadcrumb's natural successor.
3. **Remove the breadcrumb but ALSO drop the per-repo AGENTS.md preamble.**
   Rejected: collaborator cold-start case still benefits from the per-repo
   preamble. An agent opening a repo without prior docs-hub awareness should
   get oriented immediately — AGENTS.md is the universal mechanism for that.

## References

- [ARCHITECTURE.md](../ARCHITECTURE.md) — comprehensive design
- [ADR 0003](./0003-delegate-install-to-vercel-labs-skills.md) — companion change
