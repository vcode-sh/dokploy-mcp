# Docs

Two tools. Real Dokploy work. Far less context-window tax.

This is the map for humans. Start here if the rest of the repo looks like a pile of clever ideas
that met no tour guide.

## Start Here

- [Getting Started](./getting-started.md): the shortest path from "what is this?" to "it works".
- [Cursor](./clients/cursor.md): global `mcp.json`, restart, done.
- [Codex](./clients/codex.md): CLI command and config file path.
- [Claude Code](./clients/claude-code.md): local stdio setup through `claude mcp add`.
- [Claude Desktop](./clients/claude-desktop.md): desktop chat app config, separate from Claude Code.

## Guides

- [Setup Wizard](./guides/setup-wizard.md): interactive and non-interactive setup without folklore.
- [Profiles](./guides/profiles.md): how `default` and named Dokploy targets actually behave.
- [Modes](./guides/modes.md): when to use Code Mode, `raw`, or `hybrid`.
- [Compose](./guides/compose.md): the part people mess up first.
- [Hosted HTTP](./guides/hosted-http.md): when you want the server running over HTTP instead of as a
  local process.
- [Troubleshooting](./guides/troubleshooting.md): common failures, fewer spiritual crises.

## Proof And Reference

- [Live End-To-End Proof](./live-e2e-proof.md): real deployments, real logs, real edge cases.
- [Coverage And Budgets](./coverage.md): current footprint, generated surface, and budget checks.
- [API Reference](./api-dokploy.md): the full generated firehose. Useful when you really mean it.
- [Upstream Alignment](./upstream-alignment.md): how this repo tracks Dokploy without pretending
  upstream drift is a myth.

## What To Read In Order

If you are new:

1. [Getting Started](./getting-started.md)
2. your client page in [clients](./clients)
3. [Setup Wizard](./guides/setup-wizard.md)
4. [Profiles](./guides/profiles.md)
5. [Modes](./guides/modes.md)
6. [Live End-To-End Proof](./live-e2e-proof.md)

If you are about to do Compose work:

1. [Compose](./guides/compose.md)
2. [Troubleshooting](./guides/troubleshooting.md)

If you are publishing or reviewing the package:

1. [Live End-To-End Proof](./live-e2e-proof.md)
2. [Coverage And Budgets](./coverage.md)
3. [Upstream Alignment](./upstream-alignment.md)
