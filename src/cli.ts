import { Command } from "commander";
import { doctor } from "./commands/doctor.js";
import { type InitMode, type InitVisibility, init } from "./commands/init.js";
import { link, type Storage } from "./commands/link.js";
import { list } from "./commands/list.js";
import { status } from "./commands/status.js";
import { unlink } from "./commands/unlink.js";
import { verify } from "./commands/verify.js";
import { logger } from "./logger.js";

const program = new Command();

program
  .name("specshub")
  .description("Per-context AI agent docs hubs with spec-driven workflow skills")
  .version("0.0.2");

// ─── init ──────────────────────────────────────────────────────────────────
program
  .command("init")
  .description("Initialize specshub for this code repo (in-repo or external hub)")
  .option("--in-repo", "scenario 1: scaffold docs inside this code repo's .specshub/")
  .option("--external", "scenario 2: create a sibling external hub and link this repo as its first project")
  .option("--name <name>", "external mode: hub name (default <repo-name>-specshub)")
  .option("-d, --dir <path>", "external mode: hub directory (default sibling of code repo)")
  .option("--private", "external mode: create as private GitHub repo (requires gh)")
  .option("--public", "external mode: create as public GitHub repo (requires gh)")
  .option("--local", "external mode: skip GitHub — local-only hub")
  .option("--owner <user>", "external mode: GitHub owner (auto-detected via `gh api user`)")
  .option("--project <name>", "project name (default: basename of code repo)")
  .option(
    "--no-suggest",
    "external mode: don't prompt to append `-specshub` to the hub name (e.g. accept `my-team` instead of suggesting `my-team-specshub`)",
  )
  .option("-y, --yes", "non-interactive: use defaults")
  .action(async (opts) => {
    const mode = modeFromOpts(opts);
    const visibility = visibilityFromOpts(opts);
    await init({
      mode,
      name: opts.name,
      dir: opts.dir,
      visibility,
      owner: opts.owner,
      project: opts.project,
      noSuggest: opts.suggest === false,
      yes: opts.yes,
    });
  });

// ─── link ──────────────────────────────────────────────────────────────────
program
  .command("link")
  .description("Link this code repo to an existing hub (auto-detects storage based on .specshub/ content)")
  .argument("<hub-path>", "path to the hub root")
  .option("--project <name>", "project name in the hub (default: basename of code repo)")
  .option(
    "--storage <kind>",
    "override auto-detected storage: 'in-repo' (hybrid; hub references in-repo docs) or 'hub-owned' (hub owns the docs)",
  )
  .option("-y, --yes", "non-interactive: auto-confirm prompts")
  .action(async (hubPath: string, opts: { project?: string; storage?: Storage; yes?: boolean }) => {
    await link(hubPath, {
      project: opts.project,
      storage: opts.storage,
      yes: opts.yes,
    });
  });

// ─── unlink ────────────────────────────────────────────────────────────────
program
  .command("unlink")
  .description("Remove a specshub linkage from this code repo (updates both metadata files)")
  .option("--hub <path>", "specific hub to unlink from (default: primary hub or the only hub_ref)")
  .option("--delete-hub-side", "for hub-owned slots: also delete <hub>/projects/<project>/ dir")
  .option("-y, --yes", "non-interactive: auto-confirm prompts")
  .action(async (opts) => {
    await unlink({ hub: opts.hub, deleteHubSide: opts.deleteHubSide, yes: opts.yes });
  });

// ─── verify ────────────────────────────────────────────────────────────────
program
  .command("verify")
  .description("Sanity-check a hub's structure (and optionally linked code repos)")
  .argument("[code-repos...]", "code repos to verify alongside the hub")
  .option("--hub <path>", "hub root (default: cwd)")
  .action(async (codeRepos: string[], opts) => {
    const result = await verify({ hub: opts.hub, codeRepos });
    if (!result.passed) process.exit(1);
  });

// ─── list ──────────────────────────────────────────────────────────────────
program
  .command("list")
  .description("List the projects in this hub")
  .option("--hub <path>", "hub root (default: cwd)")
  .action(async (opts) => {
    await list({ hub: opts.hub });
  });

// ─── status ────────────────────────────────────────────────────────────────
program
  .command("status")
  .description("Check per-machine link health for one or more code repos")
  .argument("<code-repos...>", "code repos to check")
  .action(async (codeRepos: string[]) => {
    const result = await status({ codeRepos });
    if (!result.passed) process.exit(1);
  });

// ─── doctor ────────────────────────────────────────────────────────────────
program
  .command("doctor")
  .description("Diagnose your environment (Node, git, gh, npx skills, network)")
  .option("--hub <path>", "hub root (default: cwd if it looks like a hub)")
  .action(async (opts) => {
    const result = await doctor({ hub: opts.hub });
    if (!result.passed) process.exit(1);
  });

// Top-level error handling
program.exitOverride();
try {
  await program.parseAsync(process.argv);
} catch (err) {
  const e = err as Error & { code?: string };
  if (e.code === "commander.helpDisplayed" || e.code === "commander.version") process.exit(0);
  if (e.code === "commander.help") process.exit(0);
  // Inquirer raises an ExitPromptError on Ctrl+C — treat as normal exit, not error
  if (e.message?.includes("force closed the prompt") || e.code === "ERR_USE_AFTER_CLOSE") {
    logger.detail("Cancelled.");
    process.exit(130);
  }
  logger.error(e.message);
  process.exit(1);
}

// ─── helpers ───────────────────────────────────────────────────────────────

function modeFromOpts(opts: {
  inRepo?: boolean;
  external?: boolean;
}): InitMode | undefined {
  const picked = [opts.inRepo && "in-repo", opts.external && "external"].filter(Boolean) as InitMode[];
  if (picked.length === 0) return undefined;
  if (picked.length > 1) {
    throw new Error("Pick exactly one of --in-repo or --external");
  }
  return picked[0];
}

function visibilityFromOpts(opts: {
  private?: boolean;
  public?: boolean;
  local?: boolean;
}): InitVisibility | undefined {
  const picked = [opts.private && "private", opts.public && "public", opts.local && "local"].filter(
    Boolean,
  ) as InitVisibility[];
  if (picked.length === 0) return undefined;
  if (picked.length > 1) {
    throw new Error(`Pick exactly one of --private, --public, --local (got: ${picked.join(", ")})`);
  }
  return picked[0];
}

