---
name: tasks
description: |
  Break a plan into ordered, actionable tasks ready for implementation. Writes
  tasks.md alongside the plan with checklist-formatted tasks grouped by user
  story and phase. Adapted from github/spec-kit (MIT) — see ATTRIBUTION.md.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
disable-model-invocation: true
---

<!-- Adapted from github/spec-kit (/tasks command), MIT licensed. See ATTRIBUTION.md. -->

# /tasks — generate ordered, actionable tasks from a plan

## Path resolution (added by docs-hub)

Before reading or writing any file referenced as `.specify/...`, `specs/...`, or
similar relative path in this skill, resolve the docs root for the current repo:

1. Find the nearest `.docs-hub/metadata.json` walking up from your current dir.
2. Parse it. Note `mode`, `project`, `hub_path`.
3. Compute docs root:
   - `mode == "in-repo"` → docs-root = `<code-repo>/.docs-hub/`
   - `mode == "external"` → docs-root = `<hub_path>/projects/<project>/.docs-hub/`
4. Treat `specs/<feature>/` references as `<docs-root>/specs/<feature>/`.
5. Suggest commits, never auto-execute.

---

## What this skill does

Reads spec + plan, then generates `tasks.md` — a checklist of concrete tasks
needed to implement the feature, grouped by user story and execution phase.

## When to invoke

After `/plan` has produced `plan.md`. Before `/implement` can run anything.

## Workflow

1. **Identify the target feature**. Find the spec + plan files at
   `<docs-root>/specs/<NNN>-<name>/{spec,plan}.md`.

2. **Read** both files, plus the constitution.

3. **Group tasks by user story**. Each user story from the spec gets its own
   phase. Within each story, tasks are ordered by dependency.

4. **Determine parallelizability**. Mark tasks that can run in parallel with
   `[P]`. Mark tasks that block others with their dependency.

5. **Add a Phase 1 (Setup)** for cross-cutting infrastructure shared by
   multiple stories: project scaffolding, schema migrations, base utilities.

6. **Add a Phase 2 (Foundational)** for blocking prerequisites: auth, core
   data model, shared types.

7. **Add a final Phase N (Polish)** for cross-cutting concerns added at the
   end: docs updates, observability instrumentation, performance tuning, tests
   for cross-cutting paths.

8. **Write `<docs-root>/specs/<NNN>-<name>/tasks.md`** using the template below.

9. **Suggest the commit**:
   ```bash
   # mode=external example:
   git -C <hub_path> add projects/<project>/.docs-hub/specs/<NNN>-<name>/tasks.md
   git -C <hub_path> commit -m "tasks: <NNN>-<name> for <project>"
   ```

## Task format

Each task is a checklist item:

```
- [ ] [ID] [P?] [Story] Description (file: src/path/to/file)
```

- **ID**: T-001, T-002, etc. (sequential, zero-padded to 3)
- **P?**: Optional `[P]` flag if this task can run in parallel with others
- **Story**: `[US1]`, `[US2]`, `[SETUP]`, `[FOUNDATIONAL]`, `[POLISH]` — which phase/story this belongs to
- **Description**: imperative, single-purpose ("Add /search endpoint with JWT auth")
- **(file: ...)**: which file(s) the task primarily touches

## Tasks template

```markdown
# <Feature Name> — Tasks

**Feature**: <NNN>-<name>
**Spec**: ./spec.md
**Plan**: ./plan.md
**Status**: Generated <ISO date>

## Format

- [ ] [ID] [P?] [Story] Description (file: ...)

## Phase 1: Setup (shared infrastructure)

- [ ] T-001 [SETUP] Scaffold src/<area>/ module dir (file: src/<area>/index.ts)
- [ ] T-002 [SETUP] Add schema migration for <table> (file: migrations/NNN-<name>.sql)

## Phase 2: Foundational (blocking prerequisites)

- [ ] T-003 [P] [FOUNDATIONAL] Define <Type> interface (file: src/<area>/types.ts)
- [ ] T-004 [FOUNDATIONAL] Implement <core function> (file: src/<area>/core.ts) — depends on T-003

## Phase 3: User Story 1 — <title> (Priority: P1) 🎯 MVP

### Tests for US1 (optional — only if user requested TDD)

- [ ] T-005 [P] [US1] Test: <test name> (file: tests/<area>/us1.test.ts)

### Implementation for US1

- [ ] T-006 [US1] Implement <endpoint/feature> (file: src/<area>/handler.ts)
- [ ] T-007 [US1] Wire up <integration> (file: src/<area>/integration.ts)

## Phase 4: User Story 2 — <title> (Priority: P2)

### Tests for US2

- [ ] T-008 [P] [US2] Test: <name>

### Implementation for US2

- [ ] T-009 [US2] ...

## Phase N: Polish & cross-cutting

- [ ] T-XYZ [POLISH] Add observability for <flow> (file: src/<area>/metrics.ts)
- [ ] T-XYZ [POLISH] Update <docs-root>/README.md with feature usage

## Dependencies & execution order

### Phase dependencies
- Phase 1 must complete before Phase 2.
- Phase 2 must complete before any Phase 3+ work.
- User stories (Phases 3+) can be done in priority order OR in parallel if their stories don't share files.

### Parallel opportunities
- All `[P]` tasks within a phase can run in parallel.
- US1 tests + US2 tests can run in parallel if they don't share fixtures.

## Implementation strategy

- **MVP first**: ship US1 (Phase 3) to validate the design, then iterate to US2/US3.
- **Incremental delivery**: each user story is independently shippable.

## Notes

- <Anything implementation-relevant that doesn't fit elsewhere.>
```

## Quality bar

A good tasks.md:
- Each task is 1-4 hours of work — bigger means it needs decomposition
- Each task names the primary file(s) it touches — easier to spot collisions
- `[P]` flags are real — independent tasks, no shared file collisions
- Phases are sequential; parallelism is within-phase
- User-story groupings let users ship MVP without implementing everything
