#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { agents } from "./agents/index.js";
import type { AgentSession } from "./types.js";

const server = new McpServer({
  name: "openharness",
  version: "0.1.0",
});

const VALID_AGENTS = agents.map((a) => a.name);

server.tool(
  "get_agent_sessions",
  `Returns recent session paths for all connected AI coding agents (${VALID_AGENTS.join(", ")}), filtered by the given project directory. Each agent can then read the returned path directly to access the full conversation history.`,
  {
    project: z
      .string()
      .describe(
        "Absolute path to the project directory. Required. Only sessions matching this project are returned."
      ),
  },
  async ({ project }): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
    const results: AgentSession[] = [];

    const discoveries = await Promise.all(
      agents.map((agent) => agent.discover(project))
    );

    for (const session of discoveries) {
      if (session) results.push(session);
    }

    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  }
);

server.tool(
  "get_agent_session",
  `Returns the recent session path for a specific AI coding agent, filtered by the given project directory. The returned path can be read directly to access the full conversation history.`,
  {
    agent: z
      .enum(VALID_AGENTS as [string, ...string[]])
      .describe(`Agent name. One of: ${VALID_AGENTS.join(", ")}`),
    project: z
      .string()
      .describe(
        "Absolute path to the project directory. Required. Only sessions matching this project are returned."
      ),
  },
  async ({ agent, project }): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
    const discoverer = agents.find((a) => a.name === agent);
    if (!discoverer) {
      return {
        content: [{ type: "text", text: "null" }],
      };
    }

    const session = await discoverer.discover(project);

    return {
      content: [
        { type: "text", text: session ? JSON.stringify(session, null, 2) : "null" },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("OpenHarness MCP server error:", err);
  process.exit(1);
});
