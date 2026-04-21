# Getting Started

You need two things:

- your Dokploy panel URL
- your Dokploy API key

That is the whole ritual.

Get the key from **Dokploy Settings > Profile > API/CLI**.

## Fastest Setup

Most desktop MCP clients use the same JSON shape:

```json
{
  "mcpServers": {
    "dokploy": {
      "command": "npx",
      "args": ["@vibetools/dokploy-mcp"],
      "env": {
        "DOKPLOY_URL": "https://panel.example.com",
        "DOKPLOY_API_KEY": "dokp_..."
      }
    }
  }
}
```

If your client wants a different file format, the payload is still the same:

- command: `npx`
- args: `["@vibetools/dokploy-mcp"]`
- env: `DOKPLOY_URL`, `DOKPLOY_API_KEY`

Already authenticated with the Dokploy CLI or the local `dokploy-mcp` config file?

You can usually skip the env block and let the resolver do the boring part.

## Pick Your Client

- [Cursor](./clients/cursor.md)
- [Codex](./clients/codex.md)
- [Claude Code](./clients/claude-code.md)
- [Claude Desktop](./clients/claude-desktop.md)

## First Sanity Check

Once the server is connected, ask your agent something small before you try to orchestrate the moon:

```text
Find my Dokploy project named "my-project" and summarize its current applications.
```

Then try a slightly more useful one:

```text
Use dokploy-mcp to create a disposable app from nginx:alpine, deploy it, and show me the logs.
```

If that works, you are not fighting config anymore. You are fighting reality, which is more honest.

## What This Server Actually Gives You

Default public surface:

- `search`
- `execute`

That is intentional.

Instead of flooding the model with hundreds of tool schemas up front, the server keeps the public
surface tiny and lets the agent discover procedures when it needs them.

If you want the longer explanation, read [Modes](./guides/modes.md).
