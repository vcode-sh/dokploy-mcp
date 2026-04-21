# v3 Plan Package

Last updated: 2026-04-21

This folder is the authoritative planning and audit package for the current `v3` execution cycle.

It now reflects the shipped state after closing `phase 0`, `phase 1`, and `phase 2` in code.

## Current State

- package version: `3.0.0`
- generated Dokploy catalog: `524` procedures across `48` tags
- endpoint parity vs the official Dokploy root OpenAPI snapshot: reached
- default public MCP surface: `search`, `execute`
- optional server modes: `raw`, `hybrid`
- transports: `stdio`, `http`
- shipped staged MCP capability families: `resources`, `prompts`, `completions`
- phase 2 verification command: `npm run test:phase2:coverage`
- latest measured phase 2 slice coverage: `92.64%` statements, `83.75%` branches,
  `92.48%` functions, `92.97%` lines

## What Is Done

- Dokploy API catalog parity and generated SDK/runtime artifacts
- token-efficient default Code Mode with `search` and `execute`
- raw and hybrid endpoint-per-tool modes
- hardened Streamable HTTP transport and health endpoint
- compatibility-aware handling for older Dokploy backends
- broad regression, adversarial, integration, and budget coverage
- helper layer for repeated Dokploy workflows
- `phase 0` capability foundation:
  - modular capability registration
  - feature-flagged shipped capability families
  - unchanged default two-tool contract
- `phase 1` resources and resource templates:
  - reusable `dokploy://...` resources
  - bounded and redacted resource payloads
  - resource links surfaced from relevant execute results
- `phase 2` prompts and completions:
  - five guided Dokploy workflow prompts
  - prompt argument completions for common IDs and enums
  - bounded prompt rendering with reusable `dokploy://...` links
  - compatibility-aware fallback messaging for stale or missing IDs

## What Is Not Done

The remaining gaps are no longer about Dokploy endpoint coverage or resources.

They are about later modern MCP phases:

- `sampling`
- `elicitation`
- `tasks`
- registry-native remote packaging and metadata
- modern remote auth discovery and scope-aware HTTP behavior

## Top 3 Priorities

1. Add `phase 3`: `sampling` and `elicitation`.
2. Add `phase 4`: `tasks`.
3. Add `phase 5`: registry metadata, `server.json`, remotes, and modern auth discovery.

## Execution Order

1. `phase 3` and `phase 4`: agentic workflow layer
2. `phase 5`: remote distribution and auth

## Documents

- [deep-audit.md](./deep-audit.md): current repo strengths, shipped capability coverage, and the
  remaining strategic gaps
- [capability-comparison.md](./capability-comparison.md): this repo vs the official Dokploy MCP and
  vs the current modern MCP target state
- [endpoint-gap.md](./endpoint-gap.md): why Dokploy endpoint parity and resources are no longer the
  bottleneck
- [live-verification.md](./live-verification.md): backend version-skew evidence that must still
  shape the implementation
- [task-matrix.md](./task-matrix.md): done vs next vs later workstreams
- [execution-plan.md](./execution-plan.md): implementation plan with shipped phase status and the
  remaining phases
- [phase-2-verification.md](./phase-2-verification.md): acceptance evidence, coverage command, and
  the verification matrix for the shipped prompt/completion surface

## Planning Rule

Do not reopen `phase 0` or `phase 1` scope unless a real regression is found.

The next cycle starts at `phase 3`: the agentic workflow and remote capability layers.
