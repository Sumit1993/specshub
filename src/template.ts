import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { x as extractTar } from "tar";

/**
 * Default template — the canonical docs-hub structure.
 * Can be overridden via DOCS_HUB_TEMPLATE_REPO env var or --template flag.
 */
export const DEFAULT_TEMPLATE_REPO = "Sumit1993/docs-hub-template";
export const DEFAULT_TEMPLATE_REF = "main";

export interface TemplateSource {
  /** e.g. "Sumit1993/docs-hub-template" */
  repo: string;
  /** branch, tag, or commit SHA */
  ref: string;
}

export function resolveTemplate(override?: string): TemplateSource {
  const raw = override ?? process.env.DOCS_HUB_TEMPLATE_REPO ?? DEFAULT_TEMPLATE_REPO;
  // Allow "owner/repo@ref" form
  const [repo, ref] = raw.split("@");
  if (!repo) {
    throw new Error(`Invalid template spec: ${raw}`);
  }
  return { repo, ref: ref ?? DEFAULT_TEMPLATE_REF };
}

/**
 * Download the GitHub tarball for a template repo and extract its contents
 * into `targetDir`. The wrapper directory inside the tarball (e.g.
 * docs-hub-template-main/) is stripped — its CONTENTS end up at targetDir.
 *
 * Used for local-only init (when the user doesn't want to create a GitHub repo).
 */
export async function downloadAndExtractTemplate(
  source: TemplateSource,
  targetDir: string,
): Promise<void> {
  const tarballUrl = `https://codeload.github.com/${source.repo}/tar.gz/${source.ref}`;
  const tmpFile = join(tmpdir(), `docs-hub-template-${Date.now()}.tar.gz`);
  const tmpExtract = join(tmpdir(), `docs-hub-template-extract-${Date.now()}`);

  try {
    // 1. Fetch tarball
    const res = await fetch(tarballUrl);
    if (!res.ok) {
      throw new Error(
        `Failed to download template ${source.repo}@${source.ref}: HTTP ${res.status}`,
      );
    }
    if (!res.body) {
      throw new Error("Response body was empty");
    }
    // Pipe Web ReadableStream → Node writable
    await pipeline(res.body as unknown as NodeJS.ReadableStream, createWriteStream(tmpFile));

    // 2. Extract to tmp
    await mkdir(tmpExtract, { recursive: true });
    await extractTar({ file: tmpFile, cwd: tmpExtract });

    // 3. The tarball contains exactly one top-level dir (<repo>-<ref>/).
    //    Move its contents to targetDir.
    const entries = await readdir(tmpExtract);
    const wrapper = entries[0];
    if (entries.length !== 1 || !wrapper) {
      throw new Error(`Unexpected tarball layout: ${entries.length} top-level entries`);
    }
    const wrapperPath = join(tmpExtract, wrapper);
    await mkdir(targetDir, { recursive: true });

    // Move every child of wrapperPath into targetDir
    const children = await readdir(wrapperPath, { withFileTypes: true });
    for (const child of children) {
      const from = join(wrapperPath, child.name);
      const to = join(targetDir, child.name);
      await rename(from, to);
    }
  } finally {
    // Best-effort cleanup
    await rm(tmpFile, { force: true }).catch(() => {});
    await rm(tmpExtract, { recursive: true, force: true }).catch(() => {});
  }
}
