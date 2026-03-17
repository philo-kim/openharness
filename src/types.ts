export interface AgentSession {
  agent: string;
  path: string;
  format: "json" | "jsonl";
  updatedAt: string;
  matchedProject: string;
  matchedBy: string;
}

export interface AgentDiscoverer {
  name: string;
  discover(project: string): Promise<AgentSession | null>;
}
