# Hosted Deploy

Run hosted HTTP when a central MCP server should serve multiple clients. Keep TLS at a reverse
proxy. Do not bake Dokploy credentials into the container.

## Build

```bash
docker build -t dokploy-mcp-http .
docker run --rm -p 8787:3000 dokploy-mcp-http
```

The image binds `DOKPLOY_MCP_HTTP_HOST=0.0.0.0` because containers need a non-loopback listener.
Expose it only behind a proxy.

Health:

```bash
curl -fsS http://localhost:8787/health
```

MCP endpoint smoke:

```bash
curl -sS -i -X POST http://localhost:8787/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Without `X-Dokploy-Url` and `X-Dokploy-Api-Key`, protected MCP requests fail closed. That proves the
endpoint answers without sharing a default identity.

## Compose

```bash
docker compose -f docs/examples/compose.hosted.yml up -d --build
docker compose -f docs/examples/compose.hosted.yml ps
```

The example leaves `DOKPLOY_MCP_HTTP_ALLOW_CONFIG_FALLBACK` unset. Multi-client hosted servers should
use per-request credentials, not local config fallback.

## Client Contract

The MCP registry metadata in `server.json` advertises the hosted remote as:

- URL: `https://{remoteHost}{mcpPath}`
- default path: `/mcp`
- required headers: `X-Dokploy-Url`, `X-Dokploy-Api-Key`

Send the Dokploy panel URL and API key with each request. Do not put them in the image or compose
file.

## Security Posture

- terminate TLS at Caddy, Traefik, or another reverse proxy
- keep `DOKPLOY_MCP_HTTP_ALLOW_CONFIG_FALLBACK` off for shared servers
- set `DOKPLOY_MCP_ALLOWED_ORIGINS` only for browser clients, and prefer explicit origins
- tune `DOKPLOY_MCP_SANDBOX_WORKER_MEMORY_MB` and `DOKPLOY_MCP_SANDBOX_MAX_CONCURRENT` with host
  CPU and memory in mind
- leave `DOKPLOY_MCP_SANDBOX_WORKER_REUSE` unset for hosted or multi-tenant deployments

## Smoke Checklist

1. `curl -fsS http://localhost:8787/health` returns JSON.
2. unauthenticated `/mcp` POST returns a JSON-RPC error, not a network failure.
3. an MCP client can initialize and call `tools/list` with `X-Dokploy-Url` and
   `X-Dokploy-Api-Key`.
4. logs show `Dokploy MCP HTTP server listening at`.
