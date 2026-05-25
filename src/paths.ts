import { access, readFile, stat } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

// ─── path constants ──────────────────────────────────────────────────────
export const META_DIR = ".docs-hub";
export const META_FILE = "metadata.json";
export const PROJECTS_DIR = "projects";
export const CROSS_REFS_DIR = "cross-refs";
export const ARCHIVE_DIR = "archive";
export const AGENTS_FILE = "AGENTS.md";
export const CLAUDE_FILE = "CLAUDE.md";
export const GITIGNORE_FILE = ".gitignore";

// ─── schema ──────────────────────────────────────────────────────────────
export const METADATA_SCHEMA = "docs-hub.v1";

/**
 * Code-repo-side metadata. Lives at `<code-repo>/.docs-hub/metadata.json`.
 *
 * Two modes:
 *   - "in-repo":  docs live at `<code-repo>/.docs-hub/`. hub_path/hub_repo are null.
 *                 Hybrid mode = in-repo + non-empty hub_refs[].
 *   - "external": docs live at `<hub_path>/projects/<project>/.docs-hub/`.
 *                 hub_path/hub_repo are populated.
 */
export interface DocsHubMetadata {
  schema: string;
  mode: "in-repo" | "external";
  project: string;
  hub_path: string | null;
  hub_repo: string | null;
  hub_refs: HubRef[];
  linked_at: string;
}

/**
 * One entry in `hub_refs[]`. Used in hybrid mode (mode=in-repo + this code repo
 * is also registered with one or more external hubs for cross-cutting context).
 */
export interface HubRef {
  hub_path: string;
  hub_repo: string;
  /** Project name as registered in that hub (may differ from code-repo's own project). */
  project: string;
}

/**
 * Hub-side metadata. Lives at `<hub>/metadata.json` (AT THE ROOT, not nested
 * under .docs-hub/, because the hub repo is entirely docs — no segregation
 * namespace needed). The registry of all projects this hub knows about.
 */
export interface HubMetadata {
  schema: string;
  name: string;
  created_at: string;
  projects: HubProject[];
}

export interface HubProject {
  name: string;
  /**
   * "hub-owned" — docs live at `<hub>/projects/<name>/.docs-hub/` (the hub has
   * the actual files). Used when the code repo was linked via the scenario-2
   * external-only flow (no in-repo docs at link time).
   *
   * "in-repo" — docs live at `<code_repo_path>/.docs-hub/` (the code repo owns
   * the files; the hub just registers awareness). Used in hybrid mode.
   */
  storage: "hub-owned" | "in-repo";
  code_repo_path: string;
  code_repo_url: string;
}

// ─── path helpers ────────────────────────────────────────────────────────

/** Code repo's metadata file. */
export function metadataPath(codeRepo: string): string {
  return join(codeRepo, META_DIR, META_FILE);
}

/**
 * Code repo's docs root — where SDD artifacts (constitution, specs/, decisions/)
 * land when mode=in-repo or mode=in-repo+hub_refs (hybrid).
 */
export function codeRepoDocsRoot(codeRepo: string): string {
  return join(codeRepo, META_DIR);
}

/** Hub's top-level metadata file. */
export function hubMetadataPath(hubRoot: string): string {
  return join(hubRoot, META_FILE);
}

/** Hub-owned project's directory (no `.docs-hub/` nesting at THIS level). */
export function hubProjectPath(hubRoot: string, projectName: string): string {
  return join(hubRoot, PROJECTS_DIR, projectName);
}

/**
 * Hub-owned project's docs root — where SDD artifacts land for hub-owned
 * projects. The `.docs-hub/` nesting here keeps the structure inside the
 * docs root symmetric with the code-repo-side `.docs-hub/`.
 */
export function hubProjectDocsRoot(hubRoot: string, projectName: string): string {
  return join(hubProjectPath(hubRoot, projectName), META_DIR);
}

// ─── reading ─────────────────────────────────────────────────────────────

/**
 * Read and parse a code repo's docs-hub metadata file, if present.
 * Returns null if the file doesn't exist. Throws if the schema is unknown.
 */
export async function readMetadata(codeRepo: string): Promise<DocsHubMetadata | null> {
  const path = metadataPath(codeRepo);
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const schema = String(parsed.schema ?? "");
  if (schema !== METADATA_SCHEMA) {
    throw new Error(
      `Unknown docs-hub metadata schema at ${path}: ${schema || "(missing)"}. ` +
        `Expected ${METADATA_SCHEMA}. Delete the file and run \`docs-hub init\` or \`docs-hub link\` to recreate.`,
    );
  }
  return parsed as unknown as DocsHubMetadata;
}

/**
 * Read and parse a hub's top-level metadata.json. Returns null if absent.
 */
export async function readHubMetadata(hubRoot: string): Promise<HubMetadata | null> {
  const path = hubMetadataPath(hubRoot);
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return parsed as unknown as HubMetadata;
}

// ─── structural checks ──────────────────────────────────────────────────

/**
 * True iff `path` looks like a docs-hub root — has the structural directories
 * we expect (projects/ + cross-refs/).
 */
export async function looksLikeHub(path: string): Promise<boolean> {
  for (const required of [PROJECTS_DIR, CROSS_REFS_DIR]) {
    try {
      const s = await stat(join(path, required));
      if (!s.isDirectory()) return false;
    } catch {
      return false;
    }
  }
  return true;
}

/** Resolve a path (relative → absolute relative to cwd). */
export function absolutePath(p: string): string {
  return isAbsolute(p) ? p : resolve(process.cwd(), p);
}

/** True iff a file/dir exists at `path`. */
export async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
