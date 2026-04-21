# HTTP Module

This folder contains the internal implementation behind
[src/http-server.ts](../http-server.ts).

Design rules:

- `src/http-server.ts` remains the public facade and keeps the exported API stable
- files here are internal implementation details
- behavior changes must be verified against `tests/http-server.test.ts`

Structure:

- `types.ts`: shared HTTP transport and session types
- `options.ts`: option resolution and health payload helpers
- `responses.ts`: JSON and JSON-RPC response helpers
- `security.ts`: remote header auth, origin validation, and CORS helpers
- `sessions.ts`: session registry and session lifecycle helpers
- `request-handler.ts`: `/mcp` and `/health` request routing and session-aware handling
