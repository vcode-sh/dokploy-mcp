# Modes

The default mode is the point.

Most people should stay there.

## Code Mode

Default public tools:

- `search`
- `execute`

Why this exists:

- smaller `tools/list`
- less schema spam in context
- better fit for multi-step Dokploy work

Use it when you want the agent to:

- discover procedures
- write the workflow
- run the workflow

That is the normal path.

## Raw Mode

Raw mode exposes one MCP tool per generated Dokploy procedure.

Use it when you:

- explicitly want endpoint-per-tool MCP
- are debugging a single procedure in isolation
- need a client that behaves better with flat tool lists than with search plus execute

## Hybrid Mode

Hybrid gives you:

- Code Mode
- plus selected raw tools

Use it when you want the compact default surface but still need a few explicit raw endpoints.

## Sandbox Runtimes

`DOKPLOY_MCP_SANDBOX_RUNTIME=subprocess` is the default. Generated code runs in a child process with
an empty env, worker memory cap, and process termination on timeout.

`DOKPLOY_MCP_SANDBOX_RUNTIME=local` runs generated code in the main process. It is for dev/test only,
prints a warning when used, and is refused by `serve-http`.

Local mode cannot hard-kill CPU-bound async continuations after timeout. Use subprocess for
production.

## How To Switch

Use:

- `DOKPLOY_MCP_MODE=codemode`
- `DOKPLOY_MCP_MODE=raw`
- `DOKPLOY_MCP_MODE=hybrid`

Optionally filter raw or hybrid mode with:

- `DOKPLOY_ENABLED_TAGS=project,application`

## Recommendation

Start with Code Mode.

Only switch to raw or hybrid when you can describe exactly why the default path is getting in your
way.
