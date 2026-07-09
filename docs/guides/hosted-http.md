# Hosted HTTP

You do not need hosted HTTP to use this server.

You want it when:

- the MCP server should run somewhere central
- more than one person or client should hit the same server
- you want remote MCP instead of spawning a local stdio process

## Start The Server

```bash
npx @vibetools/dokploy-mcp serve-http
```

For Docker and compose deployment, see [hosted-deploy.md](./hosted-deploy.md).

Defaults:

- MCP path: `/mcp`
- health path: `/health`

Useful env vars:

```bash
DOKPLOY_MCP_HTTP_HOST=127.0.0.1
DOKPLOY_MCP_HTTP_PORT=3000
DOKPLOY_MCP_HTTP_PATH=/mcp
DOKPLOY_MCP_HEALTH_PATH=/health
```

## Remote Auth Contract

Hosted requests must send both headers together:

- `X-Dokploy-Url`
- `X-Dokploy-Api-Key`

If one is missing, the request fails closed.

If both are missing, the hosted server returns `401` unless you explicitly enable local fallback for
single-tenant use.

## Health Endpoint

`/health` returns the active remote auth posture:

- current paths
- allowed origins
- whether local fallback is enabled
- declared remote header names

## Browser Clients

Browser-based hosted clients are rejected by default.

If you really want them:

```bash
DOKPLOY_MCP_ALLOWED_ORIGINS=https://cursor.example.com,https://app.example.com
```

## More Detail

If you want the longer operator reference, see [../remote-http.md](../remote-http.md).
