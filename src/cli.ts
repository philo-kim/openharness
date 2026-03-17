#!/usr/bin/env node

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const MCP_CONFIG = {
  command: "npx",
  args: ["openharness"],
};

interface McpSettings {
  mcpServers?: Record<string, { command: string; args: string[] }>;
  [key: string]: unknown;
}

const AGENT_CONFIGS: Array<{
  name: string;
  path: string;
  format: "json" | "toml";
  key: string;
}> = [
  {
    name: "Claude Code",
    path: join(homedir(), ".claude", "mcp.json"),
    format: "json",
    key: "mcpServers",
  },
  {
    name: "Gemini CLI",
    path: join(homedir(), ".gemini", "settings.json"),
    format: "json",
    key: "mcpServers",
  },
  {
    name: "Amazon Q Developer",
    path: join(homedir(), ".aws", "amazonq", "mcp.json"),
    format: "json",
    key: "mcpServers",
  },
];

async function readJsonSafe(path: string): Promise<McpSettings> {
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function init() {
  console.log("OpenHarness - Initializing MCP configuration\n");

  for (const config of AGENT_CONFIGS) {
    try {
      const data = await readJsonSafe(config.path);

      if (!data[config.key]) {
        data[config.key] = {};
      }

      const servers = data[config.key] as Record<string, unknown>;

      if (servers["openharness"]) {
        console.log(`  ✓ ${config.name} - already configured`);
        continue;
      }

      servers["openharness"] = MCP_CONFIG;

      const dir = config.path.substring(0, config.path.lastIndexOf("/"));
      await mkdir(dir, { recursive: true });
      await writeFile(config.path, JSON.stringify(data, null, 2) + "\n");

      console.log(`  ✓ ${config.name} - configured (${config.path})`);
    } catch (err) {
      console.log(
        `  ✗ ${config.name} - failed (${err instanceof Error ? err.message : err})`
      );
    }
  }

  console.log("\nDone. Restart your agents to pick up the new MCP server.");
}

const command = process.argv[2];

if (command === "init") {
  init().catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
} else {
  // Default: run as MCP server
  import("./index.js");
}
