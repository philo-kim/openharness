import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { AgentDiscoverer, AgentSession } from "../types.js";

export const codex: AgentDiscoverer = {
  name: "codex",

  async discover(project: string): Promise<AgentSession | null> {
    // Codex CLI stores sessions in ~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl
    const sessionsDir = join(homedir(), ".codex", "sessions");

    try {
      const allFiles = await walkJsonl(sessionsDir);

      if (allFiles.length === 0) return null;

      // Sort by mtime descending, check each for project match
      allFiles.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      for (const file of allFiles) {
        const match = await matchesProject(file.path, project);
        if (match) {
          return {
            agent: "codex",
            path: file.path,
            format: "jsonl",
            updatedAt: file.mtime.toISOString(),
            matchedProject: project,
            matchedBy: "workspace-field",
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  },
};

async function walkJsonl(
  dir: string
): Promise<{ path: string; mtime: Date }[]> {
  const results: { path: string; mtime: Date }[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await walkJsonl(fullPath)));
      } else if (entry.name.endsWith(".jsonl")) {
        const s = await stat(fullPath);
        results.push({ path: fullPath, mtime: s.mtime });
      }
    }
  } catch {
    // directory doesn't exist or not readable
  }

  return results;
}

async function matchesProject(
  filePath: string,
  project: string
): Promise<boolean> {
  try {
    const content = await readFile(filePath, "utf-8");
    const firstLine = content.split("\n")[0];
    if (!firstLine) return false;
    const data = JSON.parse(firstLine);
    // Check if workspace or cwd field matches the project
    const workspace = data.workspace || data.cwd || "";
    return workspace === project || workspace.startsWith(project);
  } catch {
    return false;
  }
}
