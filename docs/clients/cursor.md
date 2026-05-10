# Cursor

Cursor reads MCP config from `mcp.json`.

For a personal setup on macOS or Linux, use:

- `~/.cursor/mcp.json`

## Config

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

Restart Cursor after saving the file.

## First Prompt

```text
Use dokploy-mcp to list my Dokploy projects and show me the one named "my-project".
```

## Notes

- Cursor also supports remote MCP over HTTP. If you want that path, read
  [Hosted HTTP](../guides/hosted-http.md).
- For one default target plus named profile targets, add `DOKPLOY_PROFILES_JSON` and read
  [Profiles](../guides/profiles.md).
- Keep the server name short. `dokploy` beats `my-custom-dokploy-server-production-v3-final`.
