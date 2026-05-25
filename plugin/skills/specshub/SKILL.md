---
name: specshub
description: |
  Work with specshub artifacts in this repository. Use when you encounter a
  `.specshub/metadata.json` file in the current repo, when you modify any
  file inside `.specshub/`, when you write into a hub's `projects/<name>/`,
  or when the user invokes `/specshub` explicitly. Teaches detection, path
  resolution, read order, commit hygiene, and proactive doc-update suggestions.
allowed-tools: Read, Grep, Glob, Bash
---

# specshub: working with this hub

This skill teaches you (the AI agent) how to operate inside a specshub
repository safely and helpfully. specshub is a per-context AI agent docs
system that supports three deployment modes — in-repo, external, and hybrid.

## A. Detection

Look for `.specshub/metadata.json` in the current dir or walking up to the
nearest git repo root.

- **Absent** → this repo is not specshub-managed. This skill doesn't apply. Skip.
- **Present** → parse it. Note `mode`, `project`, `hub_path`, `hub_repo`, `hub_refs`.

```bash
# Detection idiom:
test -f .specshub/metadata.json && cat .specshub/metadata.json | jq .
```

If you can't run `jq`, use any JSON parser — the structure is documented below.

## B. Path resolution (where do docs actually live?)

Compute the **docs root** based on `mode`:

| `mode` value | Docs root |
|--------------|-----------|
| `in-repo`    | `<code-repo>/.specshub/` |
| `external`   | `<hub_path>/projects/<project>/.specshub/` |

In **hybrid mode** (mode=in-repo with non-empty `hub_refs[]`): docs root is
`<code-repo>/.specshub/` (same as in-repo). Each `hub_ref` is a *cross-cutting*
registration with an external hub — the hub knows about this project and may
reference its in-repo docs from its own `cross-refs/`.

Inside the docs root, the structure is always:

```
<docs-root>/
├── .specify/memory/constitution.md   # principles governing this project
├── specs/<feature-name>/
│   ├── spec.md
│   ├── plan.md
│   ├── tasks.md
│   └── analysis.md
├── decisions/<NNNN>-<slug>.md         # ADRs
└── research/, incidents/, etc.        # optional, project-specific
```

## C. Read order (before non-trivial work)

When the user asks for a substantive task in this repo, read the docs in this
order. Stop reading when you have enough context — don't exhaustively read
everything every time.

### Project-local (always, in this order)

1. `<docs-root>/README.md` — project landing page (if present)
2. `<docs-root>/.specify/memory/constitution.md` — governing principles
3. Most relevant `<docs-root>/specs/<feature>/spec.md` and `plan.md`
4. Recent `<docs-root>/decisions/*.md` — constraints from prior ADRs

### Hub-level (if mode=external OR `hub_refs[]` non-empty)

For each hub (the primary `hub_path` if external, plus each `hub_refs[i].hub_path`):

5. `<hub>/IDENTITY.md` — context-wide identity, mission, voice
6. `<hub>/MAP.md` — project graph
7. `<hub>/cross-refs/*.md` — filter to files mentioning this project's name

You do NOT need to read every file. Use the file picker / `Read` tool on the
ones the task obviously touches.

## D. Commit hygiene (HARD RULE)

**Never run `git add`, `git commit`, or `git push` autonomously.** Always
suggest the commands in your output. The user runs them.

When suggesting a commit, pick the **right repo** based on where the file
physically lives:

| File path | Commits to |
|-----------|------------|
| Anything outside the code repo's `.specshub/` | The code repo |
| Inside code repo's `.specshub/` (in-repo or hybrid) | The code repo |
| Inside hub's `projects/<project>/.specshub/` (hub-owned mode) | The hub repo (use `git -C <hub_path> ...`) |
| Inside hub's `cross-refs/`, `MAP.md`, `IDENTITY.md`, `archive/` | The hub repo |

### Suggesting commits for SDD outputs

When the `/specify`, `/plan`, `/tasks` etc. skills write a spec file, it lands
in whichever `.specshub/` is the docs root for the current repo's mode. After
writing, suggest the commit in chat — clearly stating which repo:

```bash
# example for mode=external, after /specify wrote a spec:
git -C <hub_path> add projects/<project>/.specshub/specs/<feature>/spec.md
git -C <hub_path> commit -m "spec: <feature> for <project>"
git -C <hub_path> push   # if the user wants
```

If the work also touched code in the code repo, suggest that commit separately.

## E. Proactive suggestions (be conservative)

After substantive work, suggest — but don't author unless asked — updates to:

- `<docs-root>/decisions/` if a technical choice was made that future agents should know about. ADR filename convention: `NNNN-kebab-slug.md`.
- `<hub>/MAP.md` if the project's mission, role, or relationships changed.
- `<hub>/cross-refs/<name>.md` if a relationship between projects emerged or shifted.

Phrase the suggestion as:

> "Worth recording? I'd suggest \<create-or-update\> \<path\> capturing: \<2-3 line summary\>"

Then **wait for user direction**. Don't author the file unless they say yes.

## Reference: metadata.json schemas

### Code-repo side (`<code-repo>/.specshub/metadata.json`)

```jsonc
{
  "schema": "specshub.v1",
  "mode": "in-repo",                      // or "external"
  "project": "my-api",
  "hub_path": null,                       // populated when external OR hub_refs not empty
  "hub_repo": null,
  "hub_refs": [],                         // hybrid: [{ hub_path, hub_repo, project }]
  "linked_at": "ISO-8601"
}
```

### Hub side (`<hub>/metadata.json` — at hub root, not nested)

```jsonc
{
  "schema": "specshub.v1",
  "name": "acme-specshub",
  "created_at": "ISO-8601",
  "projects": [
    {
      "name": "my-api",
      "storage": "hub-owned",             // or "in-repo"
      "code_repo_path": "/abs/path/to/code-repo",
      "code_repo_url": "git@github.com:acme/my-api.git"
    }
  ]
}
```

## Common questions

**"Where do I put a new spec?"**

Use the `/specify` skill if it's available — it handles the path resolution
automatically. If invoking by hand, write to `<docs-root>/specs/<NNN>-<slug>/spec.md`
where NNN is the next available sequence number.

**"This repo's hub_path doesn't exist on my machine. What now?"**

The user hasn't cloned the hub here. They need to `git clone <hub_repo>` to the
recorded `hub_path`, OR update the metadata to point at where they have it
locally. Don't try to write into a non-existent hub.

**"There are multiple hub_refs. Which do I prioritize?"**

Read them all when relevant. They're cross-cutting contexts — typically each
covers a different organizational dimension (e.g., one hub for engineering
cross-refs, one for product). Order doesn't matter.
