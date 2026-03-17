import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import type { AgentDiscoverer, AgentSession } from "../types.js";

export const claudeCode: AgentDiscoverer = {
  name: "claude-code",

  async discover(project: string): Promise<AgentSession | null> {
    // Claude Code stores sessions in ~/.claude/projects/<escaped-path>/
    // where the path has / replaced with -
    const escaped = project.replace(/\//g, "-");
    const projectDir = join(homedir(), ".claude", "projects", escaped);

    try {
      const entries = await readdir(projectDir);
      const jsonlFiles = entries.filter((e) => e.endsWith(".jsonl"));

      if (jsonlFiles.length === 0) return null;

      // Find most recently modified file
      let latest: { name: string; mtime: Date } | null = null;
      for (const file of jsonlFiles) {
        const filePath = join(projectDir, file);
        const s = await stat(filePath);
        if (!latest || s.mtime > latest.mtime) {
          latest = { name: file, mtime: s.mtime };
        }
      }

      if (!latest) return null;

      return {
        agent: "claude-code",
        path: join(projectDir, latest.name),
        format: "jsonl",
        updatedAt: latest.mtime.toISOString(),
        matchedProject: project,
        matchedBy: "directory-name",
      };
    } catch {
      return null;
    }
  },
};
