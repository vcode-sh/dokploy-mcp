# Claude Desktop

This page is for the chat app config, not Claude Code.

If you want Claude Code, use [Claude Code](./claude-code.md) instead.

## Config

Add the server to your Claude Desktop MCP config:

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

Then restart Claude Desktop.

## Important

Claude Desktop MCP config is separate from Claude Code MCP config.

If you configure one and the other still looks confused, that is not a ghost. That is two products.

## First Prompt

```text
Use dokploy-mcp to find project "my-project" and summarize its current state.
```
