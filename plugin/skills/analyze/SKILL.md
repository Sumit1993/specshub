---
name: analyze
description: |
  Cross-artifact consistency + coverage analysis. Reads spec, plan, tasks (and
  optionally constitution + existing code) and surfaces contradictions, missing
  coverage, and risks BEFORE /implement runs. Adapted from github/spec-kit (MIT)
  — see ATTRIBUTION.md.
allowed-tools: Read, Glob, Grep, Bash
disable-model-invocation: true
---

<!-- Adapted from github/spec-kit (/analyze command), MIT licensed. See ATTRIBUTION.md. -->

# /analyze — cross-artifact consistency review

## Path resolution (added by specshub)

Before reading any file referenced as `.specify/...`, `specs/...`, or similar
relative path in this skill, resolve the docs root for the current repo:

1. Find the nearest `.specshub/metadata.json` walking up from your current dir.
2. Parse it. Note `mode`, `project`, `hub_path`.
3. Compute docs root:
   - `mode == "in-repo"` → docs-root = `<code-repo>/.specshub/`
   - `mode == "external"` → docs-root = `<hub_path>/projects/<project>/.specshub/`
4. Treat `specs/<feature>/` references as `<docs-root>/specs/<feature>/`.
5. Suggest commits, never auto-execute.

---

## What this skill does

Runs after `/tasks` and before `/implement`. Reads:
- The spec, plan, tasks files for the target feature
- The constitution
- (Optionally) existing source code in the code repo

Surfaces:
- **Contradictions** between spec ↔ plan ↔ tasks
- **Missing coverage** — requirements without corresponding tasks
- **Constitution violations** — places where plan/tasks contradict principles
- **Risks** — unaddressed failure modes, unhandled edge cases
- **Drift** — places where the code already differs from what the plan describes

Writes findings to `analysis.md` alongside the other artifacts. Does NOT
modify the spec/plan/tasks — those updates are up to the user (use `/specify`,
`/plan`, or `/tasks` again to revise).

## When to invoke

- After `/tasks`, before `/implement` (recommended)
- After a major spec/plan revision, to recheck coherence
- Periodically during long-running implementations, to catch drift

## Workflow

1. **Identify the target feature**. Find spec + plan + tasks at
   `<docs-root>/specs/<NNN>-<name>/{spec,plan,tasks}.md`. Abort if any are
   missing (tell the user which command to run).

2. **Read** the constitution + all three artifacts.

3. **Build a checklist** of what to verify:

   ### Spec ↔ Plan
   - Does the plan address every user story from the spec?
   - Does the plan address every functional requirement?
   - Does the plan's tech stack contradict anything in the spec's constraints?
   - Does the plan introduce capabilities not in the spec? (scope creep)

   ### Plan ↔ Tasks
   - Does every plan component have at least one task?
   - Do any tasks contradict the plan's architecture?
   - Are observability requirements from the plan reflected in tasks?
   - Is the dependency order in tasks consistent with the plan?

   ### Spec ↔ Tasks
   - Does every acceptance criterion have a task that delivers it?
   - Does every "out of scope" item NOT have a task? (scope creep check)

   ### Constitution ↔ all
   - Does any plan decision violate a constitution principle without
     explicit "exception with rationale"?
   - Do tasks include the testing discipline the constitution requires?

   ### Optional: Code ↔ Plan
   - If the code repo already has implementation, does it match the plan's
     architecture? Or has it drifted?

4. **Generate findings**. For each finding, classify by severity:
   - **BLOCKER**: must fix before `/implement` (e.g., contradictory contracts)
   - **WARNING**: should fix but `/implement` could proceed (e.g., missing test
     coverage for an edge case)
   - **NOTE**: informational (e.g., a non-obvious choice worth documenting)

5. **Write `<docs-root>/specs/<NNN>-<name>/analysis.md`** with the structure below.

6. **Suggest the commit**:
   ```bash
   # mode=external example:
   git -C <hub_path> add projects/<project>/.specshub/specs/<NNN>-<name>/analysis.md
   git -C <hub_path> commit -m "analyze: <NNN>-<name> for <project>"
   ```

7. **In chat output**, summarize the BLOCKER count up front. The user needs
   to decide whether to proceed to `/implement` or revise upstream artifacts.

## Analysis template

```markdown
# <Feature Name> — Cross-Artifact Analysis

**Feature**: <NNN>-<name>
**Analyzed**: <ISO date>
**Verdict**: <READY | NEEDS FIXES BEFORE IMPLEMENT>

## Summary

- **Blockers**: <N>
- **Warnings**: <N>
- **Notes**: <N>

If Blockers > 0, do NOT proceed to /implement. Revise the upstream artifact.

## Blockers

### B-1: <one-line title>
- **Where**: <which files / sections>
- **Issue**: <description>
- **Suggested fix**: <which command to re-run, what to change>

(repeat per blocker)

## Warnings

### W-1: <one-line title>
- **Where**: ...
- **Issue**: ...
- **Suggested fix**: ...

## Notes

### N-1: <one-line title>
- ...

## Constitution compliance

| Principle | Compliant? | Notes |
|-----------|:----------:|-------|
| I — <name> | ✓ / ✗ | ... |
| II — <name> | ✓ / ✗ | ... |

## Coverage matrix

| Requirement | Plan addresses it? | Task covers it? |
|-------------|:------------------:|:---------------:|
| FR-1 | ✓ | T-006 |
| FR-2 | ✓ | T-009 |
| FR-3 | ✗ | (none) — BLOCKER B-2 |
```

## Quality bar

A good analysis:
- Has a verdict up front (READY vs NEEDS FIXES)
- Each finding has a SPECIFIC location + a SPECIFIC fix
- Coverage matrix makes gaps visible at a glance
- Doesn't nitpick — every finding affects implementation
- Constitution check is honest (no rubber-stamping)
