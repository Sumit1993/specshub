---
name: constitution
description: |
  Create or update the project's constitution — the governing principles that
  guide every spec, plan, and implementation decision in this project. Writes
  to the docs-hub-managed constitution at the appropriate path based on the
  repo's docs-hub mode. Adapted from github/spec-kit (MIT) — see ATTRIBUTION.md.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
disable-model-invocation: true
---

<!-- Adapted from github/spec-kit (/constitution command), MIT licensed. See ATTRIBUTION.md. -->

# /constitution — establish or amend the project's governing principles

## Path resolution (added by docs-hub)

Before reading or writing any file referenced as `.specify/...`, `specs/...`, or
similar relative path in this skill, resolve the docs root for the current repo:

1. Find the nearest `.docs-hub/metadata.json` walking up from your current dir.
   If absent, abort: tell the user to run `docs-hub init` first.
2. Parse it. Note `mode`, `project`, `hub_path`.
3. Compute docs root:
   - If `mode == "in-repo"`: docs-root = `<code-repo>/.docs-hub/`
   - If `mode == "external"`: docs-root = `<hub_path>/projects/<project>/.docs-hub/`
4. Everywhere this skill references `.specify/memory/constitution.md`, treat it
   as `<docs-root>/.specify/memory/constitution.md`.
5. After writing, suggest the commit per the `docs-hub` skill's commit-hygiene
   rules — NEVER auto-execute.

---

## What this skill does

Establishes or updates the project's **constitution** — a small document of
governing principles (code-quality standards, testing discipline, architectural
guardrails, performance budgets, etc.) that all subsequent specs, plans, and
tasks must respect.

## When to invoke

- Starting a new project that doesn't yet have `<docs-root>/.specify/memory/constitution.md`
- Amending existing principles (the user has decided on a new constraint)
- Reviewing the constitution against the current codebase to surface drift

## Workflow

1. **Read the existing constitution** if present at `<docs-root>/.specify/memory/constitution.md`.
   If absent, this is a new constitution — create the file.

2. **Gather the principles**. Use the user's input plus what you can infer from:
   - The project's README and code
   - Existing ADRs in `<docs-root>/decisions/`
   - The hub's `IDENTITY.md` (if hub-level identity is set)

3. **Structure the constitution** with these sections:
   - **Project name + version**: e.g., "my-api Constitution v1.0.0"
   - **Ratification date + last-amended date**: ISO dates
   - **Principles**: numbered, each with a description and rationale
   - **Governance**: how amendments happen, who decides, versioning policy

4. **Use semantic versioning** for the constitution itself:
   - MAJOR: backward-incompatible principle removals or redefinitions
   - MINOR: new principles added, materially expanded guidance
   - PATCH: clarifications, wording, typo fixes

5. **Propagation check** (after writing). Read each of:
   - `<docs-root>/.specify/templates/plan-template.md` (if present)
   - `<docs-root>/.specify/templates/spec-template.md` (if present)
   - `<docs-root>/.specify/templates/tasks-template.md` (if present)
   - Ensure no existing template contradicts the updated principles. Flag conflicts.

6. **Suggest the commit** for the docs hub side (per the `docs-hub` skill's rules):
   ```bash
   # If mode=external:
   git -C <hub_path> add projects/<project>/.docs-hub/.specify/memory/constitution.md
   git -C <hub_path> commit -m "constitution: <one-line summary of change>"

   # If mode=in-repo:
   git -C <code-repo> add .docs-hub/.specify/memory/constitution.md
   git -C <code-repo> commit -m "constitution: <one-line summary of change>"
   ```

## Constitution template (minimal)

```markdown
# <Project Name> Constitution

**Version**: <MAJOR>.<MINOR>.<PATCH>
**Ratified**: <YYYY-MM-DD>
**Last amended**: <YYYY-MM-DD>

## Core Principles

### I. <Principle Name>

<Description in 2-4 sentences. State the principle clearly, then state WHY.>

### II. <Principle Name>

<...>

## Governance

- Amendments require: <criteria>
- Version policy: semantic versioning per the rules above
- Compliance review: <when, by whom>
```

## Quality bar

A good constitution:
- Has 3-7 principles (not 1, not 20)
- Each principle is actionable (an agent can check "does this design violate principle II?")
- Each principle has a clear WHY (so future-you can judge edge cases)
- Stays under ~500 lines total
