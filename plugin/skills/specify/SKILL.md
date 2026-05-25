---
name: specify
description: |
  Define what you want to build — author a feature specification with user
  stories, requirements, success criteria. Writes to the docs-hub-managed
  specs/ directory at the appropriate path based on the repo's docs-hub mode.
  Adapted from github/spec-kit (MIT) — see ATTRIBUTION.md.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
disable-model-invocation: true
---

<!-- Adapted from github/spec-kit (/specify command), MIT licensed. See ATTRIBUTION.md. -->

# /specify — author a feature specification

## Path resolution (added by docs-hub)

Before reading or writing any file referenced as `.specify/...`, `specs/...`, or
similar relative path in this skill, resolve the docs root for the current repo:

1. Find the nearest `.docs-hub/metadata.json` walking up from your current dir.
   If absent, abort: tell the user to run `docs-hub init` first.
2. Parse it. Note `mode`, `project`, `hub_path`.
3. Compute docs root:
   - If `mode == "in-repo"`: docs-root = `<code-repo>/.docs-hub/`
   - If `mode == "external"`: docs-root = `<hub_path>/projects/<project>/.docs-hub/`
4. Everywhere this skill references `specs/<feature>/`, treat it as
   `<docs-root>/specs/<feature>/`.
5. After writing, suggest the commit per the `docs-hub` skill's commit-hygiene
   rules — NEVER auto-execute.

---

## What this skill does

Authors a **feature specification** for a piece of work the user wants to build.
A spec is the human-language description of WHAT we're building — distinct from
HOW (which is the `/plan` skill).

## When to invoke

The user types `/specify <description>` to start working on a new feature, or
to fully document an existing one before planning implementation.

## Workflow

1. **Get the feature description** from the user's invocation arguments. If empty,
   ask.

2. **Generate a short feature name** (2-4 words, kebab-case) for the directory name.

3. **Determine the next feature number** by scanning `<docs-root>/specs/` for
   existing `<NNN>-<name>/` directories and picking `NNN+1` (zero-padded to 3 digits).

4. **Create the feature directory**: `<docs-root>/specs/<NNN>-<name>/`.

5. **Author `<docs-root>/specs/<NNN>-<name>/spec.md`** using the template below.
   Read the constitution at `<docs-root>/.specify/memory/constitution.md` first
   if present — the spec must align with its principles.

6. **Suggest the commit** for the docs hub side:
   ```bash
   # mode=external example:
   git -C <hub_path> add projects/<project>/.docs-hub/specs/<NNN>-<name>/
   git -C <hub_path> commit -m "spec: <NNN>-<name> for <project>"
   ```

## Spec template

```markdown
# <Feature Name>

**Feature**: <NNN>-<name>
**Status**: Draft
**Created**: <ISO date>

## Problem statement

<1-3 sentences. What user-facing problem does this solve, or what capability
does it add?>

## User stories

### Story 1 — <short title> (Priority: P1)

> As a <user type>, I want <action> so that <outcome>.

**Acceptance criteria**:
- ...
- ...

### Story 2 — <short title> (Priority: P2)

> As a <user type>, I want <action> so that <outcome>.

**Acceptance criteria**:
- ...

## Functional requirements

- FR-1: <unambiguous, testable statement of what the system must do>
- FR-2: ...

## Non-functional requirements

- Performance: <target>
- Security: <constraints>
- Observability: <what must be logged/metric'd>

## Out of scope

- <Things this feature explicitly does NOT do, to bound the design.>

## Success criteria

- <How we know this is done. Measurable.>
- <How we know it's adopted/used.>

## Open questions

- <Things to clarify before /plan. Use /clarify to resolve these.>

## Assumptions

- <Things being taken as true without verification.>
```

## Quality bar

A good spec:
- Says WHAT, not HOW. Implementation choices belong in `/plan`.
- Has acceptance criteria you can write tests against.
- Lists "out of scope" explicitly — bounds the design.
- Has open questions called out at the bottom so `/clarify` can resolve them.
- References the constitution by principle number where relevant.

## Common mistakes to avoid

- **Conflating spec and plan**: if you find yourself naming libraries or
  algorithms, that belongs in `/plan`. Spec is user-facing.
- **Skipping out-of-scope**: agents over-deliver without it. Be explicit.
- **Vague success criteria**: "users like it" isn't measurable. "p99 latency
  < 300ms for the /search endpoint at 1k req/s" is.
