# Codex

Codex supports MCP in the CLI and the app. The configuration is shared, so you do this once and
move on with your life.

## Add It From The CLI

```bash
codex mcp add dokploy \
  --env DOKPLOY_URL=https://panel.example.com \
  --env DOKPLOY_API_KEY=dokp_... \
  -- npx @vibetools/dokploy-mcp
```

Check that it stuck:

```bash
codex mcp list
```

## Config File

Codex also reads MCP config from:

- `~/.codex/config.toml`

Equivalent example:

```toml
[mcp_servers.dokploy]
command = "npx"
args = ["@vibetools/dokploy-mcp"]

[mcp_servers.dokploy.env]
DOKPLOY_URL = "https://panel.example.com"
DOKPLOY_API_KEY = "dokp_..."
```

## First Prompt

```text
Use dokploy-mcp to find project "my-project" and summarize what is running there.
```

## Notes

- If you want hosted MCP instead of a local stdio process, read [Hosted HTTP](../guides/hosted-http.md).
- If Codex is already using local Dokploy credentials through config or CLI auth, you may not need
  the env block.
- If you want one default Dokploy target plus named extras, use `DOKPLOY_PROFILES_JSON` and read
  [Profiles](../guides/profiles.md). The default target stays the default target. Miracles do happen.
