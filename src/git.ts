import { run, which } from "./shell.js";

/**
 * Get the `origin` remote URL for a git repo. Returns null if not a repo or
 * no origin remote configured.
 */
export async function getRemoteOriginUrl(repoPath: string): Promise<string | null> {
  const result = await run("git", ["-C", repoPath, "remote", "get-url", "origin"]);
  if (result.code !== 0) return null;
  return result.stdout.trim() || null;
}

/**
 * Initialize a new git repo in `path`. No-op if already a repo.
 */
export async function gitInit(path: string): Promise<void> {
  await run("git", ["-C", path, "init", "--quiet"], { throwOnError: true });
}

/**
 * Check whether `gh` CLI is installed.
 */
export async function hasGh(): Promise<boolean> {
  return which("gh");
}

/**
 * Check whether `git` is installed.
 */
export async function hasGit(): Promise<boolean> {
  return which("git");
}

export interface GhCreateOptions {
  /** e.g. "Sumit1993/my-docs-hub" (owner is required). */
  fullName: string;
  /** "Sumit1993/docs-hub-template" — passed to gh's --template flag. */
  template: string;
  visibility: "private" | "public";
  /** Local directory to clone into. */
  cloneTo: string;
}

/**
 * Create a new GitHub repo from a template and clone it locally.
 * Equivalent to: `gh repo create <fullName> --template <template> --(private|public) --clone`
 */
export async function ghCreateFromTemplate(opts: GhCreateOptions): Promise<void> {
  await run(
    "gh",
    [
      "repo",
      "create",
      opts.fullName,
      "--template",
      opts.template,
      `--${opts.visibility}`,
      "--clone",
    ],
    { cwd: opts.cloneTo, throwOnError: true, inherit: true },
  );
}
