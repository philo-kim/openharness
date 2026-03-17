import { claudeCode } from "./claude-code.js";
import { codex } from "./codex.js";
import { gemini } from "./gemini.js";
import type { AgentDiscoverer } from "../types.js";

export const agents: AgentDiscoverer[] = [claudeCode, codex, gemini];
