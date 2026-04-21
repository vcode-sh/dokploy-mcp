# Claude Code

Claude Code has its own MCP setup. It is not the same thing as the old Claude Desktop chat app
config.

## Add The Server

```bash
claude mcp add --transport stdio \
  -e DOKPLOY_URL=https://panel.example.com \
  -e DOKPLOY_API_KEY=dokp_... \
  dokploy -- npx @vibetools/dokploy-mcp
```

Check what Claude Code sees:

```bash
claude mcp list
```

Inside Claude Code, `/mcp` also shows current MCP status.

## First Prompt

```text
Use dokploy-mcp to inspect my Dokploy project and tell me what is currently deployed.
```

## Notes

- Claude Code supports local stdio and remote HTTP MCP servers. For remote usage, read
  [Hosted HTTP](../guides/hosted-http.md).
- If the `claude` executable is not in your `PATH`, fix that first. There is only so much dignity a
  config file can preserve.
