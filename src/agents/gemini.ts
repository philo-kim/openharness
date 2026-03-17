import { readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { homedir } from "node:os";
import type { AgentDiscoverer, AgentSession } from "../types.js";

export const gemini: AgentDiscoverer = {
  name: "gemini",

  async discover(project: string): Promise<AgentSession | null> {
    // Gemini CLI stores sessions in ~/.gemini/tmp/<project-hash>/chats/
    // Try multiple hash strategies since the exact algorithm may vary
    const hashes = [
      createHash("sha256").update(project).digest("hex").slice(0, 16),
      createHash("md5").update(project).digest("hex").slice(0, 16),
      createHash("sha256").update(project).digest("hex"),
      createHash("md5").update(project).digest("hex"),
    ];

    const tmpDir = join(homedir(), ".gemini", "tmp");

    // Also try to find by scanning all directories and checking for a match
    for (const hash of hashes) {
      const result = await tryChatsDir(join(tmpDir, hash, "chats"), project);
      if (result) return result;
    }

    // Fallback: scan all tmp subdirectories for a chats folder with recent files
    try {
      const entries = await readdir(tmpDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const result = await tryChatsDir(
          join(tmpDir, entry.name, "chats"),
          project
        );
        if (result) return result;
      }
    } catch {
      // tmp dir doesn't exist
    }

    return null;
  },
};

async function tryChatsDir(
  chatsDir: string,
  project: string
): Promise<AgentSession | null> {
  try {
    const entries = await readdir(chatsDir);
    const jsonFiles = entries.filter((e) => e.endsWith(".json"));

    if (jsonFiles.length === 0) return null;

    let latest: { name: string; mtime: Date } | null = null;
    for (const file of jsonFiles) {
      const filePath = join(chatsDir, file);
      const s = await stat(filePath);
      if (!latest || s.mtime > latest.mtime) {
        latest = { name: file, mtime: s.mtime };
      }
    }

    if (!latest) return null;

    return {
      agent: "gemini",
      path: join(chatsDir, latest.name),
      format: "json",
      updatedAt: latest.mtime.toISOString(),
      matchedProject: project,
      matchedBy: "project-hash",
    };
  } catch {
    return null;
  }
}
