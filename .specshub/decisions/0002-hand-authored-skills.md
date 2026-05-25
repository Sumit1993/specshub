# ADR 0002: Hand-authored SKILL.md files; no scheduled sync from spec-kit

- **Date**: 2026-05-25
- **Status**: Accepted (v0.0.1)

## Context

To ship SDD lifecycle support (constitution / specify / clarify / plan / tasks
/ analyze / implement) without re-deriving the prompts from scratch, v0.0.1
adopts the *workflow conventions* from [github/spec-kit](https://github.com/github/spec-kit)
(MIT licensed). The grilling session considered four approaches:

- **Quarterly sync via vendored snapshot** — pin a `vendor/spec-kit/` directory
  at a known commit, apply mechanical path-substitution patches at sync time,
  re-vendor every quarter via a build pipeline.
- **Runtime fetch** — fetch spec-kit's prompts at user `setup` time.
- **Build-time substitution** — sed-style patches at vendor time, multiple
  patched variants per command.
- **Hand-authored, no sync** — adopt spec-kit's *patterns and structure* once,
  commit the result as SKILL.md files we own, no upstream tracking obligation.

The final pick was the last option.

## Decision

**Each `plugin/skills/<name>/SKILL.md` is hand-authored once and committed.**
There is no `vendor/spec-kit/` directory, no build pipeline, no sync schedule,
no "re-pull from upstream" obligation.

The skill files draw on spec-kit's workflow conventions (their lifecycle, their
template structures, their phase semantics) as inspiration. We add our own
path-resolution prologue (mode-aware: in-repo / external / hybrid) and
specshub-specific commit-hygiene rules. Attribution lives in
[`ATTRIBUTION.md`](../../ATTRIBUTION.md), in a credit line in
[`README.md`](../../README.md), and in an HTML comment inside each affected
SKILL.md.

## Why

1. **Less infrastructure.** No build pipeline. No vendor directory. No sync
   schedule. The skills are just files we edit when we want to change them.
   The git history of those files IS the audit trail.

2. **We own the words.** The skills carry our voice, our examples, and our
   specshub-specific guidance. Spec-kit's prompts are great but they assume
   spec-kit's directory layout; we have a different one. Hand-authoring lets
   us write to our shape natively rather than patching theirs.

3. **No upstream tracking obligation.** If spec-kit ships an improvement we'd
   want to take, we can adopt it on our own schedule. No quarterly ritual
   that costs maintenance time regardless of whether the upstream actually
   changed anything worth taking.

4. **Spec-kit's prompts at the moment of adoption are battle-tested.** The
   bar we're meeting ("SDD lifecycle that works") doesn't need to be a
   moving target. We captured the patterns once at a known-good baseline.

5. **Simpler attribution.** A small handful of files with a clear inline
   credit comment, plus ATTRIBUTION.md, vs. an entire vendored directory tree
   we'd have to maintain copyright headers on.

## Consequences

- **Maintenance is per-file.** If we want to improve a skill (or take an
  upstream improvement), we edit the SKILL.md directly. Standard PR review.
- **No automatic upstream patches.** If spec-kit fixes a bug in their
  `/clarify` flow, we don't get the fix automatically. Mitigation: spec-kit
  changes have a tracker we can subscribe to manually; substantive issues
  surface in their issue tracker which we can monitor.
- **Skill bodies may drift in style from upstream over time.** Acceptable —
  the lifecycle is the contract; the exact wording isn't load-bearing.
- **Cleaner repo structure.** No `vendor/` tree, no build-time wrapping,
  no two-tier "source vs built" artifacts. What you see in `plugin/skills/`
  is what gets installed.

## Concrete shape

```
specshub/
├── plugin/
│   ├── plugin.json
│   └── skills/
│       ├── specshub/SKILL.md              # awareness skill (sections A-E)
│       ├── constitution/SKILL.md
│       ├── specify/SKILL.md
│       ├── clarify/SKILL.md
│       ├── plan/SKILL.md
│       ├── tasks/SKILL.md
│       ├── analyze/SKILL.md
│       └── implement/SKILL.md
└── ATTRIBUTION.md                         # spec-kit + vercel-labs credit
```

Each SDD skill body starts with the same "Path resolution (added by specshub)"
prologue — the only "templated" piece. If a future upstream improvement is
worth taking, we update each affected SKILL.md manually; that's a 10-minute
operation, not an automated pipeline.

## Alternatives considered (and rejected)

1. **Quarterly sync from spec-kit** (vendor + build pipeline). Rejected:
   maintenance cost of a sync ritual is real regardless of whether upstream
   actually moved. Hand-authored cost is lower over time.
2. **Build-time substitution**: per-mode patched variants. Rejected: runtime
   resolution (the path-resolution prologue inside each SKILL.md) handles all
   modes from one file.
3. **Direct runtime fetch from spec-kit**: rejected on the offline-friendliness
   + reproducibility argument.

## References

- [ARCHITECTURE.md](../ARCHITECTURE.md) — comprehensive design
- [ADR 0001](./0001-no-symlinks.md) — same architecture wave
- spec-kit: https://github.com/github/spec-kit (MIT)
