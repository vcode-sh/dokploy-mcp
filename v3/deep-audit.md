# Deep Audit

Last updated: 2026-04-21

This audit answers one question:

After closing Dokploy endpoint parity, `phase 0`, and `phase 1`, what is the highest-value next
move for this repository?

## Executive Summary

`v3.0.0` completed the endpoint and hardening agenda.

The repository now also ships the first modern MCP expansion:

- modular capability registration for shipped families
- optional `resources` and `resource templates`
- reusable `dokploy://...` context objects
- execute results that surface resource links when they can be inferred safely

The next strategic gap is no longer "more Dokploy tools" and no longer "basic resources".

The next strategic gap is the remaining modern MCP breadth:

- `prompts`
- `completions`
- `sampling`
- `elicitation`
- `tasks`
- registry-native remote metadata and auth discovery

## Verified Strengths In This Repository

### 1. The Dokploy API surface is no longer the blocker

- generated catalog parity is at `524` procedures and `48` tags
- the repository no longer trails the official Dokploy root OpenAPI snapshot
- remaining API work should be treated as ongoing upstream sync, not unfinished `v3` scope

### 2. Default UX is still better than endpoint-per-tool sprawl

The repository keeps the default public surface to `search` and `execute`, which is still the
right default for agent workflows and token control.

That design remains a strength.

### 3. The repository now has a reusable resource layer

The server is no longer purely tool-only for shipped features.

It now exposes reusable, bounded MCP resources for the main inspection workflows:

- project overview
- project infrastructure
- project logs overview
- application summary
- deployment summary
- server summary

That closes the original `phase 1` token-efficiency gap.

### 4. The repository already has a stronger production posture

Compared to a basic endpoint-per-tool server, this repo already has:

- compatibility-aware version-skew handling
- secret-aware shaping and redaction
- helper procedures for repeated workflows
- hardened HTTP lifecycle coverage
- adversarial subprocess coverage
- protocol budget checks

## Verified Strategic Gaps

### 1. Prompt and completion guidance is still missing

The biggest product gap is no longer resources.

The current shipped server still does not expose:

- prompt templates
- completion providers

That means the server can execute and now reuse bounded context, but it still cannot teach clients
the highest-value Dokploy workflows directly.

### 2. The agentic workflow layer is still not shipped

There is still no shipped layer for:

- `sampling`
- `elicitation`
- `tasks`

That means the server can execute workflows, but it cannot yet guide or sustain them in a
first-class MCP-native way.

### 3. The runtime is not yet registry-native

The CLI and runtime in [`src/index.ts`](../src/index.ts) expose `stdio` and `http`, which is fine,
but the repository still does not present itself as a modern remote MCP product with:

- `server.json`
- registry-ready `remotes`
- modern server metadata
- capability metadata for remote discovery
- scope-aware auth discovery flow

That gap matters because discovery and remote deployment are now part of the product, not just
distribution details.

## Why These Gaps Matter

### Better prompt understanding

Prompt templates and completion providers let the server teach clients how to ask for high-value
Dokploy workflows instead of expecting the user to discover everything via free-form prompts.

### Better agent workflows

`sampling`, `elicitation`, and `tasks` make the server better at multi-step work:

- asking for missing values
- handling long-running operations
- returning progress and cancellation semantics
- coordinating safe deploy and rollback flows

### Better remote adoption

Remote metadata, registry publication, and auth discovery increasingly determine whether a server is
easy to consume in the broader MCP ecosystem.

## Audit Conclusion

The next cycle should not be framed as another endpoint project and should not reopen the resource
phase.

It should be framed as the remaining modern MCP capability expansion project, executed in this
order:

1. `prompts` + `completions`
2. `sampling` + `elicitation` + `tasks`
3. registry-native remote packaging and auth discovery

## Research Inputs

The prioritization above is based on the latest public MCP materials:

- [MCP changelog 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/changelog)
- [MCP changelog 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/changelog)
- [MCP elicitation](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation)
- [MCP tasks](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks)
- [MCP Registry quickstart](https://modelcontextprotocol.io/registry/quickstart)
- [Publishing remote servers](https://modelcontextprotocol.io/registry/remote-servers)
