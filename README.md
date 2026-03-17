# OpenHarness

AI 코딩 에이전트의 최근 세션 파일을 찾아 서로 참조하게 해주는 로컬 MCP 서버.

전용 하네스 없이 하네스처럼 동작한다. 기존 도구 환경을 그대로 유지하면서, 에이전트 간 세션을 연결하는 디스커버리 레이어.

## Supported Agents (MVP)

| Agent | Session Path | Format |
|-------|-------------|--------|
| Claude Code | `~/.claude/projects/` | JSONL |
| Codex CLI | `~/.codex/sessions/` | JSONL |
| Gemini CLI | `~/.gemini/tmp/<hash>/chats/` | JSON |

## Prerequisites

- Each agent must be able to **read local files directly**.
- OpenHarness only provides paths and metadata — it does not transform, relay, or store session content.

## Install

```bash
npx @freebird-ai/openharness init
```

This registers OpenHarness as an MCP server in each agent's config.

## MCP Tools

### `get_agent_sessions`

Returns recent session paths for all agents, filtered by project.

**Input:**
```json
{ "project": "/Users/me/my-app" }
```

**Output:**
```json
[
  {
    "agent": "claude-code",
    "path": "/Users/me/.claude/projects/-Users-me-my-app/session.jsonl",
    "format": "jsonl",
    "updatedAt": "2026-03-17T14:32:00Z",
    "matchedProject": "/Users/me/my-app",
    "matchedBy": "directory-name"
  }
]
```

### `get_agent_session`

Returns the recent session path for a specific agent.

**Input:**
```json
{ "agent": "claude-code", "project": "/Users/me/my-app" }
```

**Output:**
```json
{
  "agent": "claude-code",
  "path": "/Users/me/.claude/projects/-Users-me-my-app/session.jsonl",
  "format": "jsonl",
  "updatedAt": "2026-03-17T14:32:00Z",
  "matchedProject": "/Users/me/my-app",
  "matchedBy": "directory-name"
}
```

Returns `null` if no session is found.

## Project Matching

| Agent | Strategy |
|-------|----------|
| Claude Code | Project path escaped with `-` as directory name |
| Codex CLI | Workspace field inside session JSONL |
| Gemini CLI | Project path hash matching `tmp/<hash>/` |

## How It Works

```
User → Codex: "Review what Claude Code worked on recently"

Codex → OpenHarness MCP: get_agent_session({ agent: "claude-code", project: "..." })
Codex ← receives session path + metadata
Codex → reads the JSONL file directly and performs review
```

No rules needed in agent instruction files. MCP tool descriptions are enough for agents to use naturally.

## Manual MCP Configuration

If you prefer to configure manually instead of using `init`:

```json
{
  "mcpServers": {
    "openharness": {
      "command": "npx",
      "args": ["openharness"]
    }
  }
}
```

Add this to your agent's MCP config file:

| Agent | Config File |
|-------|------------|
| Claude Code | `~/.claude/mcp.json` or project `.mcp.json` |
| Codex CLI | project `.codex/` |
| Gemini CLI | `~/.gemini/settings.json` |

## License

MIT
